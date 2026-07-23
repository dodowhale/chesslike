import { describe, expect, test } from 'bun:test';
import { UNLOCK_TREE, findUnlock } from './unlocks';

describe('unlocks module', () => {
  test('UNLOCK_TREE entries should have valid structure and unique IDs', () => {
    const ids = new Set<string>();
    for (const entry of UNLOCK_TREE) {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);

      expect(['character', 'item', 'bonus']).toContain(entry.category);
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.cost).toBeGreaterThan(0);
      expect(entry.effectKey).toBeTruthy();
    }
  });

  test('findUnlock should return correct unlock entry or undefined', () => {
    const assassins = findUnlock('unlock-assassins');
    expect(assassins).toBeDefined();
    expect(assassins?.effectKey).toBe('assassins');
    expect(assassins?.cost).toBe(50);

    const missing = findUnlock('non-existent-unlock-id');
    expect(missing).toBeUndefined();
  });
});
