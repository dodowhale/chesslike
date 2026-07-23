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
  {
    id: 'goblin-ambush',
    acts: [1],
    narrative: '풀숲에서 작은 고블린 무리가 튀어나온다. 싸울지, 돈으로 달랠지.',
    choices: [
      {
        label: '맞서 싸운다',
        description: '킹 HP -8 / 골드 +25',
        effects: [
          { kind: 'damage-king', amount: 8 },
          { kind: 'add-gold', amount: 25 },
        ],
      },
      {
        label: '돈으로 달랜다 (-15)',
        description: '피해는 없다',
        effects: [{ kind: 'spend-gold', cost: 15 }],
      },
      {
        label: '도망친다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'hermits-blessing',
    acts: [1, 2],
    narrative: '동굴 어귀의 은둔자가 조용히 손을 내민다.',
    choices: [
      {
        label: '축복을 받는다',
        description: '킹 HP +8',
        effects: [{ kind: 'heal-king', amount: 8 }],
      },
      {
        label: '대신 보상을 청한다 (50% Common 아이템)',
        description: '50% Common, 50% 헛수고',
        effects: [{ kind: 'reward', rarity: 'common', chance: 0.5 }],
      },
      {
        label: '인사만 하고 떠난다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'cursed-chest',
    acts: [2, 3],
    narrative: '봉인된 상자에서 차가운 기운이 새어 나온다.',
    choices: [
      {
        label: '봉인을 깬다',
        description: '킹 HP -12 / 골드 +50',
        effects: [
          { kind: 'damage-king', amount: 12 },
          { kind: 'add-gold', amount: 50 },
        ],
      },
      {
        label: '제단으로 돌려보낸다',
        description: '글로벌 모디파이어 +1',
        effects: [{ kind: 'global-modifier' }],
      },
      {
        label: '무시한다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'pilgrims-shrine',
    acts: [1, 2, 3],
    narrative: '순례자들이 다녀간 작은 돌탑. 손을 모으면 마음이 잠시 편안해진다.',
    choices: [
      {
        label: '잠시 묵상한다',
        description: '킹 HP +4',
        effects: [{ kind: 'heal-king', amount: 4 }],
      },
      {
        label: '동전을 봉헌한다 (-10)',
        description: '킹 HP +12',
        effects: [
          { kind: 'spend-gold', cost: 10 },
          { kind: 'heal-king', amount: 12 },
        ],
      },
    ],
  },
  {
    id: 'wanderers-deal',
    acts: [1, 2, 3],
    narrative: '낯선 떠돌이가 짐을 풀고 물건을 보여준다.',
    choices: [
      {
        label: 'Common 아이템 구입 (-30)',
        description: 'Common 아이템 1개',
        effects: [
          { kind: 'spend-gold', cost: 30 },
          { kind: 'reward', rarity: 'common' },
        ],
      },
      {
        label: '대화만 한다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'ravens-warning',
    acts: [2, 3],
    narrative: '검은 까마귀가 머리 위를 맴돈다. 무언가 경고하는 듯하다.',
    choices: [
      {
        label: '경고를 진지하게 받아들인다',
        description: '킹 HP +3 (소모: 시간)',
        effects: [{ kind: 'heal-king', amount: 3 }],
      },
      {
        label: '무리해 전진한다',
        description: '킹 HP -6 / 골드 +20',
        effects: [
          { kind: 'damage-king', amount: 6 },
          { kind: 'add-gold', amount: 20 },
        ],
      },
      {
        label: '돌멩이를 던져 쫓는다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'forgotten-library',
    acts: [3],
    narrative: '먼지 쌓인 도서관. 책장에 묻힌 서적에서 강한 마력이 느껴진다.',
    choices: [
      {
        label: '비밀의 서적을 펼친다 (-40)',
        description: 'Uncommon 아이템 1개',
        effects: [
          { kind: 'spend-gold', cost: 40 },
          { kind: 'reward', rarity: 'uncommon' },
        ],
      },
      {
        label: '책 한 권만 가져간다',
        description: '글로벌 모디파이어 +1',
        effects: [{ kind: 'global-modifier' }],
      },
      {
        label: '아무것도 건들지 않는다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
  {
    id: 'merchants-favor',
    acts: [1, 2, 3],
    narrative: '예전에 도와준 적 있는 상인이 보답하려 한다.',
    choices: [
      {
        label: '감사히 받는다',
        description: '골드 +35',
        effects: [{ kind: 'add-gold', amount: 35 }],
      },
      {
        label: '대신 회복약을 청한다',
        description: '킹 HP +10',
        effects: [{ kind: 'heal-king', amount: 10 }],
      },
    ],
  },
  {
    id: 'arena-trial',
    acts: [2, 3],
    narrative: '투기장 사회자가 도전을 권한다. 위험하지만 큰 보상이 걸려 있다.',
    choices: [
      {
        label: '도전 수락 (HP -10)',
        description: '50% 확률 Uncommon, 50% 헛수고',
        effects: [
          { kind: 'damage-king', amount: 10 },
          { kind: 'reward', rarity: 'uncommon', chance: 0.5 },
        ],
      },
      {
        label: '안전한 내기 (-20)',
        description: '50% 확률 골드 두 배 환급',
        effects: [
          { kind: 'spend-gold', cost: 20 },
          { kind: 'reward-double-gold', chance: 0.5, doubleAmount: 40 },
        ],
      },
      {
        label: '관전만 한다',
        description: '아무 일도 없다',
        effects: [{ kind: 'noop' }],
      },
    ],
  },
];

/** 노드 ID 기반 시드로 안정적인 이벤트 선택. */
export function pickEventForNode(nodeId: string, act: Act): EventDef {
  const candidates = EVENT_POOL.filter((e) => e.acts.includes(act));
  const pool = candidates.length > 0 ? candidates : EVENT_POOL;
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
  }
  const idx = hash % pool.length;
  return pool[idx]!;
}
