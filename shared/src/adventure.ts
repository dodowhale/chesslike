export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Side = 'w' | 'b';

export interface Modifier {
  hp?: number;
  attack?: number;
  range?: number;
  jumpOver?: boolean;
  healPerTurn?: number;
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

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  hp: number;
  maxHp: number;
  attack: number;
  items: Item[];
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
