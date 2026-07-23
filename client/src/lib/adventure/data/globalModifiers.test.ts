import { describe, expect, test } from 'bun:test';
import { GLOBAL_MODIFIER_POOL, rollGlobalModifier } from './globalModifiers';

describe('globalModifiers module', () => {
  test('GLOBAL_MODIFIER_POOL elements should have unique IDs and valid modifier stats', () => {
    const ids = new Set<string>();
    for (const def of GLOBAL_MODIFIER_POOL) {
      expect(ids.has(def.id)).toBe(false);
      ids.add(def.id);
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(Object.keys(def.modifier).length).toBeGreaterThan(0);
    }
  });

  test('rollGlobalModifier should return item from pool based on rng output', () => {
    const item0 = rollGlobalModifier(() => 0);
    expect(item0).toBe(GLOBAL_MODIFIER_POOL[0]!);

    const itemLast = rollGlobalModifier(() => 0.999);
    expect(itemLast).toBe(GLOBAL_MODIFIER_POOL[GLOBAL_MODIFIER_POOL.length - 1]!);
  });
});
