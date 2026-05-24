import { Show, onMount } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun, setActiveRun } from '@/store/adventureStore';
import {
  gameStore,
  loadMetaProgress,
  saveMetaProgress,
  setAdventureRun,
} from '@/store/gameStore';
import { makeId, saveHistoryEntry } from '@/lib/storage/historyRepo';
import { clearPersistedRun } from '@/lib/adventure/runPersist';
import { evaluateAchievementsOnRunEnd } from '@/lib/adventure/achievementUnlock';

export default function AdventureResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const outcome = () =>
    location.query.outcome === 'victory' ? 'victory' : 'defeat';

  onMount(async () => {
    const c = activeRun();
    if (!c) {
      navigate('/adventure', { replace: true });
      return;
    }
    const run = c.state();
    // SPEC §8.1: 노드 클리어 시점에 별의 조각이 이미 적립됨. 정산은 그 누계를
    // 메타에 합산할 뿐. 승패에 따른 배율 없음 (실패 런이어도 도달한 만큼).
    const earned = run.starShardsThisRun;
    const meta = await loadMetaProgress();
    meta.totalStarShards += earned;
    // 도전과제 평가 + 자동 잠금해제 + 보상 적립.
    const unlocked = evaluateAchievementsOnRunEnd(run, outcome(), meta);
    for (const a of unlocked) {
      meta.unlockedLocations.push(a.id);
      meta.totalStarShards += a.reward;
    }
    await saveMetaProgress(meta);

    // 모험 결과를 클래식과 같은 HistoryEntry 슬롯에 저장.
    const completed = run.map.filter((n) => n.isCompleted).length;
    void saveHistoryEntry({
      id: makeId(),
      createdAt: Date.now(),
      mode: 'adventure',
      difficulty: run.characterId,
      result: outcome() === 'victory' ? '1-0' : '0-1',
      resultDetail: outcome(),
      pgn: '',
      movesCount: completed,
    });

    // 패배 후에는 이어하기 불가 (ADVENTURE.md §9). 승리도 런 종료 후 폐기.
    await clearPersistedRun();
  });

  function homewards() {
    setActiveRun(undefined);
    setAdventureRun(undefined);
    navigate('/');
  }

  function newRun() {
    setActiveRun(undefined);
    setAdventureRun(undefined);
    navigate('/adventure');
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <span class="text-7xl">{outcome() === 'victory' ? '🏆' : '💀'}</span>
      <h1 class="text-3xl font-bold text-amber-400">
        {outcome() === 'victory' ? '런 성공 — 1막 클리어' : '런 실패'}
      </h1>
      <div class="flex flex-col gap-1 text-center text-slate-300 text-sm">
        <Show when={gameStore.adventure}>
          {(run) => (
            <>
              <p>
                완료 노드: {run().map.filter((n) => n.isCompleted).length} /{' '}
                {run().map.length}
              </p>
              <p>골드: {run().gold}</p>
              <p>
                이번 런 별의 조각:{' '}
                <span class="text-amber-400">{run().starShardsThisRun}</span>
              </p>
            </>
          )}
        </Show>
      </div>
      <div class="flex gap-3">
        <Button onClick={newRun}>다음 런</Button>
        <Button variant="secondary" onClick={homewards}>
          메인 메뉴
        </Button>
      </div>
    </div>
  );
}
