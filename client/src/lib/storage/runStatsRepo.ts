import type { AdventureRunState, RunStats } from '@shared/adventure';
import { kvGet, kvSet } from './kv';

const KEY = 'meta:runStats';

const DEFAULT_STATS: RunStats = {
  totalRuns: 0,
  totalVictories: 0,
  totalBossClears: 0,
  totalGoldEarned: 0,
  totalNodesCompleted: 0,
  totalLegendariesFound: 0,
  totalShopPurchases: 0,
  bossClearsByAct: { act1: 0, act2: 0, act3: 0 },
};

export async function loadRunStats(): Promise<RunStats> {
  const stored = await kvGet<RunStats>(KEY);
  if (!stored) return { ...DEFAULT_STATS, bossClearsByAct: { ...DEFAULT_STATS.bossClearsByAct } };
  return {
    ...DEFAULT_STATS,
    ...stored,
    bossClearsByAct: { ...DEFAULT_STATS.bossClearsByAct, ...stored.bossClearsByAct },
  };
}

export async function saveRunStats(stats: RunStats): Promise<void> {
  await kvSet(KEY, stats);
}

/**
 * 모험 런 종료 시 누적 통계를 갱신한다.
 * - victory 여부와 도달한 보스 노드들을 막별로 카운트
 * - 인벤토리·기물의 Legendary 보유분 합산
 * - run 종료 시점의 골드를 totalGoldEarned에 누적 (시작 골드 포함되므로 보너스 베이스라인을 차감)
 */
export async function recordRunEnd(
  run: AdventureRunState,
  outcome: 'victory' | 'defeat',
  startingGold = 0,
): Promise<RunStats> {
  const stats = await loadRunStats();
  stats.totalRuns += 1;
  if (outcome === 'victory') stats.totalVictories += 1;
  stats.totalNodesCompleted += run.map.filter((n) => n.isCompleted).length;
  // 시작 골드(런 시작 시 지급분)는 "획득"으로 보지 않음. 누적 보상 골드만 합산.
  const earnedDuringRun = Math.max(0, run.gold - startingGold);
  stats.totalGoldEarned += earnedDuringRun;
  const legendaryCount =
    run.inventory.filter((i) => i.rarity === 'legendary').length +
    run.pieces.reduce(
      (acc, p) => acc + p.items.filter((i) => i.rarity === 'legendary').length,
      0,
    );
  stats.totalLegendariesFound += legendaryCount;
  for (const node of run.map) {
    if (node.type === 'boss' && node.isCompleted) {
      stats.totalBossClears += 1;
      if (node.act === 1) stats.bossClearsByAct.act1 += 1;
      else if (node.act === 2) stats.bossClearsByAct.act2 += 1;
      else if (node.act === 3) stats.bossClearsByAct.act3 += 1;
    }
  }
  await saveRunStats(stats);
  return stats;
}

/** 상점 구매 시 호출. AdventureShop에서 hook. */
export async function recordShopPurchase(): Promise<void> {
  const stats = await loadRunStats();
  stats.totalShopPurchases += 1;
  await saveRunStats(stats);
}
