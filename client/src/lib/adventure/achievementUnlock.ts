import type { AdventureRunState, MetaProgress, RunStats } from '@shared/adventure';
import { ACHIEVEMENTS, type AchievementDef } from './data/achievements';

/**
 * 모험 런 종료 시 달성 가능한 도전과제를 평가해 새로 잠금해제할 항목을 반환.
 * 보상(별의 조각)은 호출처에서 메타에 합산한다.
 *
 * @param stats RunStats 갱신 후의 누적 통계. 누적형 도전과제(boss-slayer, legend-trio)는 이 값 기준.
 */
export function evaluateAchievementsOnRunEnd(
  run: AdventureRunState,
  outcome: 'victory' | 'defeat',
  meta: MetaProgress,
  stats?: RunStats,
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  const already = new Set(meta.unlockedLocations);

  function tryUnlock(id: string, condition: boolean): void {
    if (!condition) return;
    if (already.has(id)) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) newlyUnlocked.push(def);
  }

  const playerVictory = outcome === 'victory';
  const bossClears = run.map.filter((n) => n.type === 'boss' && n.isCompleted);
  const bossActSet = new Set(bossClears.map((n) => n.act));
  const act1Boss = bossActSet.has(1);
  const act2Boss = bossActSet.has(2);
  const act3Boss = bossActSet.has(3);
  const anyBoss = bossActSet.size > 0;

  // 단일 런 평가
  tryUnlock('first-clear', playerVictory && act1Boss);
  // no-undo-run: 무르기 카운터가 모험 run에 직접 없어 미구현 — 후속.
  tryUnlock(
    'assassins-clear',
    playerVictory && anyBoss && run.characterId === 'assassins',
  );
  tryUnlock(
    'saints-clear',
    playerVictory && anyBoss && run.characterId === 'saints',
  );
  tryUnlock('act2-clear', act2Boss);
  tryUnlock('act3-clear', act3Boss);
  tryUnlock('gold-hoarder', run.gold >= 200);

  const piecesAllAlive = run.pieces.length > 0 && run.pieces.every((p) => p.hp > 0);
  tryUnlock('flawless-act1', act1Boss && piecesAllAlive);

  const eventNodesCleared = run.map.filter((n) => n.type === 'event' && n.isCompleted).length;
  tryUnlock('event-explorer', eventNodesCleared >= 3);

  const shopNodesCleared = run.map.filter((n) => n.type === 'shop' && n.isCompleted).length;
  // 상점 노드 통과를 구매 카운터로 근사 (구매 없이 떠난 경우 과대평가될 수 있음 — MVP)
  tryUnlock('shop-spender', shopNodesCleared >= 3);

  // 아이템 수집계
  const rareCount =
    run.inventory.filter((i) => i.rarity === 'rare').length +
    run.pieces.reduce(
      (acc, p) => acc + p.items.filter((i) => i.rarity === 'rare').length,
      0,
    );
  tryUnlock('item-collector', rareCount >= 3);

  const distinctRareIds = new Set<string>();
  for (const it of run.inventory) if (it.rarity === 'rare') distinctRareIds.add(it.id);
  for (const p of run.pieces)
    for (const it of p.items) if (it.rarity === 'rare') distinctRareIds.add(it.id);
  tryUnlock('rare-trio', distinctRareIds.size >= 3);

  const hasLegendary =
    run.inventory.some((i) => i.rarity === 'legendary') ||
    run.pieces.some((p) => p.items.some((i) => i.rarity === 'legendary'));
  tryUnlock('legendary-find', hasLegendary);

  // 누적형 (RunStats 필요)
  if (stats) {
    tryUnlock('boss-slayer', stats.totalBossClears >= 3);
    tryUnlock('legend-trio', stats.totalLegendariesFound >= 3);
  }

  return newlyUnlocked;
}
