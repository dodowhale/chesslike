import { createSignal } from 'solid-js';
import type {
  Act,
  AdventureRunState,
  Character,
  Item,
  MapNode,
  MetaProgress,
  Modifier,
  Piece as AdventurePiece,
} from '@shared/adventure';
import { snapshotAdventureRun, setMode } from '@/store/gameStore';
import { INITIAL_FEN } from '@shared/game';
import { generateAct } from '@/lib/adventure/MapGenerator';
import { basePieceStats } from '@/lib/chess/AdventureChessManager';
import { persistRun } from '@/lib/adventure/runPersist';
import type { SceneController } from './types';

/**
 * ADVENTURE.md §8.1 별의 조각 보상.
 * - 일반 노드 클리어: 1 (실패 런이어도 도달 노드만큼 적립되므로 노드 클리어 시점에 적립).
 * - Elite: 3
 * - 막 보스: 10
 * - 최종 보스: 30
 */
const STAR_SHARDS = {
  battle: 1,
  elite: 3,
  shop: 0,
  event: 0,
  rest: 0,
  boss_act: 10,
  boss_final: 30,
} as const;
export const STAR_SHARD_REWARDS = STAR_SHARDS;

/**
 * 모험 런 전체 라이프사이클을 관리한다.
 * 노드 진입 → 노드별 sub-controller 또는 화면 — 컨트롤러는 그저 run state의
 * 단일 출처(source of truth)이고, 라우트 컴포넌트가 현재 노드 종류에 따라
 * 적절한 화면을 그린다.
 */
export class AdventureRunController implements SceneController {
  private run: AdventureRunState;
  private startGold: number;
  private startHpBonus: number;
  /** 메타 해금 아이템 풀 키 목록 (rare-pool, legendary-pool 등). */
  unlockedItemPools: string[] = [];
  /** firstNodeRewardGuaranteed 영구 장식품 적용을 위한 1회용 플래그. */
  firstNodeBonusPending = false;
  private initErrorSignal = createSignal<string | null>(null);

  constructor(opts: {
    character: Character;
    meta?: MetaProgress;
    rng?: () => number;
  }) {
    // 영구 장식품(메타 보너스) 적용
    this.startGold = 50 + (opts.meta?.permanentBonuses.startGold ?? 0);
    this.startHpBonus = opts.meta?.permanentBonuses.startHpBonus ?? 0;
    this.unlockedItemPools = opts.meta?.unlockedItemPools ?? [];
    this.firstNodeBonusPending = !!opts.meta?.permanentBonuses.firstNodeRewardGuaranteed;
    const map = generateAct({ act: 1, rng: opts.rng });
    const entry = map.entryNodeIds[0]!;
    const pieces = this.materializePieces(opts.character);
    this.run = {
      characterId: opts.character.id,
      act: 1,
      currentNodeId: entry,
      map: map.nodes,
      pieces,
      inventory: opts.character.startingItems.slice(),
      globalModifiers: [],
      gold: this.startGold,
      starShardsThisRun: 0,
    };
    setMode('adventure');
    this.commit();
  }

  /** 기존 영속 상태로부터 컨트롤러를 복원한다 (자동 이어하기). */
  static restore(run: AdventureRunState, meta?: MetaProgress): AdventureRunController {
    const ctrl = Object.create(AdventureRunController.prototype) as AdventureRunController;
    Object.assign(ctrl, {
      startGold: 50,
      startHpBonus: 0,
      unlockedItemPools: meta?.unlockedItemPools ?? [],
      firstNodeBonusPending: false, // 이어하기는 이미 첫 노드 지났을 가능성
      initErrorSignal: createSignal<string | null>(null),
      run,
    });
    setMode('adventure');
    snapshotAdventureRun(run);
    return ctrl;
  }

  /** store에 snapshot + IDB에 영속. 모든 mutation 헬퍼가 호출. */
  private commit(): void {
    snapshotAdventureRun(this.run);
    void persistRun(this.run);
  }

  initError = () => this.initErrorSignal[0]();

  destroy(): void {
    /* 모험 런은 store에 상태가 남아도 무방 — 명시 destroy는 noop. 라우트 unmount 시 호출됨. */
  }

  /** 현재 노드 디스크립터. */
  currentNode(): MapNode | undefined {
    return this.run.map.find((n) => n.id === this.run.currentNodeId);
  }

  /** 진입 가능한 다음 노드 ID 목록 (현재 노드의 nextNodes). */
  availableNextNodes(): string[] {
    const cur = this.currentNode();
    if (!cur) return [];
    return cur.nextNodes;
  }

  /** 노드 클리어 표시 + 다음 노드로 이동. nextId가 nextNodes 안에 있어야 함. */
  advanceTo(nextId: string): void {
    const cur = this.currentNode();
    if (!cur) return;
    if (!cur.nextNodes.includes(nextId)) return;
    this.run = {
      ...this.run,
      map: this.run.map.map((n) => (n.id === cur.id ? { ...n, isCompleted: true } : n)),
      currentNodeId: nextId,
    };
    this.commit();
  }

  /** 노드를 미완료 표시 그대로 두고 다음으로 이동 — 보스 클리어 등 특수 케이스. */
  forceAdvanceTo(nextId: string): void {
    this.run.currentNodeId = nextId;
    this.commit();
  }

  /**
   * 현재 막의 보스를 클리어한 뒤 다음 막으로 진입. 새 맵을 생성하고 첫 노드로 이동.
   * SPEC §2 흐름: 1막 → 2막 → 3막 (최종). 3막 이후는 forceAdvanceTo로 결과 전이.
   */
  advanceAct(rng?: () => number): boolean {
    if (this.run.act >= 3) return false;
    const nextAct = (this.run.act + 1) as Act;
    const map = generateAct({ act: nextAct, rng });
    const entry = map.entryNodeIds[0]!;
    this.run = {
      ...this.run,
      act: nextAct,
      currentNodeId: entry,
      map: map.nodes,
      // 기물 HP/아이템은 보존 (SPEC §5.4 보스 전환 시 보존 정책의 확장)
    };
    this.commit();
    return true;
  }

  /** 글로벌 모디파이어 추가 — 슬롯 제한 없음, 모든 기물에 적용. */
  addGlobalModifier(mod: Modifier): void {
    this.run = {
      ...this.run,
      globalModifiers: [...this.run.globalModifiers, mod],
    };
    this.commit();
  }

  removeGlobalModifierAt(index: number): void {
    if (index < 0 || index >= this.run.globalModifiers.length) return;
    this.run = {
      ...this.run,
      globalModifiers: this.run.globalModifiers.filter((_, i) => i !== index),
    };
    this.commit();
  }

  markCurrentNodeCompleted(): void {
    const cur = this.currentNode();
    if (!cur) return;
    if (cur.isCompleted) return; // 중복 보상 방지
    const reward = this.starShardRewardFor(cur.type, cur.act);
    this.run = {
      ...this.run,
      map: this.run.map.map((n) => (n.id === cur.id ? { ...n, isCompleted: true } : n)),
      starShardsThisRun: this.run.starShardsThisRun + reward,
    };
    this.commit();
  }

  /** 첫 노드 보상 보장 장식품 적용 — 첫 일반 노드 클리어 시 1회 호출. */
  consumeFirstNodeBonus(): boolean {
    if (!this.firstNodeBonusPending) return false;
    this.firstNodeBonusPending = false;
    return true;
  }

  private starShardRewardFor(type: MapNode['type'], act: MapNode['act']): number {
    if (type === 'battle') return STAR_SHARDS.battle;
    if (type === 'elite') return STAR_SHARDS.elite;
    if (type === 'boss') return act === 3 ? STAR_SHARDS.boss_final : STAR_SHARDS.boss_act;
    return 0;
  }

  addGold(amount: number): void {
    this.run.gold = Math.max(0, this.run.gold + amount);
    this.commit();
  }

  addInventory(item: Item): void {
    this.run.inventory = [...this.run.inventory, item];
    this.commit();
  }

  removeInventory(itemId: string): void {
    this.run.inventory = this.run.inventory.filter((i) => i.id !== itemId);
    this.commit();
  }

  /** 인벤토리 아이템을 기물 슬롯에 장착 (최대 2슬롯). */
  equipItem(pieceId: string, itemId: string): boolean {
    const piece = this.run.pieces.find((p) => p.id === pieceId);
    const item = this.run.inventory.find((i) => i.id === itemId);
    if (!piece || !item) return false;
    if (piece.items.length >= 2) return false;
    this.run = {
      ...this.run,
      pieces: this.run.pieces.map((p) =>
        p.id === pieceId ? { ...p, items: [...p.items, item] } : p,
      ),
      inventory: this.run.inventory.filter((i) => i.id !== itemId),
    };
    this.commit();
    return true;
  }

  unequipItem(pieceId: string, itemId: string): boolean {
    const piece = this.run.pieces.find((p) => p.id === pieceId);
    if (!piece) return false;
    const item = piece.items.find((i) => i.id === itemId);
    if (!item) return false;
    this.run = {
      ...this.run,
      pieces: this.run.pieces.map((p) =>
        p.id === pieceId
          ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
          : p,
      ),
      inventory: [...this.run.inventory, item],
    };
    this.commit();
    return true;
  }

  setPieceHp(pieceId: string, hp: number): void {
    const piece = this.run.pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    const clamped = Math.max(0, Math.min(hp, piece.maxHp));
    this.run = {
      ...this.run,
      pieces: this.run.pieces.map((p) =>
        p.id === pieceId ? { ...p, hp: clamped } : p,
      ),
    };
    this.commit();
  }

  addStarShards(amount: number): void {
    this.run = {
      ...this.run,
      starShardsThisRun: this.run.starShardsThisRun + amount,
    };
    this.commit();
  }

  /** 현재 런의 상태 (snapshot). */
  state(): AdventureRunState {
    return this.run;
  }

  initialFen(): string {
    return INITIAL_FEN;
  }

  private materializePieces(character: Character): AdventurePiece[] {
    return character.startingPieces.map((loadout, idx) => {
      const base = basePieceStats(loadout.type);
      const hp = loadout.baseStatsOverride?.hp ?? base.hp;
      const attack = loadout.baseStatsOverride?.attack ?? base.attack;
      return {
        id: `p-${idx}-${loadout.side}-${loadout.type}-${loadout.startingSquare}`,
        type: loadout.type,
        side: loadout.side,
        hp: hp + (loadout.type === 'k' ? this.startHpBonus : 0),
        maxHp: hp + (loadout.type === 'k' ? this.startHpBonus : 0),
        attack,
        items: loadout.startingItems?.slice() ?? [],
      };
    });
  }
}

