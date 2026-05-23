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
  unlockedItems: string[];
  unlockedLocations: string[];
  permanentBonuses: {
    startGold?: number;
    startHpBonus?: number;
    firstNodeRewardGuaranteed?: boolean;
  };
}
