import type { AdventureRunState, MetaProgress } from '@shared/adventure';
import { ACHIEVEMENTS, type AchievementDef } from './data/achievements';

/**
 * 모험 런 종료 시 달성 가능한 도전과제를 평가해 새로 잠금해제할 항목을 반환.
 * 보상(별의 조각)은 호출처에서 메타에 합산한다.
 */
export function evaluateAchievementsOnRunEnd(
  run: AdventureRunState,
  outcome: 'victory' | 'defeat',
  meta: MetaProgress,
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
  // first-clear: 첫 1막 보스 클리어 (victory + 보스 클리어 노드)
  const bossCompleted = run.map.some((n) => n.type === 'boss' && n.isCompleted);
  tryUnlock('first-clear', playerVictory && bossCompleted);

  // no-undo-run: 보스 클리어 + 무르기 0회 (모험에는 무르기 카운터가 store에 있지만
  // run에는 직접 없음. 현재 MVP는 victory 시점에는 별도 추적이 없으므로 보수적으로
  // 적용 X — 후속 작업).
  // assassins-clear
  tryUnlock(
    'assassins-clear',
    playerVictory && bossCompleted && run.characterId === 'assassins',
  );
  // item-collector: Rare 등급 3개 보유
  const rareCount = run.inventory.filter((i) => i.rarity === 'rare').length +
    run.pieces.reduce((acc, p) => acc + p.items.filter((i) => i.rarity === 'rare').length, 0);
  tryUnlock('item-collector', rareCount >= 3);
  // legendary-find
  const hasLegendary =
    run.inventory.some((i) => i.rarity === 'legendary') ||
    run.pieces.some((p) => p.items.some((i) => i.rarity === 'legendary'));
  tryUnlock('legendary-find', hasLegendary);

  return newlyUnlocked;
}
