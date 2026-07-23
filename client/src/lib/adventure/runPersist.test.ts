import { describe, test, expect, beforeEach } from 'bun:test';
import { loadPersistedRun, persistRun, clearPersistedRun } from './runPersist';
import { kvDel } from '@/lib/storage/kv';
import type { AdventureRunState } from '@shared/adventure';

const mockStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: (key: string) => {
      mockStorage.delete(key);
    },
    clear: () => {
      mockStorage.clear();
    },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    length: 0,
  };
}

describe('runPersist module', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await kvDel('adventure:run');
  });

  test('should return undefined when no persisted run exists', async () => {
    const run = await loadPersistedRun();
    expect(run).toBeUndefined();
  });

  test('should persist and load run state', async () => {
    const runState: AdventureRunState = {
      characterId: 'warrior',
      act: 1,
      currentNodeId: 'node-1',
      starShardsThisRun: 10,
      gold: 50,
      inventory: [],
      pieces: [],
      map: [],
      globalModifiers: [],
    };

    await persistRun(runState);
    const loaded = await loadPersistedRun();
    expect(loaded).toEqual(runState);
  });

  test('should clear persisted run', async () => {
    const runState: AdventureRunState = {
      characterId: 'warrior',
      act: 1,
      currentNodeId: 'node-1',
      starShardsThisRun: 0,
      gold: 0,
      inventory: [],
      pieces: [],
      map: [],
      globalModifiers: [],
    };

    await persistRun(runState);
    expect(await loadPersistedRun()).toBeDefined();

    await clearPersistedRun();
    expect(await loadPersistedRun()).toBeUndefined();
  });
});
