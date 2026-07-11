import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { CombatLogPanel } from '@/components/adventure/CombatLogPanel';
import { Modal } from '@/components/ui/Modal';
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
import type { PieceState, AdventureChessManager } from '@/lib/chess/AdventureChessManager';

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
  const [abandonOpen, setAbandonOpen] = createSignal(false);
  const PHASE_COUNT = 2;
  const [skillTargetMode, setSkillTargetMode] = createSignal(false);
  const [showPhaseTransition, setShowPhaseTransition] = createSignal(false);

  const run = () => gameStore.adventure;
  const currentNode = createMemo(() =>
    run()?.map.find((n) => n.id === run()?.currentNodeId),
  );

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

  // status 변화 감지 — 체크메이트 발생 시 페이즈 전환 또는 클리어
  createEffect(() => {
    const status = gameStore.ui.status;
    if (status.kind === 'ongoing' || outcome() !== null) return;
    if (status.kind === 'checkmate' && status.winner === 'w') {
      // 페이즈 클리어
      if (phaseIdx() < PHASE_COUNT - 1) {
        setShowPhaseTransition(true);
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
    setShowPhaseTransition(false);
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

  function onBackButton() {
    if (outcome() !== null) {
      returnToMap();
      return;
    }
    setAbandonOpen(true);
  }

  function confirmAbandon() {
    setAbandonOpen(false);
    // onCleanup이 leaveBoardNode 처리. 보스 노드는 미완료 상태로 남아 다시 진입
    // 시 페이즈 0부터 새 보드. 진행 중인 페이즈 상태(HP/페이즈 인덱스)는 손실.
    navigate('/adventure/run/map');
  }

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
          "background-image": `url('./assets/adventure/backgrounds/act${gameStore.adventure?.act ?? 1}.png')`,
          "background-size": "cover",
          "background-position": "center",
          "image-rendering": "pixelated"
        }}
      />
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 z-10 bg-slate-950/85 backdrop-blur-sm w-full">
        <Button variant="ghost" onClick={onBackButton}>
          ← {outcome() === null ? '보스전 포기' : '맵으로'}
        </Button>
        <span class="font-semibold">
          👑 보스 — 페이즈 {phaseIdx() + 1} / {PHASE_COUNT}
        </span>
        <span class="text-xs text-slate-400">킹 HP {playerKingHp()}</span>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-3 p-4 z-10 w-full">
        <Show when={gameStore.adventure}>
          <div class="flex items-center gap-3 bg-slate-900 border border-red-950 px-4 py-2 rounded-lg max-w-[480px] w-full shadow-lg shadow-red-950/10">
            <div class="w-14 h-14 border border-red-500/40 bg-slate-950 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={`./assets/adventure/bosses/act${gameStore.adventure?.act ?? 1}.png`}
                class="w-full h-full object-contain"
                style={{ "image-rendering": "pixelated" }}
                alt={`Act ${gameStore.adventure?.act ?? 1} Boss`}
              />
            </div>
            <div>
              <h2 class="text-sm font-bold text-red-400 uppercase tracking-wide">
                {gameStore.adventure?.act ?? 1}막 보스 수호자
              </h2>
              <p class="text-[11px] text-slate-400">
                {gameStore.adventure?.act === 1
                  ? '기본기가 탄탄하며 2페이즈에 돌입 시 파괴력이 증폭됩니다.'
                  : gameStore.adventure?.act === 2
                  ? '숲의 기운을 다루며 강력한 생명력 반사 능력을 가집니다.'
                  : '심해의 공포. 강력한 군중 제어와 침식을 활용합니다.'}
              </p>
            </div>
          </div>
        </Show>
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
        <CombatLogPanel />
        <Show when={outcome() !== null}>
          <Button onClick={returnToMap}>
            {outcome() === 'victory' ? '맵으로' : '결과 화면'}
          </Button>
        </Show>
      </main>
      <Modal
        open={abandonOpen()}
        onClose={() => setAbandonOpen(false)}
        title="보스전을 포기하시겠습니까?"
      >
        <p class="text-sm text-slate-300 mb-4">
          진행 중인 페이즈는 초기화됩니다. 보스 노드는 미완료 상태로 남아 맵에서 다시 진입할 수 있습니다.
        </p>
        <div class="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAbandonOpen(false)}>
            계속하기
          </Button>
          <Button onClick={confirmAbandon}>보스전 포기</Button>
        </div>
      </Modal>
      <Show when={showPhaseTransition()}>
        <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
          <div class="max-w-md w-full bg-slate-900/95 border-2 border-amber-500/30 rounded-xl p-8 shadow-2xl shadow-amber-500/10 text-center flex flex-col items-center gap-6">
            <div class="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center border border-amber-500/30 text-amber-400 text-3xl animate-pulse">
              👑
            </div>
            <div>
              <h2 class="text-xl font-bold text-amber-400 mb-2">
                페이즈 {phaseIdx() + 1} 클리어!
              </h2>
              <p class="text-xs text-slate-300">
                보스 수호자가 쓰러졌으나, 한 층 더 강력해진 새로운 진형으로 부활하려고 합니다.
              </p>
            </div>
            <div class="text-[11px] text-slate-400 border-t border-slate-800 pt-4 w-full">
              아군의 체력과 장착 아이템은 보존되며, 보드는 리셋됩니다.
            </div>
            <Button
              variant="primary"
              onClick={nextPhase}
              class="w-full py-2.5 text-sm font-semibold shadow-lg shadow-amber-600/20 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border border-amber-400/20 transition-all duration-200"
            >
              다음 페이즈 시작하기 →
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
