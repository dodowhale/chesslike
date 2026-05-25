import { Show, createResource } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { loadRunStats } from '@/lib/storage/runStatsRepo';

export default function StatsRoute() {
  const navigate = useNavigate();
  const [stats] = createResource(loadRunStats);
  const dict = () => t();

  const winRate = () => {
    const s = stats();
    if (!s || s.totalRuns === 0) return 0;
    return Math.round((s.totalVictories / s.totalRuns) * 100);
  };

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← {dict().stats.back}
          </Button>
          <span class="font-semibold">📊 {dict().stats.title}</span>
        </div>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <Show
          when={stats() && stats()!.totalRuns > 0}
          fallback={
            <p class="text-sm text-slate-400 text-center py-12">
              {dict().stats.emptyHint}
            </p>
          }
        >
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label={dict().stats.totalRuns} value={String(stats()!.totalRuns)} />
            <StatCard
              label={dict().stats.totalVictories}
              value={String(stats()!.totalVictories)}
            />
            <StatCard label={dict().stats.winRate} value={`${winRate()}%`} />
            <StatCard
              label={dict().stats.bossClears}
              value={String(stats()!.totalBossClears)}
            />
            <StatCard
              label={dict().stats.goldEarned}
              value={String(stats()!.totalGoldEarned)}
            />
            <StatCard
              label={dict().stats.nodesCompleted}
              value={String(stats()!.totalNodesCompleted)}
            />
            <StatCard
              label={dict().stats.legendaries}
              value={String(stats()!.totalLegendariesFound)}
            />
            <StatCard
              label={dict().stats.shopPurchases}
              value={String(stats()!.totalShopPurchases)}
            />
          </div>

          <div class="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 flex flex-col gap-2">
            <p class="text-xs uppercase tracking-wider text-slate-400">
              {dict().stats.bossClearsByAct}
            </p>
            <ul class="flex flex-col gap-1 text-slate-200 text-sm">
              <li class="flex items-center justify-between">
                <span>1막</span>
                <span class="font-mono tabular-nums">
                  {stats()!.bossClearsByAct.act1}
                </span>
              </li>
              <li class="flex items-center justify-between">
                <span>2막</span>
                <span class="font-mono tabular-nums">
                  {stats()!.bossClearsByAct.act2}
                </span>
              </li>
              <li class="flex items-center justify-between">
                <span>3막</span>
                <span class="font-mono tabular-nums">
                  {stats()!.bossClearsByAct.act3}
                </span>
              </li>
            </ul>
          </div>
        </Show>
      </main>
    </div>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div class="flex flex-col gap-1 p-3 rounded-lg border border-slate-700 bg-slate-900/80">
      <span class="text-xs text-slate-400">{props.label}</span>
      <span class="text-2xl font-bold text-slate-100 font-mono tabular-nums">
        {props.value}
      </span>
    </div>
  );
}
