import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { INITIAL_FEN } from '@shared/game';

const PROMOTION_PIECES: ReadonlySet<string> = new Set(['q', 'r', 'b', 'n']);

export interface MoveDescriptor {
  from: Square;
  to: Square;
  san: string;
  lan: string;
  fen: string;
  captured?: PieceSymbol;
  capturedSquare?: Square;
  promotion?: PieceSymbol;
  isEnPassant: boolean;
  isCastle: boolean;
  isCapture: boolean;
}

export type MoveResult =
  | { ok: true; move: MoveDescriptor }
  | { ok: false; reason: 'invalid-uci' | 'illegal' | 'invalid-promotion' };

export interface ChessManager {
  getFen(): string;
  turn(): 'w' | 'b';
  legalMoves(square?: Square): string[];
  tryMove(uci: string): MoveResult;
  previewMove(uci: string): MoveResult;
  isGameOver(): boolean;
  reset(fen?: string): { ok: true } | { ok: false; reason: string };
}

interface ParsedUci {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

function parseUci(uci: string): ParsedUci | null {
  if (uci.length !== 4 && uci.length !== 5) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  if (uci.length === 4) return { from, to };
  const promo = uci.slice(4, 5);
  if (!PROMOTION_PIECES.has(promo)) return null;
  return { from, to, promotion: promo as PieceSymbol };
}

function enPassantCapturedSquare(to: Square, color: 'w' | 'b'): Square {
  const file = to.charAt(0);
  const rank = Number(to.charAt(1));
  const capturedRank = color === 'w' ? rank - 1 : rank + 1;
  return `${file}${capturedRank}` as Square;
}

function toDescriptor(move: ReturnType<Chess['move']>, fen: string): MoveDescriptor {
  const isEnPassant = move.isEnPassant();
  const capturedSquare = move.captured
    ? isEnPassant
      ? enPassantCapturedSquare(move.to, move.color)
      : move.to
    : undefined;
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    lan: move.lan,
    fen,
    captured: move.captured,
    capturedSquare,
    promotion: move.promotion,
    isEnPassant,
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    isCapture: move.isCapture(),
  };
}

export function createChessManager(initialFen: string = INITIAL_FEN): ChessManager {
  const chess = new Chess(initialFen);

  function legalMoves(square?: Square): string[] {
    const moves = square
      ? chess.moves({ square, verbose: true })
      : chess.moves({ verbose: true });
    return moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
  }

  function tryMove(uci: string): MoveResult {
    const parsed = parseUci(uci);
    if (!parsed) {
      const looksLikePromotion = uci.length === 5;
      return {
        ok: false,
        reason: looksLikePromotion ? 'invalid-promotion' : 'invalid-uci',
      };
    }
    try {
      const move = chess.move(parsed);
      return { ok: true, move: toDescriptor(move, chess.fen()) };
    } catch {
      return { ok: false, reason: 'illegal' };
    }
  }

  function previewMove(uci: string): MoveResult {
    const parsed = parseUci(uci);
    if (!parsed) {
      return {
        ok: false,
        reason: uci.length === 5 ? 'invalid-promotion' : 'invalid-uci',
      };
    }
    const snapshot = chess.fen();
    try {
      const move = chess.move(parsed);
      const result: MoveResult = { ok: true, move: toDescriptor(move, chess.fen()) };
      chess.load(snapshot);
      return result;
    } catch {
      chess.load(snapshot);
      return { ok: false, reason: 'illegal' };
    }
  }

  function reset(fen?: string): { ok: true } | { ok: false; reason: string } {
    try {
      chess.load(fen ?? INITIAL_FEN);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'invalid-fen' };
    }
  }

  return {
    getFen: () => chess.fen(),
    turn: () => chess.turn(),
    legalMoves,
    tryMove,
    previewMove,
    isGameOver: () => chess.isGameOver(),
    reset,
  };
}
