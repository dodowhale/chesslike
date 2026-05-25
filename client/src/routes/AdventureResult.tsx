import { Show, createSignal, onMount } from 'solid-js';
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
import { recordRunEnd } from '@/lib/storage/runStatsRepo';
import type { AchievementDef } from '@/lib/adventure/data/achievements';

interface ActSummary {
  act: 1 | 2 | 3;
  completed: number;
  total: number;
}

export default function AdventureResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const outcome = () =>
    location.query.outcome === 'victory' ? 'victory' : 'defeat';
  const [unlocked, setUnlocked] = createSignal<AchievementDef[]>([]);

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
    // RunStats 누적 (시작 골드 50 + permanentBonus.startGold는 "획득"이 아님)
    const startingGold = 50 + (meta.permanentBonuses.startGold ?? 0);
    const stats = await recordRunEnd(run, outcome(), startingGold);
    // 도전과제 평가 + 자동 잠금해제 + 보상 적립.
    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, outcome(), meta, stats);
    for (const a of newlyUnlocked) {
      meta.unlockedLocations.push(a.id);
      meta.totalStarShards += a.reward;
    }
    await saveMetaProgress(meta);
    setUnlocked(newlyUnlocked);

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

  function actSummaries(run: NonNullable<typeof gameStore.adventure>): ActSummary[] {
    const acts: (1 | 2 | 3)[] = [1, 2, 3];
    return acts.map((act) => {
      const nodes = run.map.filter((n) => n.act === act);
      const completed = nodes.filter((n) => n.isCompleted).length;
      return { act, completed, total: nodes.length };
    });
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center px-4 py-8 gap-6">
      <span class="text-7xl">{outcome() === 'victory' ? '🏆' : '💀'}</span>
      <h1 class="text-3xl font-bold text-amber-400">
        {outcome() === 'victory' ? '런 성공 — 보스 클리어' : '런 실패'}
      </h1>
      <Show when={gameStore.adventure}>
        {(run) => (
          <div class="flex flex-col gap-4 text-center text-slate-300 text-sm w-full max-w-md">
            <div class="flex flex-col gap-1">
              <p>
                완료 노드: {run().map.filter((n) => n.isCompleted).length} /{' '}
                {run().map.length}
              </p>
              <p>잔여 골드: {run().gold}</p>
              <p>
                이번 런 별의 조각:{' '}
                <span class="text-amber-400">{run().starShardsThisRun}</span>
              </p>
            </div>

            <div class="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 flex flex-col gap-2">
              <p class="text-xs uppercase tracking-wider text-slate-400">
                막별 진행
              </p>
              <ul class="flex flex-col gap-1 text-slate-200">
                {actSummaries(run()).map((s) => (
                  <li class="flex items-center justify-between">
                    <span>{s.act}막</span>
                    <span class="font-mono tabular-nums">
                      {s.total === 0 ? '미도달' : `${s.completed} / ${s.total}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Show when={unlocked().length > 0}>
              <div class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex flex-col gap-1 text-left">
                <p class="text-xs uppercase tracking-wider text-emerald-300">
                  새로 잠금 해제된 도전과제
                </p>
                <ul class="flex flex-col gap-1 text-emerald-100">
                  {unlocked().map((a) => (
                    <li class="flex items-center justify-between">
                      <span>{a.name}</span>
                      <span class="text-amber-300 text-xs">+⭐ {a.reward}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Show>
          </div>
        )}
      </Show>
      <div class="flex gap-3">
        <Button onClick={newRun}>다음 런</Button>
        <Button variant="secondary" onClick={homewards}>
          메인 메뉴
        </Button>
      </div>
    </div>
  );
}
