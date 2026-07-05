import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { INITIAL_FEN } from '@shared/game';
import type { LastMove, LastMoveKind } from '@/lib/phaser/bridge/eventBus';

// chess.js 타입을 도메인 외부로 노출하지 않기 위해 ChessManager에서 재export.
// 외부 코드는 항상 '@/lib/chess/ChessManager'에서 이 타입들을 import해야 한다.
export type { Square, PieceSymbol, Color };

const PROMOTION_PIECES: ReadonlySet<string> = new Set(['q', 'r', 'b', 'n']);

export interface MoveDescriptor {
  from: Square;
  to: Square;
  san: string;
  lan: string;
  fen: string;
  before: string;
  color: Color;
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

export type GameStatus =
  | { kind: 'ongoing' }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'insufficient-material' }
  | { kind: 'threefold-repetition' }
  | { kind: 'fifty-move-rule' }
  | { kind: 'resignation'; winner: Color }
  | { kind: 'timeout'; winner: Color }
  | { kind: 'draw-agreement' };

export interface ChessManager {
  getFen(): string;
  turn(): Color;
  legalMoves(square?: Square): string[];
  legalDestinations(square: Square): Square[];
  tryMove(uci: string): MoveResult;
  previewMove(uci: string): MoveResult;
  /** 폰 승급이 필요한 무브인지 사전 확인 (보드 클릭 후 다이얼로그 띄울 때 사용) */
  needsPromotion(from: Square, to: Square): boolean;
  /** 현재 차례 진영이 체크 상태인지 */
  isInCheck(): boolean;
  /** 현재 진영의 킹 위치 */
  kingSquare(color: Color): Square | undefined;
  /** chess.js의 자연 종료 상태(체크메이트/스테일메이트/50수/3회/불충분 재료) 평가 */
  evaluateNaturalStatus(): GameStatus;
  isGameOver(): boolean;
  /** 마지막 적용된 무브 디스크립터 */
  lastMove(): MoveDescriptor | undefined;
  /** 적용된 무브 디스크립터 전체(순서대로) */
  moves(): MoveDescriptor[];
  /** 마지막 한 수 무르기. AI 응답 무르기를 위해 두 번 호출 가능. */
  undo(): MoveDescriptor | undefined;
  /** 임의 시점(인덱스 i까지 적용한 상태)으로 되감기. i=0이면 초기 위치. */
  rewindTo(index: number): void;
  /** SAN 무브 리스트 */
  history(): string[];
  /** PGN 문자열 (헤더 + 무브). headers 인자는 White/Black/Event 등 추가 메타. */
  toPgn(headers?: Record<string, string>): string;
  reset(fen?: string): { ok: true } | { ok: false; reason: string };
  /**
   * 무브를 적용하지 않은 채 active color만 swap한다. 모험 모드에서 캡처 실패
   * (defender HP가 남아 attacker 원위치)로 한 턴이 소비된 경우 후속 차례 흐름을
   * 살리기 위해 사용. en passant target은 무효화, halfmove clock +1,
   * fullmove number는 흑→백 swap 시 +1.
   */
  swapTurnOnly(): { ok: true } | { ok: false; reason: string };
  removePiece(square: Square): { ok: true } | { ok: false; reason: string };
  putPiece(piece: { type: PieceSymbol; color: Color }, square: Square): { ok: true } | { ok: false; reason: string };
  /** 특정 진영이 상대를 체크메이트시킬 수 있는 최소한의 기물을 갖고 있지 않은지 여부 (FIDE 6.9조) */
  hasInsufficientMaterialToMate(color: Color): boolean;
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

function enPassantCapturedSquare(to: Square, color: Color): Square {
  const file = to.charAt(0);
  const rank = Number(to.charAt(1));
  const capturedRank = color === 'w' ? rank - 1 : rank + 1;
  return `${file}${capturedRank}` as Square;
}

const PIECE_KEY_FOR: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: 'wP', n: 'wN', b: 'wB', r: 'wR', q: 'wQ', k: 'wK' },
  b: { p: 'bP', n: 'bN', b: 'bB', r: 'bR', q: 'bQ', k: 'bK' },
};

function rookSquaresForCastle(
  kingFrom: Square,
  kingTo: Square,
): { rookFrom: Square; rookTo: Square } | null {
  const fromFile = kingFrom.charAt(0);
  const toFile = kingTo.charAt(0);
  const rank = kingFrom.charAt(1);
  if (fromFile !== 'e') return null;
  if (toFile === 'g') return { rookFrom: `h${rank}` as Square, rookTo: `f${rank}` as Square };
  if (toFile === 'c') return { rookFrom: `a${rank}` as Square, rookTo: `d${rank}` as Square };
  return null;
}

export function toRichLastMove(move: MoveDescriptor): LastMove {
  let kind: LastMoveKind;
  if (move.promotion) kind = 'promotion';
  else if (move.isCastle) kind = 'castling';
  else if (move.isEnPassant) kind = 'en-passant';
  else if (move.isCapture) kind = 'capture';
  else kind = 'normal';

  const rich: LastMove = { from: move.from, to: move.to, kind };

  if (kind === 'castling') {
    const rook = rookSquaresForCastle(move.from, move.to);
    if (rook) {
      rich.rookFrom = rook.rookFrom;
      rich.rookTo = rook.rookTo;
    }
  }
  if (kind === 'en-passant' && move.capturedSquare) {
    rich.victimSquare = move.capturedSquare;
  }
  if (kind === 'promotion' && move.promotion) {
    rich.promotedTo = move.promotion;
  }
  if (move.captured) {
    const victimColor: Color = move.color === 'w' ? 'b' : 'w';
    rich.capturedKey = PIECE_KEY_FOR[victimColor][move.captured];
  }
  return rich;
}

function toDescriptor(
  move: ReturnType<Chess['move']>,
  before: string,
  after: string,
): MoveDescriptor {
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
    fen: after,
    before,
    color: move.color,
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
  const moveLog: MoveDescriptor[] = [];

  function legalMoves(square?: Square): string[] {
    const moves = square
      ? chess.moves({ square, verbose: true })
      : chess.moves({ verbose: true });
    return moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
  }

  function legalDestinations(square: Square): Square[] {
    const moves = chess.moves({ square, verbose: true });
    const set = new Set<Square>();
    for (const m of moves) set.add(m.to);
    return Array.from(set);
  }

  function needsPromotion(from: Square, to: Square): boolean {
    const moves = chess.moves({ square: from, verbose: true });
    return moves.some((m) => m.to === to && m.promotion !== undefined);
  }

  function tryMove(uci: string): MoveResult {
    const parsed = parseUci(uci);
    if (!parsed) {
      return {
        ok: false,
        reason: uci.length === 5 ? 'invalid-promotion' : 'invalid-uci',
      };
    }
    const before = chess.fen();
    try {
      const move = chess.move(parsed);
      const descriptor = toDescriptor(move, before, chess.fen());
      moveLog.push(descriptor);
      return { ok: true, move: descriptor };
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
    // 별도 Chess 인스턴스에서 시뮬레이션해 본 인스턴스의 history를 손상시키지 않는다.
    const sim = new Chess(chess.fen());
    try {
      const move = sim.move(parsed);
      return {
        ok: true,
        move: toDescriptor(move, chess.fen(), sim.fen()),
      };
    } catch {
      return { ok: false, reason: 'illegal' };
    }
  }

  function isInCheck(): boolean {
    return chess.isCheck();
  }

  function kingSquare(color: Color): Square | undefined {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      const row = board[r];
      if (!row) continue;
      for (let f = 0; f < 8; f++) {
        const sq = row[f];
        if (sq && sq.type === 'k' && sq.color === color) {
          return sq.square;
        }
      }
    }
    return undefined;
  }

  function evaluateNaturalStatus(): GameStatus {
    if (chess.isCheckmate()) {
      return { kind: 'checkmate', winner: chess.turn() === 'w' ? 'b' : 'w' };
    }
    if (chess.isStalemate()) return { kind: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { kind: 'insufficient-material' };
    if (chess.isThreefoldRepetition()) return { kind: 'threefold-repetition' };
    if (chess.isDrawByFiftyMoves()) return { kind: 'fifty-move-rule' };
    return { kind: 'ongoing' };
  }

  function lastMove(): MoveDescriptor | undefined {
    return moveLog[moveLog.length - 1];
  }

  function undo(): MoveDescriptor | undefined {
    const popped = chess.undo();
    if (!popped) return undefined;
    return moveLog.pop();
  }

  function rewindTo(index: number): void {
    if (index < 0) index = 0;
    if (index > moveLog.length) index = moveLog.length;
    while (moveLog.length > index) {
      const ok = chess.undo();
      if (!ok) break;
      moveLog.pop();
    }
  }

  function history(): string[] {
    return moveLog.map((m) => m.san);
  }

  function toPgn(headers?: Record<string, string>): string {
    if (headers) {
      for (const [k, v] of Object.entries(headers)) chess.setHeader(k, v);
    }
    return chess.pgn();
  }

  function reset(fen?: string): { ok: true } | { ok: false; reason: string } {
    try {
      chess.load(fen ?? INITIAL_FEN);
      moveLog.length = 0;
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'invalid-fen' };
    }
  }

  function swapTurnOnly(): { ok: true } | { ok: false; reason: string } {
    // FEN: <board> <active> <castling> <ep> <halfmove> <fullmove>
    const parts = chess.fen().split(' ');
    if (parts.length !== 6) return { ok: false, reason: 'bad-fen' };
    const [board, active, castling, , half, full] = parts as [
      string, string, string, string, string, string,
    ];
    const newActive = active === 'w' ? 'b' : 'w';
    const newHalf = String(Number(half) + 1);
    // 흑 차례가 끝나면 fullmove +1.
    const newFull = active === 'b' ? String(Number(full) + 1) : full;
    const newFen = [board, newActive, castling, '-', newHalf, newFull].join(' ');
    try {
      chess.load(newFen);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'invalid-fen' };
    }
  }

  return {
    getFen: () => chess.fen(),
    turn: () => chess.turn(),
    legalMoves,
    legalDestinations,
    tryMove,
    previewMove,
    needsPromotion,
    isInCheck,
    kingSquare,
    evaluateNaturalStatus,
    isGameOver: () => chess.isGameOver(),
    lastMove,
    moves: () => moveLog.slice(),
    undo,
    rewindTo,
    history,
    toPgn,
    reset,
    swapTurnOnly,
    removePiece: (square: Square) => {
      try {
        const removed = chess.remove(square);
        if (!removed) return { ok: false, reason: 'no-piece' };
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'error' };
      }
    },
    putPiece: (piece: { type: PieceSymbol; color: Color }, square: Square) => {
      try {
        const placed = chess.put(piece, square);
        if (!placed) return { ok: false, reason: 'invalid-placement' };
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : 'error' };
      }
    },
    hasInsufficientMaterialToMate: (color: Color) => {
      const board = chess.board();
      const pieces: { type: PieceSymbol; color: Color }[] = [];
      for (let r = 0; r < 8; r++) {
        const row = board[r];
        if (!row) continue;
        for (let f = 0; f < 8; f++) {
          const sq = row[f];
          if (sq && sq.color === color) {
            pieces.push({ type: sq.type, color: sq.color });
          }
        }
      }

      const count = pieces.length;
      if (count <= 1) return true; // 킹 1개만 남았을 때 (혹은 기물이 없을 때)
      if (count === 2) {
        const hasBishop = pieces.some((p) => p.type === 'b');
        const hasKnight = pieces.some((p) => p.type === 'n');
        if (hasBishop || hasKnight) {
          return true; // KB 또는 KN은 메이트 불가
        }
      }
      return false;
    },
  };
}
