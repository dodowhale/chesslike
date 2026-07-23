import { describe, test, expect, beforeEach } from 'bun:test';
import { loadRunStats, saveRunStats, recordRunEnd, recordShopPurchase } from './runStatsRepo';
import { kvDel } from './kv';
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

describe('runStatsRepo module', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await kvDel('meta:runStats');
  });

  test('should return default stats when uninitialized', async () => {
    const stats = await loadRunStats();
    expect(stats.totalRuns).toBe(0);
    expect(stats.totalVictories).toBe(0);
    expect(stats.totalBossClears).toBe(0);
    expect(stats.bossClearsByAct).toEqual({ act1: 0, act2: 0, act3: 0 });
  });

  test('should record run end outcome, gold, boss clears, and legendaries correctly', async () => {
    const dummyRun: AdventureRunState = {
      characterId: 'standard',
      act: 1,
      currentNodeId: 'node-boss-1',
      starShardsThisRun: 5,
      gold: 150, // earned 100 net if startingGold was 50
      inventory: [
        { id: 'rel-1', name: 'Legendary Relic', rarity: 'legendary', category: 'passive', description: '', modifier: {} },
      ],
      pieces: [
        {
          id: 'p-1',
          type: 'q',
          side: 'w',
          hp: 20,
          maxHp: 20,
          attack: 10,
          items: [
            { id: 'rel-2', name: 'Legendary Weapon', rarity: 'legendary', category: 'stat', description: '', modifier: {} },
          ],
        },
      ],
      globalModifiers: [],
      map: [
        { id: 'node-1', act: 1, type: 'battle', isCompleted: true, nextNodes: [] },
        { id: 'node-boss-1', act: 1, type: 'boss', isCompleted: true, nextNodes: [] },
      ],
    };

    const stats = await recordRunEnd(dummyRun, 'victory', 50);

    expect(stats.totalRuns).toBe(1);
    expect(stats.totalVictories).toBe(1);
    expect(stats.totalNodesCompleted).toBe(2);
    expect(stats.totalGoldEarned).toBe(100); // 150 - 50 = 100
    expect(stats.totalLegendariesFound).toBe(2); // 1 in inventory + 1 on piece
    expect(stats.totalBossClears).toBe(1);
    expect(stats.bossClearsByAct.act1).toBe(1);
  });

  test('should record shop purchases', async () => {
    await recordShopPurchase();
    await recordShopPurchase();
    const stats = await loadRunStats();
    expect(stats.totalShopPurchases).toBe(2);
  });
});
