import type { Act } from '@shared/adventure';

export type EventEffect =
  | { kind: 'heal-king'; amount: number }
  | { kind: 'damage-king'; amount: number }
  | { kind: 'add-gold'; amount: number }
  | { kind: 'spend-gold'; cost: number }
  | { kind: 'reward'; rarity: 'common' | 'uncommon'; chance?: number }
  | { kind: 'reward-double-gold'; chance: number; doubleAmount: number }
  | { kind: 'global-modifier' }
  | { kind: 'noop' };

export interface EventChoiceDef {
  label: string;
  description: string;
  /** 시퀀스 적용. 일부가 실패하면 (예: 골드 부족) 후속 효과는 스킵하지 않고 그대로 진행. */
  effects: EventEffect[];
}

export interface EventDef {
  id: string;
  acts: Act[];
  narrative: string;
  choices: EventChoiceDef[];
}

export const EVENT_POOL: EventDef[] = [
  {
    id: 'fountain-and-merchant',
    acts: [1, 2, 3],
    narrative: '숲길 한가운데 작은 샘이 흐른다. 그 옆에 낯선 상인이 미소짓고 있다.',
    choices: [
      {
        label: '신비한 샘에서 물을 마신다',
        description: '킹 HP +10',
        effects: [{ kind: 'heal-king', amount: 10 }],
      },
      {
        label: '낯선 상인에게 골드를 준다 (-30)',
        description: '50% 확률로 두 배 환급',
        effects: [
          { kind: 'spend-gold', cost: 30 },
          { kind: 'reward-double-gold', chance: 0.5, doubleAmount: 60 },
        ],
      },
      {
        label: '무시하고 지나친다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'mysterious-altar',
    acts: [1, 2, 3],
    narrative:
      '낡은 제단 위에 돌멩이가 빛난다. 만질지 무시할지 선택해야 한다.',
    choices: [
      {
        label: '돌을 만진다',
        description: '킹 HP -5 / 골드 +40',
        effects: [
          { kind: 'damage-king', amount: 5 },
          { kind: 'add-gold', amount: 40 },
        ],
      },
      {
        label: '경건히 기도한다',
        description: '킹 HP +5',
        effects: [{ kind: 'heal-king', amount: 5 }],
      },
      { label: '돌아간다', description: '아무 일도 없다', effects: [{ kind: 'noop' }] },
    ],
  },
  {
    id: 'wandering-priest',
    acts: [1, 2],
    narrative: '떠돌이 사제가 다가와 축복을 제안한다.',
    choices: [
      {
        label: '헌금 후 축복받기 (골드 -20)',
        description: 'Common 아이템 1개',
        effects: [
          { kind: 'spend-gold', cost: 20 },
          { kind: 'reward', rarity: 'common' },
        ],
      },
      {
        label: '도움 거절',
        description: '사제는 떠난다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'dark-pact',
    acts: [2, 3],
    narrative: '검은 망토의 인물이 어둠의 계약을 제안한다. 위험하지만 강력하다.',
    choices: [
      {
        label: '계약 수락 (킹 HP -15)',
        description: '골드 +30 + Uncommon 아이템',
        effects: [
          { kind: 'damage-king', amount: 15 },
          { kind: 'add-gold', amount: 30 },
          { kind: 'reward', rarity: 'uncommon' },
        ],
      },
      {
        label: '거절',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'lost-traveler',
    acts: [1, 2, 3],
    narrative: '길 잃은 여행자가 도움을 청한다.',
    choices: [
      {
        label: '동행해 안내한다',
        description: '골드 +25',
        effects: [{ kind: 'add-gold', amount: 25 }],
      },
      {
        label: '냉정히 거절',
        description: '여행자는 떠난다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'ancient-shrine',
    acts: [2, 3],
    narrative: '오랫동안 잊혀진 사당이다. 기도를 올리면 가호를 받을 수 있다.',
    choices: [
      {
        label: '기도를 올린다 (골드 -25)',
        description: '글로벌 모디파이어 +1',
        effects: [
          { kind: 'spend-gold', cost: 25 },
          { kind: 'global-modifier' },
        ],
      },
      {
        label: '돌아선다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
];

/** 노드 ID 기반 시드로 안정적인 이벤트 선택. */
export function pickEventForNode(nodeId: string, act: Act): EventDef {
  const candidates = EVENT_POOL.filter((e) => e.acts.includes(act));
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
  }
  const idx = hash % candidates.length;
  return candidates[idx]!;
}
