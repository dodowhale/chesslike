import { For, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';
import { rollItems } from '@/lib/adventure/data/items';
import { recordShopPurchase } from '@/lib/storage/runStatsRepo';
import type { Item } from '@shared/adventure';

const RARITY_PRICES: Record<Item['rarity'], number> = {
  common: 30,
  uncommon: 70,
  rare: 150,
  legendary: 300,
};

const RARITY_CLASSES: Record<string, string> = {
  common: 'border-slate-700 bg-slate-900/60',
  uncommon: 'border-blue-500/50 bg-blue-500/5',
  rare: 'border-purple-500/50 bg-purple-500/5',
  legendary: 'border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
};

export default function AdventureShop() {
  const navigate = useNavigate();
  const [boughtIds, setBoughtIds] = createSignal<string[]>([]);
  const [stock, setStock] = createSignal<Item[]>([]);

  onMount(() => {
    const c = activeRun();
    if (!c) {
      navigate('/adventure', { replace: true });
      return;
    }
    // 초기 스톡 로드
    const pools = c.unlockedItemPools ?? [];
    setStock(rollItems(Math.random, 3, ['common', 'uncommon', 'rare'], pools));
  });

  function reroll() {
    const c = activeRun();
    if (!c) return;
    const gold = gameStore.adventure?.gold ?? 0;
    if (gold < 15) return;
    
    c.addGold(-15);
    const pools = c.unlockedItemPools ?? [];
    setStock(rollItems(Math.random, 3, ['common', 'uncommon', 'rare'], pools));
    setBoughtIds([]); // 리롤 시 품절 상태 초기화
  }

  function buy(item: Item) {
    const c = activeRun();
    if (!c) return;
    if (boughtIds().includes(item.id)) return;
    const price = RARITY_PRICES[item.rarity];
    const gold = gameStore.adventure?.gold ?? 0;
    if (gold < price) return;
    c.addGold(-price);
    c.addInventory(item);
    setBoughtIds([...boughtIds(), item.id]);
    void recordShopPurchase();
  }

  function leave() {
    activeRun()?.markCurrentNodeCompleted();
    navigate('/adventure/run/map');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
        <div class="flex items-center gap-2">
          <Button variant="ghost" onClick={leave}>← 맵으로</Button>
        </div>
        <span class="font-semibold text-slate-100">💰 상점</span>
        <div class="flex items-center gap-4">
          <Button 
            variant="secondary" 
            class="text-xs py-1.5 px-3 border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
            onClick={reroll}
            disabled={(gameStore.adventure?.gold ?? 0) < 15}
          >
            🔄 15골드로 새로고침
          </Button>
          <span class="text-xs text-slate-400">보유 골드: <span class="font-semibold text-amber-400">🪙 {gameStore.adventure?.gold ?? 0}</span></span>
        </div>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <p class="text-sm text-slate-400">아이템을 골드로 구매할 수 있습니다.</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <For each={stock()}>
            {(item) => {
              const price = RARITY_PRICES[item.rarity];
              const isBought = () => boughtIds().includes(item.id);
              const canBuy = (gameStore.adventure?.gold ?? 0) >= price && !isBought();
              return (
                <div class={`flex flex-col gap-2 p-3 border rounded-lg transition-all ${
                  isBought() ? 'border-slate-800 bg-slate-950/40 opacity-50' : RARITY_CLASSES[item.rarity] || 'border-slate-700 bg-slate-900'
                }`}>
                  <div class="flex flex-row gap-3 items-center">
                    <div class="w-10 h-10 border border-slate-700 bg-slate-950 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={`./assets/adventure/items/${item.id}.png`}
                        class="w-8 h-8 object-contain"
                        style={{ "image-rendering": "pixelated" }}
                        alt={item.name}
                      />
                    </div>
                    <div class="flex-grow min-w-0">
                      <div class="flex items-center justify-between gap-1">
                        <span class="font-semibold text-slate-100 truncate text-sm">{item.name}</span>
                        <span class="text-[10px] text-amber-400 flex-shrink-0">{item.rarity}</span>
                      </div>
                    </div>
                  </div>
                  <p class="text-xs text-slate-300 flex-grow mt-1">{item.description}</p>
                  <Button
                    variant={isBought() ? 'secondary' : canBuy ? 'primary' : 'secondary'}
                    onClick={() => buy(item)}
                    class="text-xs mt-2"
                    disabled={isBought() || !canBuy}
                  >
                    {isBought() ? '품절' : `💰 ${price} 구매`}
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
