import { describe, test, expect } from 'bun:test';
import { createChessManager, toRichLastMove } from './ChessManager';

describe('ChessManager', () => {
  test('should initialize with starting FEN and White to move', () => {
    const manager = createChessManager();
    expect(manager.turn()).toBe('w');
    expect(manager.isGameOver()).toBe(false);
    expect(manager.evaluateNaturalStatus()).toEqual({ kind: 'ongoing' });
  });

  test('should execute standard moves correctly', () => {
    const manager = createChessManager();
    const res = manager.tryMove('e2e4');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.move.from).toBe('e2');
      expect(res.move.to).toBe('e4');
      expect(res.move.san).toBe('e4');
      expect(res.move.color).toBe('w');
    }
    expect(manager.turn()).toBe('b');
    expect(manager.history()).toEqual(['e4']);
  });

  test('should reject illegal moves', () => {
    const manager = createChessManager();
    const res = manager.tryMove('e2e5'); // Illegal move for white pawn
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('illegal');
    }
  });

  test('should check promotion requirements and resolve promotion', () => {
    // Custom FEN where White pawn is on e7
    const manager = createChessManager('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    expect(manager.needsPromotion('e7', 'e8')).toBe(true);

    // Try without promotion specifier
    const tryNoPromo = manager.tryMove('e7e8');
    expect(tryNoPromo.ok).toBe(false);

    // Try with promotion specifier (e7e8q)
    const tryPromo = manager.tryMove('e7e8q');
    expect(tryPromo.ok).toBe(true);
    if (tryPromo.ok) {
      expect(tryPromo.move.promotion).toBe('q');
      expect(tryPromo.move.san).toBe('e8=Q');
    }
  });

  test('should handle undo and rewindTo', () => {
    const manager = createChessManager();
    manager.tryMove('e2e4');
    manager.tryMove('e7e5');
    manager.tryMove('g1f3');

    expect(manager.moves().length).toBe(3);

    const undone = manager.undo();
    expect(undone?.san).toBe('Nf3');
    expect(manager.moves().length).toBe(2);
    expect(manager.turn()).toBe('w');

    manager.rewindTo(0);
    expect(manager.moves().length).toBe(0);
    expect(manager.turn()).toBe('w');
  });

  test('should detect checkmate and evaluate status', () => {
    // Scholar's Mate scenario
    const manager = createChessManager();
    manager.tryMove('e2e4');
    manager.tryMove('e7e5');
    manager.tryMove('f1c4');
    manager.tryMove('b8c6');
    manager.tryMove('d1h5');
    manager.tryMove('g8f6');
    const mateMove = manager.tryMove('h5f7');

    expect(mateMove.ok).toBe(true);
    expect(manager.isInCheck()).toBe(true);
    expect(manager.isGameOver()).toBe(true);
    expect(manager.evaluateNaturalStatus()).toEqual({ kind: 'checkmate', winner: 'w' });
  });

  test('should swap active color via swapTurnOnly', () => {
    const manager = createChessManager();
    expect(manager.turn()).toBe('w');
    const res = manager.swapTurnOnly();
    expect(res.ok).toBe(true);
    expect(manager.turn()).toBe('b');
  });

  test('should identify king position via kingSquare', () => {
    const manager = createChessManager();
    expect(manager.kingSquare('w')).toBe('e1');
    expect(manager.kingSquare('b')).toBe('e8');
  });

  test('should evaluate insufficient material to mate', () => {
    // Only Kings
    const manager = createChessManager('8/8/8/4k3/8/8/4K3/8 w - - 0 1');
    expect(manager.hasInsufficientMaterialToMate('w')).toBe(true);

    // King and Bishop for White
    const managerB = createChessManager('8/8/8/4k3/8/8/2B1K3/8 w - - 0 1');
    expect(managerB.hasInsufficientMaterialToMate('w')).toBe(true);

    // King and Rook for White (can mate)
    const managerR = createChessManager('8/8/8/4k3/8/8/2R1K3/8 w - - 0 1');
    expect(managerR.hasInsufficientMaterialToMate('w')).toBe(false);
  });

  test('should convert MoveDescriptor to rich last move', () => {
    const manager = createChessManager();
    const moveRes = manager.tryMove('e2e4');
    if (moveRes.ok) {
      const rich = toRichLastMove(moveRes.move);
      expect(rich.from).toBe('e2');
      expect(rich.to).toBe('e4');
      expect(rich.kind).toBe('normal');
    }
  });
});
