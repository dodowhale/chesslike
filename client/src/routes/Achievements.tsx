import { For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { ACHIEVEMENTS } from '@/lib/adventure/data/achievements';
import { ensureMetaLoaded, metaSignal } from '@/store/metaStore';

export default function AchievementsRoute() {
  const navigate = useNavigate();

  onMount(() => {
    void ensureMetaLoaded();
  });

  function isUnlocked(id: string): boolean {
    return metaSignal()?.unlockedLocations.includes(id) ?? false;
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← 메인 메뉴
          </Button>
          <span class="font-semibold">🏆 도전과제</span>
        </div>
        <span class="text-sm text-amber-400">
          ⭐ <span class="font-mono tabular-nums">{metaSignal()?.totalStarShards ?? 0}</span>
        </span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-3">
        <p class="text-sm text-slate-400 mb-2">
          모험 런 종료 시 자동으로 조건을 평가합니다.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <For each={ACHIEVEMENTS}>
            {(a) => (
              <div
                class={`flex flex-col gap-2 p-3 rounded-lg border ${
                  isUnlocked(a.id)
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-slate-100">{a.name}</span>
                  <Show
                    when={isUnlocked(a.id)}
                    fallback={<span class="text-xs text-amber-400">⭐ {a.reward}</span>}
                  >
                    <span class="text-xs text-emerald-400">달성 ✓</span>
                  </Show>
                </div>
                <p class="text-xs text-slate-300">{a.description}</p>
              </div>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
