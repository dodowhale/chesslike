import { createSignal, For, Show, createMemo, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';
import {
  pickEventForNode,
  type EventChoiceDef,
  type EventEffect,
} from '@/lib/adventure/data/events';
import { rollItems } from '@/lib/adventure/data/items';
import { rollGlobalModifier } from '@/lib/adventure/data/globalModifiers';
import type { Act } from '@shared/adventure';

export default function AdventureEvent() {
  const navigate = useNavigate();
  const [resolved, setResolved] = createSignal<string[] | null>(null);

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  function king() {
    return gameStore.adventure?.pieces.find((p) => p.side === 'w' && p.type === 'k');
  }

  const eventDef = createMemo(() => {
    const run = gameStore.adventure;
    if (!run) return undefined;
    return pickEventForNode(run.currentNodeId, run.act as Act);
  });

  function applyEffect(effect: EventEffect): string | null {
    const c = activeRun();
    if (!c) return null;
    switch (effect.kind) {
      case 'heal-king': {
        const k = king();
        if (k) c.setPieceHp(k.id, k.hp + effect.amount);
        return `킹 HP +${effect.amount}`;
      }
      case 'damage-king': {
        const k = king();
        if (k) c.setPieceHp(k.id, k.hp - effect.amount);
        return `킹 HP -${effect.amount}`;
      }
      case 'add-gold': {
        c.addGold(effect.amount);
        return `골드 +${effect.amount}`;
      }
      case 'spend-gold': {
        const gold = gameStore.adventure?.gold ?? 0;
        if (gold < effect.cost) {
          return `골드 부족 (-${effect.cost} 거래 무산)`;
        }
        c.addGold(-effect.cost);
        return `골드 -${effect.cost}`;
      }
      case 'reward-double-gold': {
        const lucky = Math.random() < effect.chance;
        if (lucky) {
          c.addGold(effect.doubleAmount);
          return `행운! 골드 +${effect.doubleAmount}`;
        }
        return '상대는 그대로 떠났다';
      }
      case 'reward': {
        const chance = effect.chance ?? 1;
        if (Math.random() > chance) return null;
        const item = rollItems(Math.random, 1, [effect.rarity], c.unlockedItemPools)[0];
        if (item) {
          c.addInventory(item);
          return `${item.name} 획득`;
        }
        return null;
      }
      case 'global-modifier': {
        const mod = rollGlobalModifier(Math.random);
        c.addGlobalModifier(mod.modifier);
        return `${mod.name} 발현 — ${mod.description}`;
      }
      case 'noop':
        return '아무 일도 없다';
    }
  }

  function applyChoice(choice: EventChoiceDef) {
    const lines: string[] = [];
    for (const eff of choice.effects) {
      const msg = applyEffect(eff);
      if (msg) lines.push(msg);
    }
    setResolved(lines.length > 0 ? lines : ['조용히 발걸음을 옮겼다.']);
  }

  function leave() {
    activeRun()?.markCurrentNodeCompleted();
    navigate('/adventure/run/map');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={leave}>← 맵으로</Button>
        <span class="font-semibold">❓ 이벤트</span>
        <span class="text-xs text-slate-400">킹 HP {king()?.hp ?? 0}</span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <Show when={eventDef()}>
          {(ev) => (
            <p class="text-slate-300 leading-relaxed">{ev().narrative}</p>
          )}
        </Show>
        <Show
          when={resolved()}
          fallback={
            <Show when={eventDef()}>
              {(ev) => (
                <div class="flex flex-col gap-2">
                  <For each={ev().choices}>
                    {(choice) => (
                      <button
                        type="button"
                        onClick={() => applyChoice(choice)}
                        class="text-left p-3 border border-slate-700 rounded-lg bg-slate-900 hover:border-amber-400"
                      >
                        <div class="font-semibold text-slate-100">{choice.label}</div>
                        <div class="text-xs text-slate-400 mt-1">
                          {choice.description}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              )}
            </Show>
          }
        >
          <div class="p-4 border border-amber-500/40 bg-amber-500/10 rounded-lg text-slate-200">
            <For each={resolved()}>
              {(line) => <p class="text-sm">• {line}</p>}
            </For>
          </div>
          <div class="flex justify-end">
            <Button onClick={leave}>맵으로</Button>
          </div>
        </Show>
      </main>
    </div>
  );
}
