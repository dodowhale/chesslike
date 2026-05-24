import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { GameContainer } from '@/components/phaser/GameContainer';
import { activeRun } from '@/store/adventureStore';
import {
  gameStore,
  setAdventureClickHandler,
  setAdventureSelection,
  setInteractive,
} from '@/store/gameStore';
import { rollItems } from '@/lib/adventure/data/items';
import type { Item } from '@shared/adventure';
import type { Square } from '@/lib/chess/ChessManager';

/**
 * 모험 Battle/Elite 노드 — 실제 보드 인터랙션 (M5 정식).
 *
 * - AdventureRunController가 AdventureChessManager 인스턴스를 보유.
 * - gameStore가 adventureClickHandler로 콜백을 라우팅 (eventBus 단일 진입점).
 * - finalize는 createEffect 단일 진입점으로 race 차단.
 */
export default function AdventureBattle() {
  const navigate = useNavigate();
  const [boardSelected, setBoardSelected] = createSignal<Square | undefined>();
  const [highlights, setHighlights] = createSignal<Square[]>([]);
  const [outcome, setOutcome] = createSignal<'victory' | 'defeat' | null>(null);

  const run = () => gameStore.adventure;
  const currentNode = createMemo(() => {
    const r = run();
    if (!r) return undefined;
    return r.map.find((n) => n.id === r.currentNodeId);
  });

  onMount(() => {
    const c = activeRun();
    if (!c) {
      navigate('/adventure', { replace: true });
      return;
    }
    c.enterBoardNode();
    setInteractive(true);
    setAdventureClickHandler(handleBoardClick);

    onCleanup(() => {
      setAdventureClickHandler(null);
      c.leaveBoardNode();
    });
  });

  function handleBoardClick(square: Square) {
    const c = activeRun();
    const chess = c?.getBoardChess();
    if (!c || !chess) return;
    if (outcome() !== null) return;
    if (chess.turn() !== 'w') return;

    const selected = boardSelected();
    if (selected && square === selected) {
      setBoardSelected(undefined);
      setHighlights([]);
      setAdventureSelection(undefined, []);
      return;
    }
    if (selected && highlights().includes(square)) {
      const uci = `${selected}${square}`;
      c.attemptBoardMove(uci);
      setBoardSelected(undefined);
      setHighlights([]);
      setAdventureSelection(undefined, []);
      return;
    }
    const dests = chess.legalDestinations(square);
    if (dests.length > 0) {
      setBoardSelected(square);
      setHighlights(dests);
      setAdventureSelection(square, dests);
    } else {
      setBoardSelected(undefined);
      setHighlights([]);
      setAdventureSelection(undefined, []);
    }
  }

  // 단일 진입점 — status 변화 1회 발화 시 결과 처리.
  createEffect(() => {
    const kind = gameStore.ui.status.kind;
    if (kind === 'ongoing') return;
    if (outcome() !== null) return;
    finalize();
  });

  function finalize() {
    const c = activeRun();
    if (!c) return;
    const status = gameStore.ui.status;
    const playerWon =
      status.kind === 'checkmate' && (status as { winner: 'w' | 'b' }).winner === 'w';
    setOutcome(playerWon ? 'victory' : 'defeat');
    if (!playerWon) return;
    // 승리 보상
    const node = currentNode();
    if (!node) return;
    const isElite = node.type === 'elite';
    c.addGold(isElite ? 40 : 20);
    const rarities: Item['rarity'][] = isElite ? ['uncommon', 'rare'] : ['common'];
    const items = rollItems(Math.random, 1, rarities, c.unlockedItemPools);
    for (const item of items) c.addInventory(item);
    c.markCurrentNodeCompleted();
    if (c.consumeFirstNodeBonus()) {
      const bonus = rollItems(Math.random, 1, ['uncommon'], c.unlockedItemPools)[0];
      if (bonus) c.addInventory(bonus);
    }
  }

  function returnToMap() {
    if (outcome() === 'defeat') {
      navigate('/adventure/run/result?outcome=defeat');
    } else {
      navigate('/adventure/run/map');
    }
  }

  // 헤더의 킹 HP는 store 보드 hp 채널에서 직접 가져와 stale 방지
  const playerKingHp = () => {
    const hps = gameStore.ui.adventurePieceHps;
    if (!hps) return 0;
    // 진영 w 킹의 square를 찾아야 하지만 단순화: 가장 큰 maxHp가 킹.
    let best = 0;
    for (const h of hps) {
      if (h.maxHp >= 30) best = Math.max(best, h.hp);
    }
    return best;
  };

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={returnToMap} disabled={outcome() === null}>
          ← {outcome() === null ? '진행 중' : '맵으로'}
        </Button>
        <span class="font-semibold">
          {currentNode()?.type === 'elite' ? '⚔ 엘리트' : '⚔ 전투'}
        </span>
        <span class="text-xs text-slate-400">킹 HP {playerKingHp()}</span>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <Show when={outcome() === 'victory'}>
          <div class="text-emerald-300 text-sm">🏆 승리 — 보상이 인벤토리에 추가되었습니다.</div>
        </Show>
        <Show when={outcome() === 'defeat'}>
          <div class="text-red-300 text-sm">💀 패배 — 런이 종료됩니다.</div>
        </Show>
        <section class="flex flex-col items-center gap-3 w-full max-w-[480px]">
          <GameContainer />
        </section>
        <Show when={boardSelected() && highlights().length > 0}>
          <p class="text-xs text-slate-400">
            {boardSelected()} 선택 — {highlights().length}개 합법수
          </p>
        </Show>
        <Show when={outcome() !== null}>
          <Button onClick={returnToMap}>
            {outcome() === 'victory' ? '맵으로' : '결과 화면'}
          </Button>
        </Show>
      </main>
    </div>
  );
}
