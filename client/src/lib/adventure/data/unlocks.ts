/**
 * 메타 진행 잠금해제 트리. 별의 조각으로 카테고리별 해금.
 */

export type UnlockCategory = 'character' | 'item' | 'bonus';

export interface UnlockEntry {
  id: string;
  category: UnlockCategory;
  /** 진열 라벨 (한국어) */
  name: string;
  description: string;
  cost: number; // 별의 조각
  /** 잠금해제 후 효과를 적용할 키 — character/item id, 또는 bonus key */
  effectKey: string;
}

export const UNLOCK_TREE: UnlockEntry[] = [
  // ---------- 캐릭터 ----------
  {
    id: 'unlock-assassins',
    category: 'character',
    name: '암살자단',
    description: '나이트가 강화된 파티. HP·ATK 보너스 + 점프 강화.',
    cost: 50,
    effectKey: 'assassins',
  },
  {
    id: 'unlock-saints',
    category: 'character',
    name: '신성단',
    description: '비숍과 킹을 중심으로 한 파티. 회복·결속 패시브.',
    cost: 80,
    effectKey: 'saints',
  },

  // ---------- 영구 장식품 (시작 보너스) ----------
  {
    id: 'bonus-start-gold',
    category: 'bonus',
    name: '시작 골드 +20',
    description: '모든 런 시작 시 보유 골드 +20',
    cost: 30,
    effectKey: 'startGold',
  },
  {
    id: 'bonus-start-hp',
    category: 'bonus',
    name: '시작 HP +10',
    description: '시작 시 킹 HP +10 보너스',
    cost: 40,
    effectKey: 'startHpBonus',
  },
  {
    id: 'bonus-first-node',
    category: 'bonus',
    name: '첫 노드 보상 보장',
    description: '1막 첫 노드 클리어 시 Uncommon 아이템 1개 추가 보상',
    cost: 60,
    effectKey: 'firstNodeRewardGuaranteed',
  },

  // ---------- 아이템 풀 (Rare/Legendary 등장) ----------
  {
    id: 'unlock-rare-pool',
    category: 'item',
    name: 'Rare 아이템 풀',
    description: 'Rare 등급 아이템 5종이 Shop/Event/Elite 보상에 등장',
    cost: 70,
    effectKey: 'rare-pool',
  },
  {
    id: 'unlock-legendary-pool',
    category: 'item',
    name: 'Legendary 아이템 풀',
    description: 'Legendary 2종이 보스 보상에 등장',
    cost: 120,
    effectKey: 'legendary-pool',
  },
];

export function findUnlock(id: string): UnlockEntry | undefined {
  return UNLOCK_TREE.find((u) => u.id === id);
}
