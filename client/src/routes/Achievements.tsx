import { For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { ACHIEVEMENTS } from '@/lib/adventure/data/achievements';
import { ensureMetaLoaded, metaSignal } from '@/store/metaStore';
import { t } from '@/lib/i18n';

export default function AchievementsRoute() {
  const navigate = useNavigate();
  const dict = () => t();

  onMount(() => {
    void ensureMetaLoaded();
  });

  function isUnlocked(id: string): boolean {
    return metaSignal()?.unlockedLocations.includes(id) ?? false;
  }

  return (
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <Button variant="ghost" class="hover:bg-slate-800 text-slate-300" onClick={() => navigate('/')}>
            ← {dict().achievements.back}
          </Button>
          <span class="font-bold text-lg tracking-wide bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            🏆 {dict().achievements.title}
          </span>
        </div>
        <span class="text-sm text-amber-400 font-medium">
          ⭐ <span class="font-mono tabular-nums">{metaSignal()?.totalStarShards ?? 0}</span>
        </span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-3">
        <p class="text-sm text-slate-400 mb-2">
          {dict().achievements.hint}
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <For each={ACHIEVEMENTS}>
            {(a) => (
              <div
                class={`flex flex-col gap-2 p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                  isUnlocked(a.id)
                    ? 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700/80'
                }`}
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-100">{a.name}</span>
                  <Show
                    when={isUnlocked(a.id)}
                    fallback={<span class="text-xs font-semibold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full">⭐ {a.reward}</span>}
                  >
                    <span class="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">{dict().achievements.achieved}</span>
                  </Show>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">{a.description}</p>
              </div>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
