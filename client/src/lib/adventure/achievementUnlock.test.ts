import { describe, expect, it } from 'bun:test';
import { evaluateAchievementsOnRunEnd } from './achievementUnlock';
import type { AdventureRunState, MetaProgress, RunStats, Item, Piece, MapNode } from '@shared/adventure';

describe('achievementUnlock', () => {
  const baseMeta: MetaProgress = {
    totalStarShards: 0,
    unlockedCharacters: ['standard'],
    unlockedItems: [],
    unlockedItemPools: [],
    unlockedLocations: [], // 이미 해금된 도전과제 ID 목록
    permanentBonuses: {},
  };

  const createBaseRunState = (overrides?: Partial<AdventureRunState>): AdventureRunState => ({
    characterId: 'standard',
    act: 1,
    currentNodeId: 'a1-n7',
    map: [],
    pieces: [],
    inventory: [],
    globalModifiers: [],
    gold: 0,
    starShardsThisRun: 0,
    ...overrides,
  });

  const createBossNode = (act: 1 | 2 | 3, isCompleted: boolean): MapNode => ({
    id: `a${act}-boss`,
    type: 'boss',
    act,
    isCompleted,
    nextNodes: [],
  });

  it('should unlock first-clear when defeating act 1 boss', () => {
    const run = createBaseRunState({
      map: [createBossNode(1, true)],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'victory', baseMeta);
    const unlockedIds = newlyUnlocked.map((a) => a.id);

    expect(unlockedIds).toContain('first-clear');
  });

  it('should unlock no-undo-run when defeating act 1 boss', () => {
    const run = createBaseRunState({
      map: [createBossNode(1, true)],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'victory', baseMeta);
    const unlockedIds = newlyUnlocked.map((a) => a.id);

    expect(unlockedIds).toContain('no-undo-run');
  });

  it('should not unlock first-clear if player lost', () => {
    const run = createBaseRunState({
      map: [createBossNode(1, true)],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', baseMeta);
    const unlockedIds = newlyUnlocked.map((a) => a.id);

    expect(unlockedIds).not.toContain('first-clear');
  });

  it('should unlock character-specific achievements', () => {
    const assassinsRun = createBaseRunState({
      characterId: 'assassins',
      map: [createBossNode(1, true)],
    });

    const unlockedForAssassins = evaluateAchievementsOnRunEnd(assassinsRun, 'victory', baseMeta);
    expect(unlockedForAssassins.map((a) => a.id)).toContain('assassins-clear');

    const saintsRun = createBaseRunState({
      characterId: 'saints',
      map: [createBossNode(2, true)],
    });

    const unlockedForSaints = evaluateAchievementsOnRunEnd(saintsRun, 'victory', baseMeta);
    expect(unlockedForSaints.map((a) => a.id)).toContain('saints-clear');
  });

  it('should unlock gold-hoarder when gold is 200 or more', () => {
    const run = createBaseRunState({ gold: 200 });
    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', baseMeta);
    expect(newlyUnlocked.map((a) => a.id)).toContain('gold-hoarder');
  });

  it('should unlock flawless-act1 if act 1 boss is completed and all pieces are alive', () => {
    const livePiece: Piece = {
      id: 'p1',
      type: 'p',
      side: 'w',
      hp: 10,
      maxHp: 10,
      attack: 2,
      items: [],
    };

    const run = createBaseRunState({
      map: [createBossNode(1, true)],
      pieces: [livePiece],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'victory', baseMeta);
    expect(newlyUnlocked.map((a) => a.id)).toContain('flawless-act1');
  });

  it('should unlock item-collector and rare-trio when holding 3 rare items', () => {
    const rareItem1: Item = { id: 'item1', name: 'Rare 1', rarity: 'rare', category: 'stat', description: '', modifier: {} };
    const rareItem2: Item = { id: 'item2', name: 'Rare 2', rarity: 'rare', category: 'stat', description: '', modifier: {} };
    const rareItem3: Item = { id: 'item3', name: 'Rare 3', rarity: 'rare', category: 'stat', description: '', modifier: {} };

    const run = createBaseRunState({
      inventory: [rareItem1, rareItem2],
      pieces: [
        {
          id: 'p1',
          type: 'p',
          side: 'w',
          hp: 10,
          maxHp: 10,
          attack: 2,
          items: [rareItem3],
        },
      ],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', baseMeta);
    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain('item-collector');
    expect(ids).toContain('rare-trio');
  });

  it('should unlock legendary-find when legendary item is acquired', () => {
    const legendaryItem: Item = { id: 'legendary1', name: 'Legendary Item', rarity: 'legendary', category: 'passive', description: '', modifier: {} };
    const run = createBaseRunState({
      inventory: [legendaryItem],
    });

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', baseMeta);
    expect(newlyUnlocked.map((a) => a.id)).toContain('legendary-find');
  });

  it('should unlock run-stats cumulative achievements like boss-slayer and legend-trio', () => {
    const run = createBaseRunState();
    const stats: RunStats = {
      totalRuns: 10,
      totalVictories: 2,
      totalBossClears: 3,
      totalGoldEarned: 500,
      totalNodesCompleted: 50,
      totalLegendariesFound: 4,
      totalShopPurchases: 10,
      bossClearsByAct: { act1: 2, act2: 1, act3: 0 },
    };

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', baseMeta, stats);
    const ids = newlyUnlocked.map((a) => a.id);
    expect(ids).toContain('boss-slayer');
    expect(ids).toContain('legend-trio');
  });

  it('should not unlock achievements that are already unlocked in meta progress', () => {
    const run = createBaseRunState({ gold: 300 });
    const metaWithGoldHoarder: MetaProgress = {
      ...baseMeta,
      unlockedLocations: ['gold-hoarder'],
    };

    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, 'defeat', metaWithGoldHoarder);
    expect(newlyUnlocked.map((a) => a.id)).not.toContain('gold-hoarder');
  });
});
