import { Show, createResource, createSignal, For } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { loadRunStats } from '@/lib/storage/runStatsRepo';
import { fetchLeaderboard } from '@/lib/platform/serverApi';
import { settings } from '@/store/settingsStore';

export default function StatsRoute() {
  const navigate = useNavigate();
  const [stats] = createResource(loadRunStats);
  const [leaderboard, { refetch }] = createResource(() => fetchLeaderboard(20));
  const [activeTab, setActiveTab] = createSignal<'local' | 'global'>('local');
  const dict = () => t();

  const winRate = () => {
    const s = stats();
    if (!s || s.totalRuns === 0) return 0;
    return Math.round((s.totalVictories / s.totalRuns) * 100);
  };

  const getCharacterName = (id: string) => {
    switch (id) {
      case 'standard':
        return settings.locale === 'ko' ? '정규단' : 'Standard';
      case 'assassins':
        return settings.locale === 'ko' ? '암살자단' : 'Assassins';
      case 'saints':
        return settings.locale === 'ko' ? '신성단' : 'Saints';
      default:
        return id;
    }
  };

  return (
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <Button variant="ghost" class="hover:bg-slate-800 text-slate-300" onClick={() => navigate('/')}>
            ← {dict().stats.back}
          </Button>
          <span class="font-bold text-lg tracking-wide bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            📊 {dict().stats.title}
          </span>
        </div>
      </header>

      <main class="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Tab Buttons */}
        <div class="flex p-1 rounded-xl bg-slate-900 border border-slate-800 w-fit self-center">
          <button
            class={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab() === 'local'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('local')}
          >
            {dict().stats.title}
          </button>
          <button
            class={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab() === 'global'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => {
              setActiveTab('global');
              refetch();
            }}
          >
            {dict().stats.leaderboardTitle}
          </button>
        </div>

        <Show when={activeTab() === 'local'}>
          {/* Local Stats Tab */}
          <Show
            when={stats() && stats()!.totalRuns > 0}
            fallback={
              <div class="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
                <span class="text-4xl mb-4">💤</span>
                <p class="text-sm text-slate-400 text-center max-w-sm">
                  {dict().stats.emptyHint}
                </p>
              </div>
            }
          >
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label={dict().stats.totalRuns} value={String(stats()!.totalRuns)} icon="🏁" />
              <StatCard label={dict().stats.totalVictories} value={String(stats()!.totalVictories)} icon="🏆" />
              <StatCard label={dict().stats.winRate} value={`${winRate()}%`} icon="📈" gradient />
              <StatCard label={dict().stats.bossClears} value={String(stats()!.totalBossClears)} icon="👾" />
              <StatCard label={dict().stats.goldEarned} value={String(stats()!.totalGoldEarned)} icon="🪙" />
              <StatCard label={dict().stats.nodesCompleted} value={String(stats()!.totalNodesCompleted)} icon="📍" />
              <StatCard label={dict().stats.legendaries} value={String(stats()!.totalLegendariesFound)} icon="✨" />
              <StatCard label={dict().stats.shopPurchases} value={String(stats()!.totalShopPurchases)} icon="🛒" />
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm p-6 flex flex-col gap-4">
              <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                🎯 {dict().stats.bossClearsByAct}
              </h3>
              <ul class="flex flex-col gap-3 text-slate-200 text-sm">
                <li class="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span class="font-medium">1막 (Act 1 Boss)</span>
                  <span class="font-mono tabular-nums text-emerald-400 font-semibold">{stats()!.bossClearsByAct.act1}</span>
                </li>
                <li class="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <span class="font-medium">2막 (Act 2 Boss)</span>
                  <span class="font-mono tabular-nums text-emerald-400 font-semibold">{stats()!.bossClearsByAct.act2}</span>
                </li>
                <li class="flex items-center justify-between">
                  <span class="font-medium">3막 (Final Boss)</span>
                  <span class="font-mono tabular-nums text-emerald-400 font-semibold">{stats()!.bossClearsByAct.act3}</span>
                </li>
              </ul>
            </div>
          </Show>
        </Show>

        <Show when={activeTab() === 'global'}>
          {/* Global Leaderboard Tab */}
          <div class="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden flex flex-col">
            <div class="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-200">{dict().stats.leaderboardTitle}</h2>
              <Button variant="ghost" class="text-xs text-teal-400 hover:text-teal-300" onClick={() => refetch()}>
                🔄 Refresh
              </Button>
            </div>
            
            <Show
              when={!leaderboard.loading}
              fallback={
                <div class="py-20 flex flex-col items-center justify-center gap-3">
                  <div class="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-sm text-slate-400">Loading Leaderboard...</span>
                </div>
              }
            >
              <Show
                when={leaderboard() && leaderboard()!.length > 0}
                fallback={
                  <div class="py-20 text-center text-sm text-slate-400">
                    {dict().stats.noLeaderboard}
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr class="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                        <th class="py-3 px-4 w-16 text-center">{dict().stats.rank}</th>
                        <th class="py-3 px-4">{dict().stats.nickname}</th>
                        <th class="py-3 px-4">{dict().stats.character}</th>
                        <th class="py-3 px-4 text-center">{dict().stats.progress}</th>
                        <th class="py-3 px-4 text-center">{dict().stats.score}</th>
                        <th class="py-3 px-4 text-right">🪙 Gold</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/50">
                      <For each={leaderboard()}>
                        {(entry, index) => {
                          const isTop3 = index() < 3;
                          const rankColor = () => {
                            if (index() === 0) return 'text-yellow-400 font-bold';
                            if (index() === 1) return 'text-slate-300 font-bold';
                            if (index() === 2) return 'text-amber-600 font-bold';
                            return 'text-slate-400 font-mono';
                          };
                          const rankBadge = () => {
                            if (index() === 0) return '👑 ';
                            if (index() === 1) return '🥈 ';
                            if (index() === 2) return '🥉 ';
                            return '';
                          };
                          return (
                            <tr class={`hover:bg-slate-800/30 transition-colors duration-150 ${isTop3 ? 'bg-emerald-950/5' : ''}`}>
                              <td class={`py-4 px-4 text-center ${rankColor()}`}>
                                {rankBadge()}{index() + 1}
                              </td>
                              <td class="py-4 px-4 font-semibold text-slate-200">
                                {entry.nickname}
                              </td>
                              <td class="py-4 px-4 text-slate-300">
                                {getCharacterName(entry.character_id)}
                              </td>
                              <td class="py-4 px-4 text-center font-mono font-semibold text-emerald-400">
                                Act {entry.act}
                              </td>
                              <td class="py-4 px-4 text-center font-mono">
                                {entry.nodes_completed}
                              </td>
                              <td class="py-4 px-4 text-right font-mono text-amber-500 font-semibold">
                                {entry.gold}
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </Show>
          </div>
        </Show>
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  gradient?: boolean;
}

function StatCard(props: StatCardProps) {
  return (
    <div
      class={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        props.gradient
          ? 'border-emerald-500/20 bg-gradient-to-br from-slate-900 to-emerald-950/40 hover:shadow-emerald-950/10'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700/80'
      }`}
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-semibold text-slate-400 tracking-wider uppercase">{props.label}</span>
        <span class="text-lg opacity-80">{props.icon}</span>
      </div>
      <span class="text-3xl font-extrabold text-slate-100 font-mono tracking-tight tabular-nums">
        {props.value}
      </span>
    </div>
  );
}
