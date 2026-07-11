import { createStore } from 'solid-js/store';
import type { Mode } from '@shared/mode';
import type { ClassicConfig } from '@shared/classic';
import type { AdventureRunState, MetaProgress } from '@shared/adventure';
import { INITIAL_FEN, type GameState } from '@shared/game';
import type { ClockSnapshot } from '@shared/clock';
import {
  createChessManager,
  toRichLastMove,
  type GameStatus,
  type MoveDescriptor,
  type Square,
  type Color,
  type PieceSymbol,
} from '@/lib/chess/ChessManager';
import { eventBus, type BoardRenderState, type LastMove, type BoardTheme, type CharacterId } from '@/lib/phaser/bridge/eventBus';
import { settings } from '@/store/settingsStore';

export type LocalRequestKind = 'undo' | 'draw' | 'resign';

export interface LocalRequest {
  kind: LocalRequestKind;
  requestedBy: Color;
}

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
  clock?: ClockSnapshot;
  aiThinking: boolean;
  /** 로컬멀티에서 한쪽이 요청한 합의 상태. 다른 쪽 응답을 기다린다. */
  localRequest?: LocalRequest;
  /** 모험 모드 보드 렌더링에 쓰는 piece HP 정보 (없으면 일반 보드). */
  adventurePieceHps?: { square: string; hp: number; maxHp: number }[];
}

interface RootState extends GameState {
  ui: UiState;
  moves: MoveDescriptor[];
  actionLogs: string[];
}

const initial: RootState = {
  board: INITIAL_FEN,
  turn: 'w',
  moves: [],
  actionLogs: [],
  ui: {
    highlights: [],
    orientation: 'w',
    status: { kind: 'ongoing' },
    interactive: true,
    hintsUsed: 0,
    undosUsed: 0,
    aiThinking: false,
  },
};

const [state, setState] = createStore<RootState>(initial);
const chess = createChessManager();

export const gameStore = state;

let nextEmitInstant = false;

function selectTheme(): BoardTheme {
  if (state.mode === 'adventure' && state.adventure) {
    if (state.adventure.act === 2) return 'forest';
    if (state.adventure.act === 3) return 'ocean';
  }
  return 'default';
}

export function getActiveCharacterId(): CharacterId {
  if (state.mode === 'adventure' && state.adventure) {
    const id = state.adventure.characterId;
    if (id === 'assassins' || id === 'saints') return id;
  }
  return 'standard';
}

function emitBoard(opts: { lastMove?: LastMove; instant?: boolean } = {}): void {
  const last = opts.lastMove ?? (chess.lastMove() ? toRichLastMove(chess.lastMove()!) : undefined);
  const reducedMotion = settings.accessibility.reducedMotion;
  const payload: BoardRenderState = {
    fen: state.board,
    selected: state.ui.selected,
    highlights: state.ui.highlights,
    lastMove: last,
    checkSquare: chess.isInCheck() ? chess.kingSquare(chess.turn()) : undefined,
    hintFrom: state.ui.hint?.from,
    hintTo: state.ui.hint?.to,
    orientation: state.ui.orientation,
    interactive: state.ui.interactive,
    instant: nextEmitInstant || opts.instant === true || reducedMotion,
    pieceHps: state.ui.adventurePieceHps,
    noPieceAnim: reducedMotion,
    theme: selectTheme(),
    characterId: getActiveCharacterId(),
  };
  nextEmitInstant = false;
  eventBus.emit('state:board', payload);
}

function refreshStatus(): void {
  setState('ui', 'status', chess.evaluateNaturalStatus());
}

export function setMode(mode: Mode | undefined): void {
  setState('mode', mode);
  // 모드 전환 시 incompatible state 정리.
  setState('ui', {
    localRequest: undefined,
    clock: undefined,
    selected: undefined,
    highlights: [],
    adventurePieceHps: undefined,
  });
}

export function setClassicConfig(config: ClassicConfig | undefined): void {
  setState('classic', config);
}

export function setAdventureRun(run: AdventureRunState | undefined): void {
  setState('adventure', run);
}

export function snapshotAdventureRun(run: AdventureRunState): void {
  // 컨트롤러가 변경 시 호출. 불변 복사를 store에 반영해 reactivity 트리거.
  setState('adventure', { ...run });
}

const META_KEY = 'meta:progress';
const DEFAULT_META: MetaProgress = {
  totalStarShards: 0,
  unlockedCharacters: ['standard'],
  unlockedItems: [],
  unlockedItemPools: [],
  unlockedLocations: [],
  permanentBonuses: {},
};

export async function loadMetaProgress(): Promise<MetaProgress> {
  const { kvGet } = await import('@/lib/storage/kv');
  const stored = await kvGet<MetaProgress>(META_KEY);
  if (!stored) return DEFAULT_META;
  return {
    ...DEFAULT_META,
    ...stored,
    // 구버전 호환: unlockedItemPools가 없으면 unlockedItems에서 분리 추출
    unlockedItemPools:
      stored.unlockedItemPools ??
      stored.unlockedItems.filter((k) => k === 'rare-pool' || k === 'legendary-pool'),
    unlockedItems: (stored.unlockedItems ?? []).filter(
      (k) => k !== 'rare-pool' && k !== 'legendary-pool',
    ),
    permanentBonuses: { ...DEFAULT_META.permanentBonuses, ...stored.permanentBonuses },
  };
}

export async function saveMetaProgress(meta: MetaProgress): Promise<void> {
  const { kvSet } = await import('@/lib/storage/kv');
  await kvSet(META_KEY, meta);
}

export function setOrientation(color: Color, options: { instant?: boolean } = {}): void {
  const changed = state.ui.orientation !== color;
  setState('ui', 'orientation', color);
  if (changed && !options.instant) {
    // 차례 변경에 따른 시각적 회전 — 200ms 트랜지션을 BoardScene이 그린다.
    nextEmitInstant = false;
  } else {
    nextEmitInstant = true;
  }
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
    clock: undefined,
    aiThinking: false,
    localRequest: undefined,
  });
  nextEmitInstant = true;
  emitBoard();
}

export function setStatus(status: GameStatus): void {
  setState('ui', 'status', status);
  if (status.kind !== 'ongoing') {
    setState('ui', 'interactive', false);
    // 게임이 종료되면 떠 있는 합의 요청 모달도 함께 정리한다
    setState('ui', 'localRequest', undefined);
  }
  emitBoard();
}

/** 보스 페이즈 전환 등 status를 ongoing으로 되돌려야 하는 흐름. */
export function resetStatusOngoing(): void {
  setState('ui', { status: { kind: 'ongoing' }, interactive: true });
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
  if (state.ui.localRequest) return;
  // 모험 모드는 별도 보드 매니저를 가지므로 클래식 chess.js 핸들러를 비활성화한다.
  if (state.mode === 'adventure') return;
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
  if (state.ui.localRequest) return 'noop';
  // 모험 모드는 별도 보드 매니저를 가지므로 클래식 chess.js 핸들러를 비활성화한다.
  // AdventureBattle/Boss 라우트가 자체 핸들러를 eventBus.on('board:squareClicked')로 등록.
  if (state.mode === 'adventure') return 'noop';
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
  nextEmitInstant = true;
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
  nextEmitInstant = true;
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

export function setClockSnapshot(snapshot: ClockSnapshot | undefined): void {
  setState('ui', 'clock', snapshot);
}

export function setAiThinking(thinking: boolean): void {
  setState('ui', 'aiThinking', thinking);
}

export function setLocalRequest(req: LocalRequest | undefined): void {
  setState('ui', 'localRequest', req);
}

export function setAdventurePieceHps(
  hps: { square: string; hp: number; maxHp: number }[] | undefined,
): void {
  setState('ui', 'adventurePieceHps', hps);
  emitBoard();
}

/** FEN + pieceHps를 단일 batch로 갱신해 중간 stale render를 방지. */
export function setAdventureBoardSnapshot(
  fen: string,
  hps: { square: string; hp: number; maxHp: number }[],
  lastMove?: LastMove,
  opts?: { instant?: boolean },
): void {
  setState('board', fen);
  setState('ui', 'adventurePieceHps', hps);
  emitBoard({ lastMove, instant: opts?.instant });
}

export function setAdventureSelection(
  selected: Square | undefined,
  highlights: Square[],
): void {
  setState('ui', { selected, highlights });
  emitBoard();
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

/** 모험 보드 클릭 콜백을 컨트롤러가 위임받기 위한 시그널. */
let adventureClickHandler: ((square: Square) => void) | null = null;
export function setAdventureClickHandler(
  handler: ((square: Square) => void) | null,
): void {
  adventureClickHandler = handler;
}

eventBus.on('board:squareClicked', ({ square }) => {
  if (state.mode === 'adventure') {
    adventureClickHandler?.(square as Square);
    return;
  }
  handleSquareClick(square as Square);
});

export function pushActionLog(message: string): void {
  setState('actionLogs', (logs) => [...logs, message]);
}

export function clearActionLogs(): void {
  setState('actionLogs', []);
}
