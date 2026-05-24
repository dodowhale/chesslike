import { Show, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';
import { rollBossReward } from '@/lib/adventure/data/items';

interface BossPhase {
  name: string;
  hp: number;
  attack: number;
  description: string;
}

/**
 * SPEC §4.2: 보스는 다단계 페이즈, 체크메이트로만 페이즈 종료. HP=0은 페이즈
 * 약화의 자리표.
 *
 * M3 MVP는 자동 시뮬레이션으로 단순화: 본 화면에서 HP=0이 페이즈 종료의
 * 자리표로 동작하며, M5 폴리시에서 실제 보드 + 체크메이트 종료 룰로 교체된다.
 * 페이즈 전환 시 플레이어 기물 HP/아이템은 보존(현재 구현은 킹 HP만 사용).
 */
const BOSS_PHASES: BossPhase[] = [
  {
    name: '1막 보스 — 검은 군주',
    hp: 60,
    attack: 18,
    description: '강력한 공격력. 처음에는 정공법으로 부딪쳐야 한다.',
  },
  {
    name: '검은 군주 — 광기',
    hp: 45,
    attack: 22,
    description: 'HP가 떨어지자 광기에 빠진다. 공격력 상승.',
  },
];

export default function AdventureBoss() {
  const navigate = useNavigate();
  const [phaseIdx, setPhaseIdx] = createSignal(0);
  const [bossHp, setBossHp] = createSignal(BOSS_PHASES[0]!.hp);
  const [log, setLog] = createSignal<string[]>([]);

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  function king() {
    return gameStore.adventure?.pieces.find((p) => p.side === 'w' && p.type === 'k');
  }

  function attack() {
    const k = king();
    const c = activeRun();
    if (!k || !c) return;
    const phase = BOSS_PHASES[phaseIdx()]!;
    // 플레이어 공격 — 단순 평균
    const playerAtk = c.state().pieces.filter((p) => p.side === 'w').reduce((acc, p) => acc + p.attack, 0) / 16;
    const playerDmg = Math.max(6, Math.round(playerAtk * 0.6));
    const newBossHp = Math.max(0, bossHp() - playerDmg);
    setBossHp(newBossHp);
    setLog([`플레이어 → 보스 ${playerDmg} 데미지`, ...log()].slice(0, 6));

    if (newBossHp <= 0) {
      // 페이즈 종료 (SPEC §5.4: 보스는 체크메이트만 페이즈 종료이지만 MVP에서는
      // HP=0을 체크메이트의 자리표로 사용. 후속 PR에서 실제 보드 전투로 교체)
      if (phaseIdx() < BOSS_PHASES.length - 1) {
        const next = phaseIdx() + 1;
        setPhaseIdx(next);
        setBossHp(BOSS_PHASES[next]!.hp);
        setLog([`페이즈 ${next + 1} 시작: ${BOSS_PHASES[next]!.name}`, ...log()].slice(0, 6));
        return;
      }
      // 최종 페이즈 클리어 — markCurrentNodeCompleted가 SPEC §8.1에 따라
      // 막 보스 10조각 (최종 보스 30조각) 자동 적립. Legendary 풀 해금 시 보상.
      c.markCurrentNodeCompleted();
      const reward = rollBossReward(Math.random, c.unlockedItemPools);
      if (reward) c.addInventory(reward);
      // 다음 막으로 진행 (M4: 1막 → 2막 → 3막). 3막 보스 클리어는 결과 화면으로.
      const advanced = c.advanceAct();
      if (advanced) {
        navigate('/adventure/run/map');
      } else {
        navigate('/adventure/run/result?outcome=victory');
      }
      return;
    }

    // 보스 반격
    const bossDmg = phase.attack;
    c.setPieceHp(k.id, k.hp - bossDmg);
    setLog([`보스 → 킹 ${bossDmg} 데미지`, ...log()].slice(0, 6));
    if (king() && king()!.hp <= 0) {
      navigate('/adventure/run/result?outcome=defeat');
    }
  }

  function abandon() {
    navigate('/adventure/run/result?outcome=defeat');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={abandon}>← 포기</Button>
        <span class="font-semibold">👑 {BOSS_PHASES[phaseIdx()]?.name}</span>
        <span class="text-xs text-slate-400">킹 HP {king()?.hp ?? 0}</span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <div class="p-4 border-2 border-red-500/40 bg-red-500/10 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-red-200">
              페이즈 {phaseIdx() + 1} / {BOSS_PHASES.length}
            </span>
            <span class="text-sm text-slate-300">
              보스 HP {bossHp()} / {BOSS_PHASES[phaseIdx()]!.hp}
            </span>
          </div>
          <div class="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-red-500 transition-all"
              style={{ width: `${(bossHp() / BOSS_PHASES[phaseIdx()]!.hp) * 100}%` }}
            />
          </div>
          <p class="text-xs text-slate-400 mt-2">{BOSS_PHASES[phaseIdx()]!.description}</p>
        </div>
        <Button onClick={attack}>공격</Button>
        <Show when={log().length > 0}>
          <div class="flex flex-col gap-1 mt-2">
            {log().map((line) => (
              <p class="text-xs text-slate-400">› {line}</p>
            ))}
          </div>
        </Show>
        <div class="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/30 rounded-md p-3 mt-4">
          ⚠ <b>M3 MVP 자동 시뮬레이션</b>. SPEC §4.2의 정식 보스 룰(체크메이트만 페이즈
          종료, HP=0은 페이즈 약화)은 M5 폴리시에서 실제 보드와 함께 완성됩니다. 클리어
          시 SPEC §8.1에 따라 막 보스 10조각이 적립됩니다.
        </div>
      </main>
    </div>
  );
}
