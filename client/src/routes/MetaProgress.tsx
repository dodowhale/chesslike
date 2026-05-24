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

const CATEGORY_LABELS: Record<UnlockCategory, string> = {
  character: '캐릭터',
  item: '아이템 풀',
  bonus: '영구 장식품',
};

const CATEGORY_ORDER: UnlockCategory[] = ['character', 'item', 'bonus'];

export default function MetaProgressRoute() {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = createSignal<string | null>(null);
  const [confirmTarget, setConfirmTarget] = createSignal<UnlockEntry | null>(null);

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
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← 메인 메뉴
          </Button>
          <span class="font-semibold">메타 진행</span>
        </div>
        <span class="text-sm text-amber-400">
          ⭐ 별의 조각{' '}
          <span class="font-mono tabular-nums">
            {metaSignal()?.totalStarShards ?? 0}
          </span>
        </span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <Show
          when={metaSignal()}
          fallback={<p class="text-slate-400 text-sm">메타 진행 로딩 중…</p>}
        >
          <For each={CATEGORY_ORDER}>
            {(cat) => (
              <section class="flex flex-col gap-2">
                <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <For each={entriesByCategory(cat)}>
                    {(entry) => {
                      const unlocked = () => isUnlocked(entry, metaSignal());
                      const canAfford = () =>
                        (metaSignal()?.totalStarShards ?? 0) >= entry.cost;
                      return (
                        <div
                          class={`flex flex-col gap-2 p-3 rounded-lg border ${
                            unlocked()
                              ? 'border-emerald-500/50 bg-emerald-500/10'
                              : canAfford()
                                ? 'border-amber-500/40 bg-slate-900'
                                : 'border-slate-700 bg-slate-900/50'
                          }`}
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-semibold text-slate-100">
                              {entry.name}
                            </span>
                            <Show
                              when={unlocked()}
                              fallback={
                                <span class="text-xs text-amber-400">
                                  ⭐ {entry.cost}
                                </span>
                              }
                            >
                              <span class="text-xs text-emerald-400">해금됨</span>
                            </Show>
                          </div>
                          <p class="text-xs text-slate-300">{entry.description}</p>
                          <Show when={!unlocked()}>
                            <Button
                              variant={canAfford() ? 'primary' : 'secondary'}
                              onClick={() => requestPurchase(entry)}
                              class="text-xs"
                              disabled={!canAfford() || purchasing() === entry.id}
                            >
                              {purchasing() === entry.id
                                ? '구매 중…'
                                : canAfford()
                                  ? '잠금해제'
                                  : '조각 부족'}
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
        title="잠금해제 확인"
      >
        <Show when={confirmTarget()}>
          {(t) => (
            <div class="flex flex-col gap-3">
              <p class="text-sm text-slate-300">
                <b class="text-amber-300">{t().name}</b>을(를) ⭐ {t().cost}조각으로
                해금합니다.
              </p>
              <p class="text-xs text-slate-400">{t().description}</p>
              <div class="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmTarget(null)}
                >
                  취소
                </Button>
                <Button onClick={() => void confirmPurchase(t())}>해금</Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>
    </div>
  );
}
