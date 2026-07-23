import { describe, expect, test } from 'bun:test';
import { LocalAdapter } from './LocalAdapter';
import { gameStore, resetBoard, setMode } from '@/store/gameStore';
import type { ClassicConfig } from '@shared/classic';

describe('LocalAdapter', () => {
  const defaultConfig: ClassicConfig = {
    submode: 'local',
    local: {
      timeControl: { kind: 'unlimited' },
      autoRotateBoard: false,
      allowUndo: true,
      allowDrawOffer: true,
    },
  };

  test('should handle undo request and agreement flow', () => {
    setMode('classic');
    resetBoard();

    const adapter = new LocalAdapter(defaultConfig);

    // Initial state: no requests
    expect(gameStore.ui.localRequest).toBeUndefined();

    // No moves made yet -> undo request should be ignored
    adapter.requestUndo();
    expect(gameStore.ui.localRequest).toBeUndefined();
  });

  test('should handle draw request and acceptance', () => {
    setMode('classic');
    resetBoard();

    const adapter = new LocalAdapter(defaultConfig);
    adapter.requestDraw();

    expect(gameStore.ui.localRequest).toBeDefined();
    expect(gameStore.ui.localRequest?.kind).toBe('draw');

    adapter.acceptRequest();
    expect(gameStore.ui.localRequest).toBeUndefined();
    expect(gameStore.ui.status.kind).toBe('draw-agreement');
  });

  test('should handle resign request and acceptance', () => {
    setMode('classic');
    resetBoard();

    const adapter = new LocalAdapter(defaultConfig);
    adapter.resign();

    expect(gameStore.ui.localRequest).toBeDefined();
    expect(gameStore.ui.localRequest?.kind).toBe('resign');

    adapter.acceptRequest();
    expect(gameStore.ui.localRequest).toBeUndefined();
    expect(gameStore.ui.status.kind).toBe('resignation');
    if (gameStore.ui.status.kind === 'resignation') {
      expect(gameStore.ui.status.winner).toBe('b');
    }
  });

  test('should handle declining request', () => {
    setMode('classic');
    resetBoard();

    const adapter = new LocalAdapter(defaultConfig);
    adapter.requestDraw();
    expect(gameStore.ui.localRequest).toBeDefined();

    adapter.declineRequest();
    expect(gameStore.ui.localRequest).toBeUndefined();
    expect(gameStore.ui.status.kind).toBe('ongoing');
  });
});
