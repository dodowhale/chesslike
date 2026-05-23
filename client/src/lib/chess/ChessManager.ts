import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import { INITIAL_FEN } from '@shared/game';

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
  };
}
