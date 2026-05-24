import type { Character, PieceLoadout } from '@shared/adventure';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function standardLoadout(): PieceLoadout[] {
  const out: PieceLoadout[] = [];
  const whiteBack: { file: string; type: PieceLoadout['type'] }[] = [
    { file: 'a', type: 'r' }, { file: 'b', type: 'n' }, { file: 'c', type: 'b' },
    { file: 'd', type: 'q' }, { file: 'e', type: 'k' }, { file: 'f', type: 'b' },
    { file: 'g', type: 'n' }, { file: 'h', type: 'r' },
  ];
  for (const p of whiteBack) {
    out.push({ type: p.type, side: 'w', startingSquare: `${p.file}1` });
  }
  for (const f of FILES) {
    out.push({ type: 'p', side: 'w', startingSquare: `${f}2` });
  }
  const blackBack: { file: string; type: PieceLoadout['type'] }[] = [
    { file: 'a', type: 'r' }, { file: 'b', type: 'n' }, { file: 'c', type: 'b' },
    { file: 'd', type: 'q' }, { file: 'e', type: 'k' }, { file: 'f', type: 'b' },
    { file: 'g', type: 'n' }, { file: 'h', type: 'r' },
  ];
  for (const p of blackBack) {
    out.push({ type: p.type, side: 'b', startingSquare: `${p.file}8` });
  }
  for (const f of FILES) {
    out.push({ type: 'p', side: 'b', startingSquare: `${f}7` });
  }
  return out;
}

/** 표준 캐릭터 — 모든 기물 기본 베이스 스탯. */
export const STANDARD_CHARACTER: Character = {
  id: 'standard',
  name: '정규단',
  description: 'FIDE 표준 8x8 진형. 균형 잡힌 시작 — 모험 모드 입문에 적합.',
  startingPieces: standardLoadout(),
  passives: [],
  startingItems: [],
  isUnlocked: true,
};

/** 암살자단 — 나이트가 강화된 파티. */
export const ASSASSINS_CHARACTER: Character = {
  id: 'assassins',
  name: '암살자단',
  description: '나이트 강화 파티. 두 나이트가 HP·ATK + 점프 확장 보너스를 받는다.',
  startingPieces: standardLoadout().map((p) => {
    if (p.type === 'n' && p.side === 'w') {
      return { ...p, baseStatsOverride: { hp: 40, attack: 15 } };
    }
    return p;
  }),
  passives: [
    {
      id: 'assassins-jump',
      name: '암살 도약',
      description: '나이트가 다른 기물 위를 점프 시 +1 데미지',
      trigger: 'on-capture',
      effect: { attack: 1 },
    },
  ],
  startingItems: [],
  isUnlocked: false,
  unlockCost: 50,
};

/** 신성단 — 비숍·킹 강화 + 매 턴 회복. */
export const SAINTS_CHARACTER: Character = {
  id: 'saints',
  name: '신성단',
  description: '비숍·킹 강화 + 결속 패시브. 매 턴 킹 HP +1 회복.',
  startingPieces: standardLoadout().map((p) => {
    if (p.type === 'b' && p.side === 'w') {
      return { ...p, baseStatsOverride: { hp: 35, attack: 14 } };
    }
    if (p.type === 'k' && p.side === 'w') {
      return { ...p, baseStatsOverride: { hp: 65, attack: 10 } };
    }
    return p;
  }),
  passives: [
    {
      id: 'saints-blessing',
      name: '결속의 가호',
      description: '매 턴 시작 시 백 킹 HP +1',
      trigger: 'turn-start',
      effect: { healPerTurn: 1 },
    },
  ],
  startingItems: [],
  isUnlocked: false,
  unlockCost: 80,
};

export const CHARACTER_POOL: Character[] = [
  STANDARD_CHARACTER,
  ASSASSINS_CHARACTER,
  SAINTS_CHARACTER,
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTER_POOL.find((c) => c.id === id);
}

/** 메타 진행을 반영해 캐릭터 잠금 상태를 갱신. */
export function applyMetaToCharacters(
  pool: Character[],
  unlockedIds: string[],
): Character[] {
  return pool.map((c) => ({
    ...c,
    isUnlocked: c.isUnlocked || unlockedIds.includes(c.id),
  }));
}
