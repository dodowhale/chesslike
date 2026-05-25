import { For, Show, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { Modifier, Piece, PieceType } from '@shared/adventure';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';

const PIECE_LABEL: Record<PieceType, string> = {
  p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹',
};

function modifierLabel(mod: Modifier): string {
  const parts: string[] = [];
  if (mod.hp) parts.push(`HP+${mod.hp}`);
  if (mod.attack) parts.push(`ATK+${mod.attack}`);
  if (mod.healPerTurn) parts.push(`매턴 HP+${mod.healPerTurn}`);
  if (mod.thornsDamage) parts.push(`피격 시 반사+${mod.thornsDamage}`);
  // range / jumpOver는 후속 구현 (chess.js 룰 확장 필요). 칩 표시도 보류 — 작동하지
  // 않는 효과를 사용자에게 노출하면 혼란을 야기.
  return parts.length > 0 ? parts.join(' · ') : '효과 없음';
}

export default function AdventureInventory() {
  const navigate = useNavigate();
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>();

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  function playerPieces(): Piece[] {
    return (gameStore.adventure?.pieces ?? []).filter((p) => p.side === 'w');
  }

  function equip(pieceId: string) {
    const itemId = selectedItemId();
    if (!itemId) return;
    const ok = activeRun()?.equipItem(pieceId, itemId);
    if (ok) setSelectedItemId(undefined);
  }

  function unequip(pieceId: string, itemId: string) {
    activeRun()?.unequipItem(pieceId, itemId);
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/adventure/run/map')}>
          ← 맵으로
        </Button>
        <span class="font-semibold">🎒 인벤토리</span>
        <span class="text-xs text-slate-400">💰 {gameStore.adventure?.gold ?? 0}</span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Show when={(gameStore.adventure?.globalModifiers.length ?? 0) > 0}>
          <section class="md:col-span-2">
            <h3 class="text-sm font-semibold text-slate-300 mb-2">
              글로벌 모디파이어 (모든 기물에 적용)
            </h3>
            <div class="flex flex-wrap gap-2">
              <For each={gameStore.adventure?.globalModifiers}>
                {(mod, idx) => (
                  <button
                    type="button"
                    class="text-[11px] px-2 py-1 rounded bg-purple-500/20 text-purple-100 border border-purple-500/40 hover:bg-red-500/20 hover:border-red-500/40"
                    onClick={() => activeRun()?.removeGlobalModifierAt(idx())}
                    title="클릭하여 해제"
                  >
                    {modifierLabel(mod)}
                  </button>
                )}
              </For>
            </div>
          </section>
        </Show>
        <section>
          <h3 class="text-sm font-semibold text-slate-300 mb-2">미장착 아이템</h3>
          <Show
            when={(gameStore.adventure?.inventory.length ?? 0) > 0}
            fallback={
              <p class="text-xs text-slate-500">보관 중인 아이템이 없습니다.</p>
            }
          >
            <div class="flex flex-col gap-2">
              <For each={gameStore.adventure?.inventory}>
                {(item) => (
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    class={`text-left p-2 rounded-md border ${
                      selectedItemId() === item.id
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-slate-100">{item.name}</span>
                      <span class="text-xs text-amber-400">{item.rarity}</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">{item.description}</p>
                  </button>
                )}
              </For>
            </div>
          </Show>
          <Show when={selectedItemId()}>
            <p class="text-xs text-amber-300 mt-2">
              우측 기물 카드를 눌러 장착 (각 기물 최대 2슬롯)
            </p>
          </Show>
        </section>
        <section>
          <h3 class="text-sm font-semibold text-slate-300 mb-2">백 기물</h3>
          <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            <For each={playerPieces()}>
              {(piece) => (
                <div
                  class={`flex flex-col gap-1 p-2 rounded-md border ${
                    selectedItemId() && piece.items.length < 2
                      ? 'border-emerald-500/50 cursor-pointer hover:bg-emerald-500/10'
                      : 'border-slate-700'
                  } bg-slate-900`}
                  onClick={() => selectedItemId() && piece.items.length < 2 && equip(piece.id)}
                  role={selectedItemId() ? 'button' : undefined}
                >
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-100">
                      {PIECE_LABEL[piece.type]} ({piece.id.split('-').pop()})
                    </span>
                    <span class="text-xs text-slate-300">
                      HP {piece.hp}/{piece.maxHp} · ATK {piece.attack}
                    </span>
                  </div>
                  <div class="flex gap-1 flex-wrap">
                    <For each={piece.items}>
                      {(item) => (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            unequip(piece.id, item.id);
                          }}
                          class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 hover:bg-red-500/30"
                          title="클릭하여 해제"
                        >
                          {item.name}
                        </button>
                      )}
                    </For>
                    <Show when={piece.items.length === 0}>
                      <span class="text-[10px] text-slate-500">슬롯 비어있음</span>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>
      </main>
    </div>
  );
}
