import { describe, test, expect } from 'bun:test';
import {
  DIFFICULTY_PRESETS,
  presetByKey,
  resolveDifficulty,
} from './SingleDifficulty';

describe('SingleDifficulty module', () => {
  test('should retrieve difficulty preset by key', () => {
    const preset = presetByKey('amateur');
    expect(preset.key).toBe('amateur');
    expect(preset.uciElo).toBe(1300);
    expect(preset.skillLevel).toBe(5);

    expect(() => presetByKey('unknown' as any)).toThrow();
  });

  test('should contain 5 presets', () => {
    expect(DIFFICULTY_PRESETS.length).toBe(5);
    const keys = DIFFICULTY_PRESETS.map((p) => p.key);
    expect(keys).toEqual(['novice', 'amateur', 'intermediate', 'advanced', 'master']);
  });

  test('should resolve preset difficulty options for Stockfish', () => {
    const resolved = resolveDifficulty({
      difficulty: 'intermediate',
      hintsEnabled: true,
      undoLimit: -1,
      playerColor: 'w',
      timeControl: { kind: 'unlimited' },
    });

    expect(resolved.thinkMs).toBe(1200);
    expect(resolved.uciOptions).toEqual({
      uciElo: 1600,
      skillLevel: 10,
      limitStrength: true,
    });
  });

  test('should resolve custom difficulty options correctly', () => {
    const resolved = resolveDifficulty({
      difficulty: 'custom',
      hintsEnabled: false,
      undoLimit: 3,
      elo: 1850,
      contempt: 20,
      thinkMs: 1500,
      playerColor: 'w',
      timeControl: { kind: 'unlimited' },
    });

    expect(resolved.thinkMs).toBe(1500);
    expect(resolved.uciOptions).toEqual({
      uciElo: 1850,
      contempt: 20,
      limitStrength: true,
    });
  });
});
