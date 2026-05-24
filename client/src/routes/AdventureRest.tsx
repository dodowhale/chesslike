import { createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';

export default function AdventureRest() {
  const navigate = useNavigate();
  const [done, setDone] = createSignal(false);

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  const king = () =>
    gameStore.adventure?.pieces.find((p) => p.side === 'w' && p.type === 'k');

  function heal() {
    const k = king();
    const c = activeRun();
    if (!k || !c) return;
    c.setPieceHp(k.id, k.hp + 20);
    setDone(true);
  }

  function upgrade() {
    // M3 MVP: 단순히 골드 +30으로 대체. 본격 아이템 강화는 후속.
    const c = activeRun();
    if (!c) return;
    c.addGold(30);
    setDone(true);
  }

  function leave() {
    activeRun()?.markCurrentNodeCompleted();
    navigate('/adventure/run/map');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={leave}>← 맵으로</Button>
        <span class="font-semibold">🏕 휴식</span>
        <span class="text-xs text-slate-400">킹 HP {king()?.hp ?? 0}</span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4 items-center">
        <p class="text-slate-300 text-center">잠시 쉬어가는 모닥불. 하나를 선택하세요.</p>
        {!done() ? (
          <div class="flex flex-col md:flex-row gap-3">
            <button
              type="button"
              onClick={heal}
              class="flex flex-col gap-2 p-4 border-2 border-emerald-500/40 bg-emerald-500/10 rounded-lg hover:border-emerald-400 min-w-[200px]"
            >
              <div class="font-semibold text-emerald-200">킹 HP +20 회복</div>
              <div class="text-xs text-slate-400">전투 회복</div>
            </button>
            <button
              type="button"
              onClick={upgrade}
              class="flex flex-col gap-2 p-4 border-2 border-amber-500/40 bg-amber-500/10 rounded-lg hover:border-amber-400 min-w-[200px]"
            >
              <div class="font-semibold text-amber-200">골드 +30</div>
              <div class="text-xs text-slate-400">상점/이벤트 대비</div>
            </button>
          </div>
        ) : (
          <Button onClick={leave}>맵으로</Button>
        )}
      </main>
    </div>
  );
}
