import { createStore } from 'solid-js/store';
import type { Mode } from '@shared/mode';
import type { ClassicConfig } from '@shared/classic';
import type { AdventureRunState } from '@shared/adventure';
import { INITIAL_FEN, type GameState } from '@shared/game';
import {
  createChessManager,
  type GameStatus,
  type MoveDescriptor,
  type Square,
  type Color,
  type PieceSymbol,
} from '@/lib/chess/ChessManager';
import { eventBus, type BoardRenderState } from '@/lib/phaser/bridge/eventBus';

interface UiState {
  selected?: Square;
  highlights: Square[];
  orientation: Color;
  pendingPromotion?: { from: Square; to: Square };
  status: GameStatus;
  interactive: boolean;
  hint?: { from: Square; to: Square };
  hintsUsed: number;
  undosUsed: number;
}

interface RootState extends GameState {
  ui: UiState;
  moves: MoveDescriptor[];
}

const initial: RootState = {
  board: INITIAL_FEN,
  turn: 'w',
  moves: [],
  ui: {
    highlights: [],
    orientation: 'w',
    status: { kind: 'ongoing' },
    interactive: true,
    hintsUsed: 0,
    undosUsed: 0,
  },
};

const [state, setState] = createStore<RootState>(initial);
const chess = createChessManager();

export const gameStore = state;

function emitBoard(): void {
  const lastMove = chess.lastMove();
  const checkSquare = chess.isInCheck() ? chess.kingSquare(chess.turn()) : undefined;
  const payload: BoardRenderState = {
    fen: state.board,
    selected: state.ui.selected,
    highlights: state.ui.highlights,
    lastMoveFrom: lastMove?.from,
    lastMoveTo: lastMove?.to,
    checkSquare,
    hintFrom: state.ui.hint?.from,
    hintTo: state.ui.hint?.to,
    orientation: state.ui.orientation,
    interactive: state.ui.interactive,
  };
  eventBus.emit('state:board', payload);
}

function refreshStatus(): void {
  setState('ui', 'status', chess.evaluateNaturalStatus());
}

export function setMode(mode: Mode | undefined): void {
  setState('mode', mode);
}

export function setClassicConfig(config: ClassicConfig | undefined): void {
  setState('classic', config);
}

export function setAdventureRun(run: AdventureRunState | undefined): void {
  setState('adventure', run);
}

export function setOrientation(color: Color): void {
  setState('ui', 'orientation', color);
  emitBoard();
}

export function setInteractive(interactive: boolean): void {
  setState('ui', 'interactive', interactive);
  emitBoard();
}

export function resetBoard(): void {
  chess.reset();
  setState({
    board: chess.getFen(),
    turn: chess.turn(),
    moves: [],
  });
  setState('ui', {
    selected: undefined,
    highlights: [],
    pendingPromotion: undefined,
    status: { kind: 'ongoing' },
    interactive: true,
    hint: undefined,
    hintsUsed: 0,
    undosUsed: 0,
  });
  emitBoard();
}

export function setStatus(status: GameStatus): void {
  setState('ui', 'status', status);
  if (status.kind !== 'ongoing') {
    setState('ui', 'interactive', false);
  }
  emitBoard();
}

function setSelection(selected: Square | undefined, highlights: Square[]): void {
  setState('ui', {
    selected,
    highlights,
  });
  emitBoard();
}

export function clearSelection(): void {
  if (!state.ui.selected && state.ui.highlights.length === 0) return;
  setSelection(undefined, []);
}

export function selectSquare(square: Square): void {
  if (!state.ui.interactive) return;
  if (state.ui.pendingPromotion) return;
  const dests = chess.legalDestinations(square);
  if (dests.length === 0) {
    clearSelection();
    return;
  }
  setSelection(square, dests);
}

export function applyMove(uci: string): MoveDescriptor | null {
  const result = chess.tryMove(uci);
  if (!result.ok) return null;
  setState({
    board: result.move.fen,
    turn: chess.turn(),
    moves: [...state.moves, result.move],
  });
  setState('ui', {
    selected: undefined,
    highlights: [],
    pendingPromotion: undefined,
  });
  refreshStatus();
  if (state.ui.status.kind !== 'ongoing') {
    setState('ui', 'interactive', false);
  }
  emitBoard();
  return result.move;
}

/**
 * 사용자가 보드 칸을 클릭했을 때 호출. 선택 → 이동 → 승급 다이얼로그 흐름 처리.
 * 반환값:
 * - 'moved': 무브가 적용됨
 * - 'selected': 새 칸이 선택됨
 * - 'cleared': 선택이 해제됨
 * - 'promotion': 폰 승급 다이얼로그가 필요함 (state.ui.pendingPromotion에 from/to 저장)
 * - 'noop': 변화 없음
 */
export function handleSquareClick(square: Square): 'moved' | 'selected' | 'cleared' | 'promotion' | 'noop' {
  if (!state.ui.interactive) return 'noop';
  if (state.ui.pendingPromotion) return 'noop';
  const selected = state.ui.selected;
  if (selected && square === selected) {
    clearSelection();
    return 'cleared';
  }
  if (selected && state.ui.highlights.includes(square)) {
    if (chess.needsPromotion(selected, square)) {
      setState('ui', 'pendingPromotion', { from: selected, to: square });
      return 'promotion';
    }
    const uci = `${selected}${square}`;
    const moved = applyMove(uci);
    return moved ? 'moved' : 'noop';
  }
  const dests = chess.legalDestinations(square);
  if (dests.length === 0) {
    if (selected) {
      clearSelection();
      return 'cleared';
    }
    return 'noop';
  }
  setSelection(square, dests);
  return 'selected';
}

export function resolvePromotion(piece: PieceSymbol): MoveDescriptor | null {
  const pending = state.ui.pendingPromotion;
  if (!pending) return null;
  const uci = `${pending.from}${pending.to}${piece}`;
  setState('ui', 'pendingPromotion', undefined);
  return applyMove(uci);
}

export function cancelPromotion(): void {
  setState('ui', 'pendingPromotion', undefined);
  clearSelection();
}

export function undoMove(): MoveDescriptor | undefined {
  const popped = chess.undo();
  if (!popped) return undefined;
  setState({
    board: chess.getFen(),
    turn: chess.turn(),
    moves: state.moves.slice(0, -1),
  });
  setState('ui', {
    selected: undefined,
    highlights: [],
    pendingPromotion: undefined,
  });
  refreshStatus();
  if (state.ui.status.kind === 'ongoing') {
    setState('ui', 'interactive', true);
  }
  emitBoard();
  return popped;
}

export function rewindTo(index: number): void {
  chess.rewindTo(index);
  setState({
    board: chess.getFen(),
    turn: chess.turn(),
    moves: state.moves.slice(0, index),
  });
  setState('ui', {
    selected: undefined,
    highlights: [],
    pendingPromotion: undefined,
  });
  refreshStatus();
  emitBoard();
}

export function getPgn(headers?: Record<string, string>): string {
  return chess.toPgn(headers);
}

export function setHint(hint: { from: Square; to: Square } | undefined): void {
  setState('ui', 'hint', hint);
  emitBoard();
}

export function incrementHintsUsed(): void {
  setState('ui', 'hintsUsed', (n) => n + 1);
}

export function incrementUndosUsed(): void {
  setState('ui', 'undosUsed', (n) => n + 1);
}

export function getChessManager() {
  return chess;
}

eventBus.on('board:ready', () => {
  emitBoard();
});

eventBus.on('cmd:reset', () => {
  resetBoard();
});

eventBus.on('cmd:applyMove', ({ uci }) => {
  applyMove(uci);
});

eventBus.on('cmd:selectSquare', ({ square }) => {
  selectSquare(square as Square);
});

eventBus.on('cmd:clearSelection', () => {
  clearSelection();
});

eventBus.on('board:squareClicked', ({ square }) => {
  handleSquareClick(square as Square);
});
