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

function assassinsLoadout(): PieceLoadout[] {
  return standardLoadout().map((p) => {
    if (p.side === 'w') {
      if (p.startingSquare === 'c1' || p.startingSquare === 'f1') {
        return { type: 'n', side: 'w', startingSquare: p.startingSquare, baseStatsOverride: { hp: 40, attack: 15 } };
      }
      if (p.type === 'n') {
        return { ...p, baseStatsOverride: { hp: 40, attack: 15 } };
      }
    }
    return p;
  });
}

function saintsLoadout(): PieceLoadout[] {
  return standardLoadout().map((p) => {
    if (p.side === 'w') {
      if (p.startingSquare === 'b1' || p.startingSquare === 'g1') {
        return { type: 'b', side: 'w', startingSquare: p.startingSquare, baseStatsOverride: { hp: 35, attack: 14 } };
      }
      if (p.type === 'b') {
        return { ...p, baseStatsOverride: { hp: 35, attack: 14 } };
      }
      if (p.type === 'k') {
        return { ...p, baseStatsOverride: { hp: 65, attack: 10 } };
      }
    }
    return p;
  });
}

function fortressLoadout(): PieceLoadout[] {
  return standardLoadout().map((p) => {
    if (p.side === 'w') {
      if (p.startingSquare === 'c1' || p.startingSquare === 'f1') {
        return { type: 'r', side: 'w', startingSquare: p.startingSquare, baseStatsOverride: { hp: 50, attack: 15 } };
      }
      if (p.type === 'r') {
        return { ...p, baseStatsOverride: { hp: 50, attack: 15 } };
      }
    }
    return p;
  });
}

function chaosLoadout(): PieceLoadout[] {
  return standardLoadout().map((p) => {
    if (p.side === 'w' && p.type === 'p') {
      return { ...p, baseStatsOverride: { hp: 10, attack: 10 } };
    }
    return p;
  });
}

/** 암살자단 — 나이트가 강화된 파티. */
export const ASSASSINS_CHARACTER: Character = {
  id: 'assassins',
  name: '암살자단',
  description: '나이트 강화 파티. 4기의 나이트가 전열을 구축해 빠른 암습을 노립니다.',
  startingPieces: assassinsLoadout(),
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
  description: '비숍·킹 강화 + 결속 패시브. 4기의 비숍이 매 턴 결속 회복을 제공합니다.',
  startingPieces: saintsLoadout(),
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

/** 요새단 — 룩 강화 파티. */
export const FORTRESS_CHARACTER: Character = {
  id: 'fortress',
  name: '요새단',
  description: '룩 강화 파티. 캐슬링 시 참여 기물들이 대량 회복됩니다.',
  startingPieces: fortressLoadout(),
  passives: [
    {
      id: 'fortress-bulwark',
      name: '요새의 장벽',
      description: '아군 캐슬링 수행 시 참여 킹과 룩 HP +15 회복',
      trigger: 'on-castle',
      effect: { healPerTurn: 0 }, // on-castle 트리거 핸들러에서 직접 HP 조작
    },
  ],
  startingItems: [],
  isUnlocked: false,
  unlockCost: 100,
};

/** 혼돈단 — 폰 강화 파티. */
export const CHAOS_CHARACTER: Character = {
  id: 'chaos',
  name: '혼돈단',
  description: '폰 강화 파티. 폰이 적을 캡처할 때마다 기본 공격력이 영구 누적 성장합니다.',
  startingPieces: chaosLoadout(),
  passives: [
    {
      id: 'chaos-evolution',
      name: '혼돈의 진화',
      description: '아군 폰이 적 캡처 성공 시 공격력 +2 영구 누적',
      trigger: 'on-capture',
      effect: { attack: 0 }, // on-capture 핸들러에서 캡처 주체의 attack 직접 가산
    },
  ],
  startingItems: [],
  isUnlocked: false,
  unlockCost: 120,
};

export const CHARACTER_POOL: Character[] = [
  STANDARD_CHARACTER,
  ASSASSINS_CHARACTER,
  SAINTS_CHARACTER,
  FORTRESS_CHARACTER,
  CHAOS_CHARACTER,
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
