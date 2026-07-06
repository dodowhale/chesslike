export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Side = 'w' | 'b';

export interface Modifier {
  hp?: number;
  attack?: number;
  /**
   * 사거리/점프 확장 modifier — 후속 구현 예정.
   * chess.js의 표준 무브 규칙 위에 추가 합법수를 얹는 작업이 필요해 본 사이클
   * (M6+) 범위 외. 아이템·캐릭터 설계 시 사용 금지. 본 modifier가 modifier에
   * 들어 있어도 무브 계산에 영향이 없다는 점 유의.
   */
  range?: number;
  /** 위와 동일. 후속 구현. */
  jumpOver?: boolean;
  /** 매 턴 시작 시 자기 진영 모든 piece에 적용되는 HP 회복 (장착·캐릭터 패시브·글로벌 합산). */
  healPerTurn?: number;
  /** 피격(공격당한) 시 attacker에게 되돌려주는 반사 데미지. 캡처/damaged 양쪽 모두 적용. */
  thornsDamage?: number;
}

export interface Item {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: 'stat' | 'effect' | 'passive';
  description: string;
  modifier: Modifier;
}

export interface PieceLoadout {
  type: PieceType;
  side: Side;
  startingSquare: string;
  baseStatsOverride?: { hp?: number; attack?: number };
  startingItems?: Item[];
}

export interface PieceSkill {
  name: string;
  cooldownTurns: number;
  currentCooldown: number;
  hasUsedThisMatch: boolean;
}

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  hp: number;
  maxHp: number;
  attack: number;
  items: Item[];
  skill?: PieceSkill;
}

export interface Passive {
  id: string;
  name: string;
  description: string;
  trigger: 'turn-start' | 'turn-end' | 'on-capture' | 'on-captured' | 'on-castle' | 'always';
  effect: Modifier;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  startingPieces: PieceLoadout[];
  passives: Passive[];
  startingItems: Item[];
  isUnlocked: boolean;
  unlockCost?: number;
}

export type NodeType = 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest';
export type Act = 1 | 2 | 3;

export interface MapNode {
  id: string;
  type: NodeType;
  act: Act;
  isCompleted: boolean;
  nextNodes: string[];
}

export interface AdventureRunState {
  characterId: string;
  act: Act;
  currentNodeId: string;
  map: MapNode[];
  pieces: Piece[];
  inventory: Item[];
  globalModifiers: Modifier[];
  gold: number;
  starShardsThisRun: number;
}

export interface MetaProgress {
  totalStarShards: number;
  unlockedCharacters: string[];
  /** 개별 아이템 ID 해금 목록 (현재 미사용, 추후 캐릭터별 시작 아이템 등). */
  unlockedItems: string[];
  /** 아이템 풀 키 해금 목록 ('rare-pool' / 'legendary-pool' 등). */
  unlockedItemPools: string[];
  unlockedLocations: string[];
  permanentBonuses: {
    startGold?: number;
    startHpBonus?: number;
    firstNodeRewardGuaranteed?: boolean;
  };
}

/**
 * 모험 모드 누적 통계. 메타와 별개의 kv 키(`meta:runStats`)에 영구 저장.
 * 통계 화면(/stats) + 누적형 도전과제(boss-slayer, legend-trio 등)에서 사용.
 */
export interface RunStats {
  totalRuns: number;
  totalVictories: number;
  totalBossClears: number;
  totalGoldEarned: number;
  totalNodesCompleted: number;
  totalLegendariesFound: number;
  totalShopPurchases: number;
  /** 막별 보스 클리어 횟수. */
  bossClearsByAct: { act1: number; act2: number; act3: number };
}
