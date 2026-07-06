import { For, Show, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { MetaProgress } from '@shared/adventure';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  UNLOCK_TREE,
  type UnlockCategory,
  type UnlockEntry,
} from '@/lib/adventure/data/unlocks';
import { ensureMetaLoaded, metaSignal, updateMeta } from '@/store/metaStore';
import { t } from '@/lib/i18n';

const CATEGORY_ORDER: UnlockCategory[] = ['character', 'item', 'bonus'];

export default function MetaProgressRoute() {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = createSignal<string | null>(null);
  const [confirmTarget, setConfirmTarget] = createSignal<UnlockEntry | null>(null);
  const dict = () => t();

  onMount(() => {
    void ensureMetaLoaded();
  });

  function isUnlocked(entry: UnlockEntry, m: MetaProgress | undefined): boolean {
    if (!m) return false;
    switch (entry.category) {
      case 'character':
        return m.unlockedCharacters.includes(entry.effectKey);
      case 'item':
        return m.unlockedItemPools.includes(entry.effectKey);
      case 'bonus':
        if (entry.effectKey === 'startGold') return (m.permanentBonuses.startGold ?? 0) > 0;
        if (entry.effectKey === 'startHpBonus') return (m.permanentBonuses.startHpBonus ?? 0) > 0;
        if (entry.effectKey === 'firstNodeRewardGuaranteed')
          return !!m.permanentBonuses.firstNodeRewardGuaranteed;
        return false;
    }
  }

  function applyUnlock(m: MetaProgress, entry: UnlockEntry): MetaProgress {
    const next: MetaProgress = {
      ...m,
      unlockedCharacters: [...m.unlockedCharacters],
      unlockedItems: [...m.unlockedItems],
      unlockedItemPools: [...m.unlockedItemPools],
      unlockedLocations: [...m.unlockedLocations],
      permanentBonuses: { ...m.permanentBonuses },
    };
    switch (entry.category) {
      case 'character':
        next.unlockedCharacters.push(entry.effectKey);
        break;
      case 'item':
        next.unlockedItemPools.push(entry.effectKey);
        break;
      case 'bonus':
        if (entry.effectKey === 'startGold') next.permanentBonuses.startGold = 20;
        else if (entry.effectKey === 'startHpBonus')
          next.permanentBonuses.startHpBonus = 10;
        else if (entry.effectKey === 'firstNodeRewardGuaranteed')
          next.permanentBonuses.firstNodeRewardGuaranteed = true;
        break;
    }
    return next;
  }

  async function confirmPurchase(entry: UnlockEntry) {
    const m = metaSignal();
    if (!m) return;
    if (m.totalStarShards < entry.cost) return;
    if (isUnlocked(entry, m)) return;
    setPurchasing(entry.id);
    try {
      const next = applyUnlock(
        { ...m, totalStarShards: m.totalStarShards - entry.cost },
        entry,
      );
      await updateMeta(next);
    } finally {
      setPurchasing(null);
      setConfirmTarget(null);
    }
  }

  function requestPurchase(entry: UnlockEntry) {
    // 50조각 이상은 실수 클릭 방지를 위해 확인 다이얼로그
    if (entry.cost >= 50) {
      setConfirmTarget(entry);
      return;
    }
    void confirmPurchase(entry);
  }

  function entriesByCategory(cat: UnlockCategory): UnlockEntry[] {
    return UNLOCK_TREE.filter((u) => u.category === cat);
  }

  return (
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <Button variant="ghost" class="hover:bg-slate-800 text-slate-300" onClick={() => navigate('/')}>
            ← {dict().meta.back}
          </Button>
          <span class="font-bold text-lg tracking-wide bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            {dict().meta.title}
          </span>
        </div>
        <span class="text-sm text-amber-400 font-medium">
          ⭐ {dict().meta.starShards}{' '}
          <span class="font-mono tabular-nums">
            {metaSignal()?.totalStarShards ?? 0}
          </span>
        </span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <Show
          when={metaSignal()}
          fallback={<p class="text-slate-400 text-sm">{dict().meta.loading}</p>}
        >
          <For each={CATEGORY_ORDER}>
            {(cat) => (
              <section class="flex flex-col gap-3">
                <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {dict().meta.categories[cat]}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <For each={entriesByCategory(cat)}>
                    {(entry) => {
                      const unlocked = () => isUnlocked(entry, metaSignal());
                      const canAfford = () =>
                        (metaSignal()?.totalStarShards ?? 0) >= entry.cost;
                      return (
                        <div
                          class={`flex flex-col gap-2 p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                            unlocked()
                              ? 'border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/20'
                              : canAfford()
                                ? 'border-amber-500/40 bg-slate-900/60 hover:border-amber-500/60'
                                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700/50'
                          }`}
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-100 font-medium">
                              {entry.name}
                            </span>
                            <Show
                              when={unlocked()}
                              fallback={
                                <span class="text-xs font-semibold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full">
                                  ⭐ {entry.cost}
                                </span>
                              }
                            >
                              <span class="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                {dict().meta.unlocked}
                              </span>
                            </Show>
                          </div>
                          <p class="text-xs text-slate-300 leading-relaxed min-h-[32px]">{entry.description}</p>
                          <Show when={!unlocked()}>
                            <Button
                              variant={canAfford() ? 'primary' : 'secondary'}
                              onClick={() => requestPurchase(entry)}
                              class="text-xs w-full py-2"
                              disabled={!canAfford() || purchasing() === entry.id}
                            >
                              {purchasing() === entry.id
                                ? dict().meta.purchasing
                                : canAfford()
                                  ? dict().meta.unlock
                                  : dict().meta.insufficient}
                            </Button>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </section>
            )}
          </For>
        </Show>
      </main>
      <Modal
        open={!!confirmTarget()}
        onClose={() => setConfirmTarget(null)}
        title={dict().meta.confirmTitle}
      >
        <Show when={confirmTarget()}>
          {(t) => (
            <div class="flex flex-col gap-3">
              <p class="text-sm text-slate-300">
                {dict().meta.confirmBody
                  .replace('{name}', t().name)
                  .replace('{cost}', String(t().cost))}
              </p>
              <p class="text-xs text-slate-400">{t().description}</p>
              <div class="flex justify-end gap-2 mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmTarget(null)}
                >
                  {dict().meta.cancel}
                </Button>
                <Button onClick={() => void confirmPurchase(t())}>{dict().meta.unlock}</Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>
    </div>
  );
}
