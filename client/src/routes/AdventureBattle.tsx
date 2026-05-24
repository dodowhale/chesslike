import { Show, createMemo, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';
import { rollItems } from '@/lib/adventure/data/items';
import type { Item } from '@shared/adventure';

/**
 * M3 MVP — 자동 시뮬레이션 (WIP).
 *
 * SPEC §5.1~5.5의 정식 흐름(HP 차감 캡처, 앙파상, 승급, 스테일메이트=패배)은
 * `AdventureChessManager`(lib/chess)에 도메인 로직으로 구현되어 있으나, 실제 보드
 * 인터랙션과 BoardScene HP 오버레이는 M5 폴리시 단계에서 정식 도트 에셋과 함께
 * 완성한다. 본 화면은 노드 라우팅·보상·인벤토리·별의 조각 적립 흐름을 검증하기
 * 위한 임시 단순화로, 정식 정의된 ATK/HP/아이템 효과는 본 시뮬레이션에 반영되지
 * 않는다 (정직한 한계 표기).
 */
export default function AdventureBattle() {
  const navigate = useNavigate();

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  const run = () => gameStore.adventure;
  const currentNode = createMemo(() => {
    const r = run();
    if (!r) return undefined;
    return r.map.find((n) => n.id === r.currentNodeId);
  });

  const playerKingHp = () => {
    const r = run();
    if (!r) return 0;
    return r.pieces.find((p) => p.side === 'w' && p.type === 'k')?.hp ?? 0;
  };

  function fight() {
    const c = activeRun();
    if (!c) return;
    const node = currentNode();
    if (!node) return;
    const isElite = node.type === 'elite';
    // 단순 시뮬레이션: 사용자 ATK 합 vs 적 HP 합. 사용자가 항상 승리하지만 킹 HP
    // 일부 손실. Elite는 더 큰 손실.
    const damageToKing = isElite ? 18 : 8;
    const king = run()?.pieces.find((p) => p.side === 'w' && p.type === 'k');
    if (king) {
      c.setPieceHp(king.id, king.hp - damageToKing);
    }
    c.addGold(isElite ? 40 : 20);
    // 보상 아이템 1개 인벤토리에 추가
    const rng = Math.random;
    // Elite는 SPEC §3에 따라 Rare+ 등급 풀에서 추첨 (메타 해금 시).
    const rarities: Item['rarity'][] = isElite
      ? ['uncommon', 'rare']
      : ['common'];
    const items = rollItems(rng, 1, rarities, c.unlockedItemPools);
    for (const item of items) c.addInventory(item);
    c.markCurrentNodeCompleted(); // 별의 조각도 함께 적립됨
    // 첫 노드 보상 보장 영구 장식품 — 첫 일반 노드 클리어 1회 한정 Uncommon 추가.
    if (c.consumeFirstNodeBonus()) {
      const bonus = rollItems(Math.random, 1, ['uncommon'], c.unlockedItemPools)[0];
      if (bonus) c.addInventory(bonus);
    }
    if (playerKingHp() <= 0) {
      navigate('/adventure/run/result?outcome=defeat');
    } else {
      navigate('/adventure/run/map');
    }
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/adventure/run/map')}>
          ← 맵으로
        </Button>
        <span class="font-semibold">
          {currentNode()?.type === 'elite' ? '⚔ 엘리트' : '⚔ 전투'}
        </span>
        <span class="text-xs text-slate-400">킹 HP {playerKingHp()}</span>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <Show when={currentNode()}>
          <p class="text-slate-300 text-center max-w-md">
            {currentNode()?.type === 'elite'
              ? '강화된 적과의 어려운 대국. 승리 시 레어급 아이템 + 골드 40 + 별의 조각 3.'
              : '일반 적과의 짧은 대국. 승리 시 아이템 1개 + 골드 20 + 별의 조각 1.'}
          </p>
          <div class="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/30 rounded-md p-3 max-w-md">
            ⚠ 본 화면은 <b>M3 MVP 자동 시뮬레이션</b>입니다. SPEC §5의 정식 HP 차감
            캡처와 아이템 효과는 M5 폴리시에서 보드 UI와 함께 완성됩니다.
          </div>
          <Button onClick={fight}>전투 시작</Button>
        </Show>
      </main>
    </div>
  );
}
