import { describe, expect, test } from 'bun:test';
import { ensureMetaLoaded, updateMeta, getMeta } from './metaStore';

describe('metaStore', () => {
  test('should load meta progress and update signal', async () => {
    const meta = await ensureMetaLoaded();
    expect(meta).toBeDefined();
    expect(meta.unlockedCharacters).toContain('standard');
    expect(getMeta()).toEqual(meta);
  });

  test('should update meta progress and persist', async () => {
    const current = await ensureMetaLoaded();
    const nextMeta = {
      ...current,
      totalStarShards: 50,
      unlockedCharacters: ['standard', 'assassins'],
    };

    await updateMeta(nextMeta);
    expect(getMeta()?.totalStarShards).toBe(50);
    expect(getMeta()?.unlockedCharacters).toEqual(['standard', 'assassins']);
  });
});
