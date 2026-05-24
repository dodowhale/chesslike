import { For, createMemo, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';
import { rollItems } from '@/lib/adventure/data/items';
import type { Item } from '@shared/adventure';

const RARITY_PRICES: Record<Item['rarity'], number> = {
  common: 30,
  uncommon: 70,
  rare: 150,
  legendary: 300,
};

export default function AdventureShop() {
  const navigate = useNavigate();

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  // 노드별 인벤토리 (페이지가 같은 노드에 머무는 동안 고정)
  const stock = createMemo<Item[]>(() => {
    const pools = activeRun()?.unlockedItemPools ?? [];
    return rollItems(Math.random, 3, ['common', 'uncommon', 'rare'], pools);
  });

  function buy(item: Item) {
    const c = activeRun();
    if (!c) return;
    const price = RARITY_PRICES[item.rarity];
    const gold = gameStore.adventure?.gold ?? 0;
    if (gold < price) return;
    c.addGold(-price);
    c.addInventory(item);
  }

  function leave() {
    activeRun()?.markCurrentNodeCompleted();
    navigate('/adventure/run/map');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={leave}>← 맵으로</Button>
        <span class="font-semibold">💰 상점</span>
        <span class="text-xs text-slate-400">보유 골드 {gameStore.adventure?.gold ?? 0}</span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <p class="text-sm text-slate-400">아이템을 골드로 구매할 수 있습니다.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <For each={stock()}>
            {(item) => {
              const price = RARITY_PRICES[item.rarity];
              const canBuy = (gameStore.adventure?.gold ?? 0) >= price;
              return (
                <div class="flex flex-col gap-2 p-3 border border-slate-700 rounded-lg bg-slate-900">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-100">{item.name}</span>
                    <span class="text-xs text-amber-400">{item.rarity}</span>
                  </div>
                  <p class="text-xs text-slate-300 flex-1">{item.description}</p>
                  <Button
                    variant={canBuy ? 'primary' : 'secondary'}
                    onClick={() => buy(item)}
                    class="text-sm"
                  >
                    💰 {price} 구매
                  </Button>
                </div>
              );
            }}
          </For>
        </div>
        <div class="flex justify-end">
          <Button variant="secondary" onClick={leave}>나가기</Button>
        </div>
      </main>
    </div>
  );
}
