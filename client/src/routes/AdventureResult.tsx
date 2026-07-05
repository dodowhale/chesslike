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
import { submitScore, reportAchievementToServer } from '@/lib/platform/serverApi';

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
  const [nickname, setNickname] = createSignal('');
  const [submitted, setSubmitted] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  onMount(async () => {
    const c = activeRun();
    if (!c) {
      navigate('/adventure', { replace: true });
      return;
    }
    const run = c.state();
    const earned = run.starShardsThisRun;
    const meta = await loadMetaProgress();
    meta.totalStarShards += earned;
    const startingGold = 50 + (meta.permanentBonuses.startGold ?? 0);
    const stats = await recordRunEnd(run, outcome(), startingGold);
    const newlyUnlocked = evaluateAchievementsOnRunEnd(run, outcome(), meta, stats);
    for (const a of newlyUnlocked) {
      meta.unlockedLocations.push(a.id);
      meta.totalStarShards += a.reward;
    }
    await saveMetaProgress(meta);
    setUnlocked(newlyUnlocked);

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

    await clearPersistedRun();
  });

  async function handleRegisterLeaderboard() {
    const name = nickname().trim();
    if (!name) {
      setErrorMessage('닉네임을 입력해주세요.');
      return;
    }
    const c = activeRun();
    if (!c) return;
    const run = c.state();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const completed = run.map.filter((n) => n.isCompleted).length;
      // 1. 점수 등록
      const success = await submitScore({
        nickname: name,
        characterId: run.characterId,
        act: run.act,
        starShards: run.starShardsThisRun,
        gold: run.gold,
        nodesCompleted: completed,
      });

      if (!success) {
        throw new Error('서버 등록에 실패했습니다.');
      }

      // 2. 획득한 도전과제가 있다면 서버에 등록
      const newlyUnlocked = unlocked();
      if (newlyUnlocked.length > 0) {
        for (const a of newlyUnlocked) {
          await reportAchievementToServer(name, a.id);
        }
      }

      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

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
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-8 gap-6">
      <div class="flex flex-col items-center gap-2">
        <span class="text-8xl animate-bounce duration-1000">{outcome() === 'victory' ? '🏆' : '💀'}</span>
        <h1 class={`text-4xl font-extrabold tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${
          outcome() === 'victory' ? 'from-yellow-400 to-amber-500' : 'from-red-400 to-rose-600'
        }`}>
          {outcome() === 'victory' ? '런 성공 — 보스 클리어' : '런 실패'}
        </h1>
      </div>

      <Show when={gameStore.adventure}>
        {(run) => (
          <div class="flex flex-col gap-5 text-slate-300 text-sm w-full max-w-md">
            {/* Stat Cards */}
            <div class="grid grid-cols-2 gap-3">
              <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
                <span class="text-xs text-slate-400 block mb-1">완료 노드</span>
                <span class="text-2xl font-bold font-mono text-slate-100">
                  {run().map.filter((n) => n.isCompleted).length} / {run().map.length}
                </span>
              </div>
              <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-center">
                <span class="text-xs text-slate-400 block mb-1">잔여 골드</span>
                <span class="text-2xl font-bold font-mono text-amber-500">🪙 {run().gold}</span>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/20 text-center">
              <span class="text-xs text-emerald-400 font-semibold uppercase tracking-wider block mb-1">획득한 별의 조각</span>
              <span class="text-3xl font-extrabold font-mono text-emerald-400">
                +⭐ {run().starShardsThisRun}
              </span>
            </div>

            {/* Act Progress Detail */}
            <div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">막별 진행</p>
              <ul class="flex flex-col gap-2 text-slate-200">
                {actSummaries(run()).map((s) => (
                  <li class="flex items-center justify-between pb-1 border-b border-slate-800/40 last:border-b-0 last:pb-0">
                    <span class="font-medium">{s.act}막</span>
                    <span class="font-mono tabular-nums text-slate-300">
                      {s.total === 0 ? '미도달' : `${s.completed} / ${s.total}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newly Unlocked Achievements */}
            <Show when={unlocked().length > 0}>
              <div class="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col gap-2">
                <p class="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  새로 잠금 해제된 도전과제
                </p>
                <ul class="flex flex-col gap-2 text-emerald-100">
                  {unlocked().map((a) => (
                    <li class="flex items-center justify-between">
                      <span class="font-medium text-slate-200">{a.name}</span>
                      <span class="text-amber-400 text-xs font-semibold font-mono">+⭐ {a.reward}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Show>

            {/* Leaderboard Submission Form */}
            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
              <h3 class="font-semibold text-slate-200 flex items-center gap-2">
                🌐 글로벌 랭킹 등록
              </h3>
              
              <Show
                when={!submitted()}
                fallback={
                  <div class="text-center py-2 text-emerald-400 font-semibold flex items-center justify-center gap-2">
                    ✅ 랭킹에 성공적으로 등록되었습니다!
                  </div>
                }
              >
                <div class="flex flex-col gap-3">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="닉네임 입력 (최대 10자)"
                      maxLength={10}
                      value={nickname()}
                      onInput={(e) => setNickname(e.currentTarget.value)}
                      class="flex-1 px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                      disabled={isSubmitting()}
                    />
                    <Button
                      onClick={handleRegisterLeaderboard}
                      disabled={isSubmitting() || !nickname().trim()}
                      class="px-5"
                    >
                      {isSubmitting() ? '등록 중...' : '등록'}
                    </Button>
                  </div>
                  <Show when={errorMessage()}>
                    <p class="text-xs text-red-400">{errorMessage()}</p>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        )}
      </Show>

      <div class="flex gap-3">
        <Button onClick={newRun} class="px-6 py-2.5">다음 런</Button>
        <Button variant="secondary" onClick={homewards} class="px-6 py-2.5">
          메인 메뉴
        </Button>
      </div>
    </div>
  );
}
