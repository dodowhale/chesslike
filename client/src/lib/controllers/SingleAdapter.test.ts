import { describe, expect, test } from 'bun:test';
import { SingleAdapter } from './SingleAdapter';
import { gameStore, resetBoard, setMode } from '@/store/gameStore';
import type { ClassicConfig } from '@shared/classic';

describe('SingleAdapter', () => {
  const defaultConfig: ClassicConfig = {
    submode: 'single',
    single: {
      playerColor: 'w',
      difficulty: 'intermediate',
      hintsEnabled: true,
      undoLimit: 3,
      timeControl: { kind: 'unlimited' },
    },
  };

  test('should handle undo limits', () => {
    setMode('classic');
    resetBoard();

    const adapter = new SingleAdapter(defaultConfig);

    // Initial undos count is 0
    expect(gameStore.ui.undosUsed).toBe(0);

    // If no moves made, requestUndo should not increment
    adapter.requestUndo();
    expect(gameStore.ui.undosUsed).toBe(0);
  });
});
