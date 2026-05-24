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
import { rollBossReward } from '@/lib/adventure/data/items';
import type { Square } from '@/lib/chess/ChessManager';

/**
 * 모험 보스 노드 — 실제 보드 인터랙션 (M5 정식).
 *
 * SPEC §4.2: 보스는 다단계 페이즈. **체크메이트로만 페이즈 종료**.
 * HP=0은 페이즈 약화의 자리표 — 현 MVP에서는 단순 보드 룰만 적용해
 * 체크메이트 = 페이즈 클리어로 일관 처리한다.
 */
export default function AdventureBoss() {
  const navigate = useNavigate();
  const [boardSelected, setBoardSelected] = createSignal<Square | undefined>();
  const [highlights, setHighlights] = createSignal<Square[]>([]);
  const [phaseIdx, setPhaseIdx] = createSignal(0);
  const [outcome, setOutcome] = createSignal<'victory' | 'defeat' | null>(null);
  const PHASE_COUNT = 2;

  const run = () => gameStore.adventure;
  const currentNode = createMemo(() =>
    run()?.map.find((n) => n.id === run()?.currentNodeId),
  );

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

  // status 변화 감지 — 체크메이트 발생 시 페이즈 전환 또는 클리어
  createEffect(() => {
    const status = gameStore.ui.status;
    if (status.kind === 'ongoing' || outcome() !== null) return;
    if (status.kind === 'checkmate' && status.winner === 'w') {
      // 페이즈 클리어
      if (phaseIdx() < PHASE_COUNT - 1) {
        nextPhase();
      } else {
        finalize('victory');
      }
    } else {
      finalize('defeat');
    }
  });

  function nextPhase() {
    const c = activeRun();
    if (!c) return;
    setPhaseIdx(phaseIdx() + 1);
    // SPEC §5.4: 플레이어 기물 HP/아이템 보존하며 새 보드 시작.
    // controller가 status:ongoing + interactive 재설정까지 책임.
    c.startNextBossPhase();
  }

  function finalize(kind: 'victory' | 'defeat') {
    setOutcome(kind);
    if (kind !== 'victory') return;
    const c = activeRun();
    if (!c) return;
    c.markCurrentNodeCompleted();
    const reward = rollBossReward(Math.random, c.unlockedItemPools);
    if (reward) c.addInventory(reward);
    // 다음 막으로 진행 (M4: 1막 → 2막 → 3막). 3막 보스 클리어는 결과 화면으로.
    const advanced = c.advanceAct();
    if (!advanced) {
      // 최종 보스 클리어
      navigate('/adventure/run/result?outcome=victory');
    }
  }

  function returnToMap() {
    if (outcome() === 'defeat') {
      navigate('/adventure/run/result?outcome=defeat');
    } else {
      navigate('/adventure/run/map');
    }
  }

  const playerKingHp = () =>
    run()?.pieces.find((p) => p.side === 'w' && p.type === 'k')?.hp ?? 0;

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button
          variant="ghost"
          onClick={returnToMap}
          disabled={outcome() === null}
        >
          ← {outcome() === null ? '진행 중' : '맵으로'}
        </Button>
        <span class="font-semibold">
          👑 보스 — 페이즈 {phaseIdx() + 1} / {PHASE_COUNT}
        </span>
        <span class="text-xs text-slate-400">킹 HP {playerKingHp()}</span>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <Show when={currentNode()}>
          <p class="text-xs text-slate-400">
            SPEC §4.2 — 체크메이트로만 페이즈 종료 (모험 보스 모드)
          </p>
        </Show>
        <Show when={outcome() === 'victory'}>
          <div class="text-emerald-300 text-sm">🏆 보스 클리어!</div>
        </Show>
        <Show when={outcome() === 'defeat'}>
          <div class="text-red-300 text-sm">💀 패배 — 런이 종료됩니다.</div>
        </Show>
        <section class="flex flex-col items-center gap-3 w-full max-w-[480px]">
          <GameContainer />
        </section>
        <Show when={outcome() !== null}>
          <Button onClick={returnToMap}>
            {outcome() === 'victory' ? '맵으로' : '결과 화면'}
          </Button>
        </Show>
      </main>
    </div>
  );
}
