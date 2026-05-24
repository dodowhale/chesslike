import type { Modifier } from '@shared/adventure';

/**
 * 글로벌 모디파이어 — SPEC §6.2 슬롯 제한 없는 인벤토리, 모든 기물에 적용.
 * 보상 풀(이벤트/Elite/보스에서 일부 확률로 등장).
 */
export interface GlobalModifierDef {
  id: string;
  name: string;
  description: string;
  modifier: Modifier;
}

export const GLOBAL_MODIFIER_POOL: GlobalModifierDef[] = [
  {
    id: 'kings-blessing',
    name: '왕의 가호',
    description: '모든 기물 HP +3',
    modifier: { hp: 3 },
  },
  {
    id: 'thorned-aura',
    name: '가시 오라',
    description: '모든 기물 반사 +2',
    modifier: { thornsDamage: 2 },
  },
  {
    id: 'battle-fury',
    name: '전투 광기',
    description: '모든 기물 공격력 +1',
    modifier: { attack: 1 },
  },
  {
    id: 'soothing-prayer',
    name: '평온의 기도',
    description: '매 턴 모든 기물 HP +1',
    modifier: { healPerTurn: 1 },
  },
];

export function rollGlobalModifier(rng: () => number): GlobalModifierDef {
  return GLOBAL_MODIFIER_POOL[Math.floor(rng() * GLOBAL_MODIFIER_POOL.length)]!;
}
