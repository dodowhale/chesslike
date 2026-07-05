import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
import type { PieceState, AdventureChessManager } from '@/lib/chess/AdventureChessManager';

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
  const [abandonOpen, setAbandonOpen] = createSignal(false);
  const [skillTargetMode, setSkillTargetMode] = createSignal(false);

  const selectedPiece = createMemo(() => {
    const sel = boardSelected();
    if (!sel) return undefined;
    const c = activeRun();
    const chess = c?.getBoardChess();
    if (!c || !chess) return undefined;
    return chess.getPieceAt(sel);
  });

  function getSkillTargets(attacker: PieceState, chess: AdventureChessManager): Square[] {
    const targets: Square[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const f1 = attacker.square.charCodeAt(0) - 97; // a=0, b=1...
    const r1 = Number(attacker.square.charAt(1)) - 1; // 1-8 -> 0-7

    if (attacker.type === 'n') {
      const dests = chess.legalDestinations(attacker.square);
      for (const d of dests) {
        if (!chess.getPieceAt(d)) {
          targets.push(d);
        }
      }
    } else if (attacker.type === 'b') {
      const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
      for (const [df, dr] of dirs) {
        let f = f1 + df;
        let r = r1 + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const sq = `${files[f]}${r + 1}` as Square;
          const p = chess.getPieceAt(sq);
          if (p) {
            if (p.side === attacker.side) {
              targets.push(sq);
            }
            break;
          }
          f += df;
          r += dr;
        }
      }
    } else if (attacker.type === 'q') {
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ] as const;
      for (const [df, dr] of dirs) {
        let f = f1 + df;
        let r = r1 + dr;
        while (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const sq = `${files[f]}${r + 1}` as Square;
          const p = chess.getPieceAt(sq);
          if (p) {
            if (p.side !== attacker.side) {
              const pullSquare = `${files[f1 + df]}${r1 + dr + 1}` as Square;
              const pieceAtPull = chess.getPieceAt(pullSquare);
              if (!pieceAtPull || pullSquare === sq) {
                targets.push(sq);
              }
            }
            break;
          }
          f += df;
          r += dr;
        }
      }
    }
    return targets;
  }

  function getSkillDescription(type: string): string {
    switch (type) {
      case 'p': return '진격의 방패: 자신을 포함한 인접한 앞/좌/우 1칸 아군 기물에게 1턴간 피해 무효화(보호막) 부여 (쿨다운 5턴)';
      case 'n': return '번개 돌진: 캡처 없이 나이트 행마 범위 내 빈 칸으로 이동하며, 도착지 주변 3x3 범위의 적 전체에 8 데미지 부여 (쿨다운 6턴)';
      case 'b': return '성스러운 치유: 비숍의 이동 방향 대각선 상에 존재하는 아군 기물 1개의 HP를 20 회복 (쿨다운 4턴)';
      case 'r': return '강철 방벽: 2턴간 받는 모든 피해 50% 감소 및 자신에게 공격을 가한 적에게 즉시 8 반격 데미지 반사 (쿨다운 7턴)';
      case 'q': return '진공의 손길: 퀸의 가로/세로/대각선 사거리 선상에 위치한 적 기물 1개를 퀸의 앞 1칸으로 끌어당기고 10 데미지 부여 (대국당 1회, 쿨다운 8턴)';
      case 'k': return '왕의 진노: 1턴간 보드 전체 아군 기물 ATK +5 부여 및 킹 인접 1칸 범위 모든 적에게 10 데미지 타격 (대국당 1회)';
      default: return '';
    }
  }

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

  function handleSkillButtonClick(piece: PieceState) {
    const c = activeRun();
    const chess = c?.getBoardChess();
    if (!c || !chess) return;

    if (piece.type === 'p' || piece.type === 'r' || piece.type === 'k') {
      c.attemptActiveSkill(piece.id);
      setBoardSelected(undefined);
      setHighlights([]);
      setAdventureSelection(undefined, []);
      setSkillTargetMode(false);
    } else {
      if (skillTargetMode()) {
        setSkillTargetMode(false);
        const dests = chess.legalDestinations(piece.square);
        setHighlights(dests);
        setAdventureSelection(piece.square, dests);
      } else {
        setSkillTargetMode(true);
        const targets = getSkillTargets(piece, chess);
        setHighlights(targets);
        setAdventureSelection(piece.square, targets);
      }
    }
  }

  function handleBoardClick(square: Square) {
    const c = activeRun();
    const chess = c?.getBoardChess();
    if (!c || !chess) return;
    if (outcome() !== null) return;
    if (chess.turn() !== 'w') return;

    const selected = boardSelected();

    if (skillTargetMode()) {
      if (selected && highlights().includes(square)) {
        const piece = chess.getPieceAt(selected);
        if (piece) {
          c.attemptActiveSkill(piece.id, square);
        }
      }
      setBoardSelected(undefined);
      setHighlights([]);
      setAdventureSelection(undefined, []);
      setSkillTargetMode(false);
      return;
    }

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

  function onBackButton() {
    if (outcome() !== null) {
      returnToMap();
      return;
    }
    setAbandonOpen(true);
  }

  function confirmAbandon() {
    setAbandonOpen(false);
    // onCleanup이 leaveBoardNode + setAdventureClickHandler(null) 처리.
    // 노드는 미완료 상태 유지 — 다시 진입 시 보드는 초기 진형으로 재시작.
    navigate('/adventure/run/map');
  }

  // 헤더의 킹 HP는 store 보드 hp 채널에서 직접 가져와 stale 방지
  const playerKingHp = () => {
    const c = activeRun();
    const chess = c?.getBoardChess();
    if (chess) {
      return chess.getKingHp('w');
    }
    return run()?.pieces.find((p) => p.side === 'w' && p.type === 'k')?.hp ?? 0;
  };

  return (
    <div class="min-h-screen flex flex-col relative overflow-hidden">
      <div
        class="absolute inset-0 z-0 pointer-events-none opacity-15"
        style={{
          "background-image": `url('/assets/adventure/backgrounds/act${gameStore.adventure?.act ?? 1}.png')`,
          "background-size": "cover",
          "background-position": "center",
          "image-rendering": "pixelated"
        }}
      />
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 z-10 bg-slate-950/85 backdrop-blur-sm w-full">
        <Button variant="ghost" onClick={onBackButton}>
          ← {outcome() === null ? '전투 포기' : '맵으로'}
        </Button>
        <span class="font-semibold">
          ⚔ {currentNode()?.type === 'elite' ? '엘리트 전투' : '전투'}
        </span>
        <span class="text-xs text-slate-400">킹 HP {playerKingHp()}</span>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-3 p-4 z-10 w-full">
        <Show when={outcome() === 'victory'}>
          <div class="text-emerald-300 text-sm">🏆 승리 — 보상이 인벤토리에 추가되었습니다.</div>
        </Show>
        <Show when={outcome() === 'defeat'}>
          <div class="text-red-300 text-sm">💀 패배 — 런이 종료됩니다.</div>
        </Show>
        <section class="flex flex-col items-center gap-3 w-full max-w-[480px]">
          <GameContainer />
        </section>
        <Show when={selectedPiece() && selectedPiece()?.skill}>
          {(() => {
            const p = selectedPiece()!;
            const sk = p.skill!;
            const isCooldown = sk.currentCooldown > 0 || sk.hasUsedThisMatch;
            const cooldownText = sk.hasUsedThisMatch ? '대국당 1회 제한 (사용함)' : sk.currentCooldown > 0 ? `${sk.currentCooldown}턴 대기` : '사용 가능';

            return (
              <div class="w-full max-w-[480px] bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-amber-400">{sk.name}</span>
                    <span class="text-xs text-slate-400">
                      쿨다운: {sk.cooldownTurns}턴 | 상태: {cooldownText}
                    </span>
                  </div>
                  <Button
                    variant={skillTargetMode() ? 'secondary' : 'primary'}
                    disabled={isCooldown || gameStore.ui.status.kind !== 'ongoing'}
                    onClick={() => handleSkillButtonClick(p)}
                  >
                    {skillTargetMode() ? '선택 취소' : '스킬 사용'}
                  </Button>
                </div>
                <p class="text-xs text-slate-300">
                  {getSkillDescription(p.type)}
                </p>
              </div>
            );
          })()}
        </Show>
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
      <Modal
        open={abandonOpen()}
        onClose={() => setAbandonOpen(false)}
        title="전투를 포기하시겠습니까?"
      >
        <p class="text-sm text-slate-300 mb-4">
          진행 중인 보드는 초기화됩니다. 노드는 미완료 상태로 남아 맵에서 다시 진입할 수 있습니다.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAbandonOpen(false)}>
            계속하기
          </Button>
          <Button onClick={confirmAbandon}>전투 포기</Button>
        </div>
      </Modal>
    </div>
  );
}
