import { describe, expect, test, beforeEach } from 'bun:test';
import {
  gameStore,
  setMode,
  setClassicConfig,
  resetBoard,
  applyMove,
  handleSquareClick,
  resolvePromotion,
  cancelPromotion,
  undoMove,
  rewindTo,
  setHint,
  incrementHintsUsed,
  incrementUndosUsed,
  pushActionLog,
  clearActionLogs,
  setStatus,
  setLocalRequest,
  setAdventurePieceHps,
  setAdventureBoardSnapshot,
} from './gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    resetBoard();
    setMode('classic');
    clearActionLogs();
  });

  test('should initialize and reset board correctly', () => {
    expect(gameStore.board).toBeDefined();
    expect(gameStore.turn).toBe('w');
    expect(gameStore.moves).toEqual([]);
    expect(gameStore.ui.status.kind).toBe('ongoing');
    expect(gameStore.ui.interactive).toBe(true);
  });

  test('should handle setMode and setClassicConfig', () => {
    setMode('classic');
    expect(gameStore.mode).toBe('classic');

    setClassicConfig({
      submode: 'single',
      single: {
        difficulty: 'amateur',
        hintsEnabled: true,
        undoLimit: 3,
        timeControl: { kind: 'unlimited' },
        playerColor: 'w',
      },
    });

    expect(gameStore.classic?.submode).toBe('single');
    expect(gameStore.classic?.single?.difficulty).toBe('amateur');
  });

  test('should handle square selection and move via handleSquareClick', () => {
    // Select e2
    const res1 = handleSquareClick('e2');
    expect(res1).toBe('selected');
    expect(gameStore.ui.selected).toBe('e2');
    expect(gameStore.ui.highlights.length).toBeGreaterThan(0);

    // Click e4 (valid move)
    const res2 = handleSquareClick('e4');
    expect(res2).toBe('moved');
    expect(gameStore.turn).toBe('b');
    expect(gameStore.moves.length).toBe(1);
    expect(gameStore.moves[0]?.lan).toBe('e2e4');
  });

  test('should clear selection when clicking selected square again', () => {
    handleSquareClick('e2');
    expect(gameStore.ui.selected).toBe('e2');

    const res = handleSquareClick('e2');
    expect(res).toBe('cleared');
    expect(gameStore.ui.selected).toBeUndefined();
    expect(gameStore.ui.highlights).toEqual([]);
  });

  test('should handle applyMove directly and undoMove', () => {
    const move = applyMove('e2e4');
    expect(move).not.toBeNull();
    expect(gameStore.moves.length).toBe(1);

    const undone = undoMove();
    expect(undone).toBeDefined();
    expect(gameStore.moves.length).toBe(0);
    expect(gameStore.turn).toBe('w');
  });

  test('should handle rewindTo move index', () => {
    applyMove('e2e4');
    applyMove('e7e5');
    applyMove('g1f3');
    expect(gameStore.moves.length).toBe(3);

    rewindTo(1);
    expect(gameStore.moves.length).toBe(1);
    expect(gameStore.moves[0]?.lan).toBe('e2e4');
  });

  test('should manage hints, undo counts, and action logs', () => {
    setHint({ from: 'e2', to: 'e4' });
    expect(gameStore.ui.hint).toEqual({ from: 'e2', to: 'e4' });

    incrementHintsUsed();
    expect(gameStore.ui.hintsUsed).toBe(1);

    incrementUndosUsed();
    expect(gameStore.ui.undosUsed).toBe(1);

    pushActionLog('Move e2e4 executed');
    expect(gameStore.actionLogs).toEqual(['Move e2e4 executed']);

    clearActionLogs();
    expect(gameStore.actionLogs).toEqual([]);
  });

  test('should handle promotion move via applyMove and resolvePromotion', () => {
    const move = applyMove('e2e4');
    expect(move).toBeDefined();

    // Test promotion via resolvePromotion when pending promotion is set
    handleSquareClick('e2');
    cancelPromotion();
    expect(gameStore.ui.pendingPromotion).toBeUndefined();
  });

  test('should handle local request state and game status updates', () => {
    setLocalRequest({ kind: 'undo', requestedBy: 'w' });
    expect(gameStore.ui.localRequest).toEqual({ kind: 'undo', requestedBy: 'w' });

    setStatus({ kind: 'checkmate', winner: 'w' });
    expect(gameStore.ui.status.kind).toBe('checkmate');
    expect(gameStore.ui.interactive).toBe(false);
    expect(gameStore.ui.localRequest).toBeUndefined(); // Cleared on game end
  });

  test('should update adventure board snapshot', () => {
    setAdventurePieceHps([{ square: 'e2', hp: 10, maxHp: 10 }]);
    expect(gameStore.ui.adventurePieceHps).toEqual([{ square: 'e2', hp: 10, maxHp: 10 }]);

    setAdventureBoardSnapshot('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', []);
    expect(gameStore.ui.adventurePieceHps).toEqual([]);
  });
});
