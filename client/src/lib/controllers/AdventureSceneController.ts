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
import {
  basePieceStats,
  createAdventureChessManager,
  type AdventureChessManager,
  type AdventureMoveResult,
  type PieceState,
} from '@/lib/chess/AdventureChessManager';
import { toRichLastMove, type MoveDescriptor, type Square } from '@/lib/chess/ChessManager';
import type { LastMove } from '@/lib/phaser/bridge/eventBus';
import { persistRun } from '@/lib/adventure/runPersist';
import {
  resetStatusOngoing,
  setAdventureBoardSnapshot,
  setAdventurePieceHps,
  setInteractive,
  setStatus,
} from '@/store/gameStore';
import { INITIAL_FEN as STARTING_FEN } from '@shared/game';
import type { SceneController } from './types';
import { getCharacterById } from '@/lib/adventure/data/characters';
import { settings } from '@/store/settingsStore';
import { getEngine } from '@/lib/chess/StockfishEngine';

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
  /** 노드 진입 시점에 활성화되는 보드 매니저 (Battle/Elite/Boss). */
  private boardChess: AdventureChessManager | null = null;
  private initErrorSignal = createSignal<string | null>(null);
  private aiReplyTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (this.aiReplyTimer) {
      clearTimeout(this.aiReplyTimer);
      this.aiReplyTimer = null;
    }
  }

  /** 현재 노드 디스크립터. */
  currentNode(): MapNode | undefined {
    return this.run.map.find((n) => n.id === this.run.currentNodeId);
  }

  /**
   * 진입 가능한 다음 노드 ID 목록.
   * 현재 노드가 클리어되지 않았다면(전투 포기 등) 빈 배열 — 사용자는 현재 노드를
   * 재진입해서 다시 시도해야 한다. markCurrentNodeCompleted가 호출돼야만 다음으로
   * 진행 가능.
   */
  availableNextNodes(): string[] {
    const cur = this.currentNode();
    if (!cur) return [];
    if (!cur.isCompleted) return [];
    return cur.nextNodes;
  }

  /**
   * 노드로 이동. nextId가 nextNodes 안에 있어야 한다.
   * 노드 클리어 마킹은 markCurrentNodeCompleted가 책임지므로 여기서는 currentNodeId만
   * 갱신한다. (전투 포기 시 자동 마킹되면 다음 진입이 부당하게 열려버리는 버그 방지)
   */
  advanceTo(nextId: string): void {
    const cur = this.currentNode();
    if (!cur) return;
    if (!cur.nextNodes.includes(nextId)) return;
    this.run = {
      ...this.run,
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

  // ---------- 보드 인터랙션 (M5 모험 정식 보드) ----------

  /**
   * 현재 노드(Battle/Elite/Boss) 진입 시 호출. 캐릭터 시작 진형 + 메타 보너스를
   * 반영한 새 AdventureChessManager 인스턴스를 만들어 보드를 활성화한다.
   *
   * @param preservePlayerPieces — 보스 페이즈 전환 시 SPEC §5.4에 따라 플레이어
   *   기물 HP/아이템을 보존하려면 이전 boardChess의 백 진영 pieces 스냅샷을 넘긴다.
   */
  enterBoardNode(preservePlayerPieces?: PieceState[]): void {
    const character = getCharacterById(this.run.characterId);
    if (!character) return;
    const preservedById = new Map<string, PieceState>();
    if (preservePlayerPieces) {
      for (const p of preservePlayerPieces) {
        if (p.side === 'w') preservedById.set(p.id, p);
      }
    } else {
      // 일반 노드 진입 시: 이전 전투에서 유지되고 있는 런 상태(this.run.pieces)에서 아군 기물 상태 복원
      for (const p of this.run.pieces) {
        if (p.side === 'w') preservedById.set(p.id, p as PieceState);
      }
    }
    
    const pieces: PieceState[] = [];
    character.startingPieces.forEach((loadout, idx) => {
      const base = basePieceStats(loadout.type);
      const baseHp = loadout.baseStatsOverride?.hp ?? base.hp;
      const baseAttack = loadout.baseStatsOverride?.attack ?? base.attack;
      const id = `${loadout.side === 'w' ? 'p' : 'e'}-${idx}-${loadout.side}-${loadout.type}-${loadout.startingSquare}`;
      const preserved = preservedById.get(id);
      
      if (preserved) {
        // 이미 런 상태에 기물이 존재하는 경우 보존하되, 체력이 0 이하인(사망한) 기물은 결원 처리하여 스폰하지 않음
        if (preserved.hp > 0) {
          pieces.push({ ...preserved, square: loadout.startingSquare as PieceState['square'] });
        }
        return;
      }
      
      const hpBonus = loadout.side === 'w' && loadout.type === 'k' ? this.startHpBonus : 0;
      pieces.push({
        id,
        type: loadout.type,
        side: loadout.side,
        hp: baseHp + hpBonus,
        maxHp: baseHp + hpBonus,
        attack: baseAttack,
        items: loadout.startingItems?.slice() ?? [],
        square: loadout.startingSquare as PieceState['square'],
      });
    });

    // 캐릭터 패시브 중 turn-start healPerTurn 합산 (SPEC §5.6 트리거 분류).
    const turnStartHeal = character.passives
      .filter((p) => p.trigger === 'turn-start')
      .reduce((acc, p) => acc + (p.effect.healPerTurn ?? 0), 0);
    this.boardChess = createAdventureChessManager({
      pieces,
      globalModifiers: [...this.run.globalModifiers],
      initialFen: STARTING_FEN,
      turnStartHeal,
    });
    resetStatusOngoing();
    setInteractive(true);
    this.syncBoard(undefined, { instant: true });

    // Act 및 보스 여부에 따른 Stockfish AI 난이도 결정
    const isBoss = this.currentNode()?.type === 'boss';
    const act = this.run.act;
    let uciElo = 800;
    let skillLevel = 1;

    if (isBoss) {
      if (act === 1) {
        uciElo = 1200;
        skillLevel = 3;
      } else if (act === 2) {
        uciElo = 1500;
        skillLevel = 5;
      } else {
        uciElo = 1800;
        skillLevel = 8;
      }
    } else {
      if (act === 2) {
        uciElo = 1000;
        skillLevel = 2;
      } else if (act === 3) {
        uciElo = 1200;
        skillLevel = 4;
      }
    }

    void getEngine().init().then(() => {
      getEngine().newGame();
      getEngine().setOptions({
        limitStrength: true,
        uciElo,
        skillLevel,
      });
    }).catch((err) => {
      console.warn('Failed to init Stockfish for adventure:', err);
    });
  }

  saveBoardPiecesToRun(): void {
    if (!this.boardChess) return;
    const boardPieces = this.boardChess.getPieces().filter((p) => p.side === 'w');
    this.run = {
      ...this.run,
      pieces: this.run.pieces.map((original) => {
        const bp = boardPieces.find((b) => b.id === original.id);
        if (bp) {
          return {
            ...original,
            hp: bp.hp,
            maxHp: bp.maxHp,
            attack: bp.attack,
            items: bp.items.slice(),
          };
        }
        // 보드에 없는 아군 기물은 캡처되어 제거된 것이므로 hp를 0으로 마킹 (사망 처리)
        return {
          ...original,
          hp: 0,
        };
      }),
    };
    this.commit();
  }

  /**
   * 보스 페이즈 전환 — SPEC §5.4 "플레이어 기물 HP/아이템 보존". 현재 boardChess의
   * 백 진영 스냅샷을 enterBoardNode로 넘겨 보드 위치만 새로 시작.
   */
  startNextBossPhase(): void {
    if (!this.boardChess) return;
    // 다음 페이즈 전이 전에 기물 HP 상태를 런에 백업
    this.saveBoardPiecesToRun();
    const playerPieces = this.boardChess.getPieces().filter((p) => p.side === 'w');
    this.enterBoardNode(playerPieces);
  }

  leaveBoardNode(): void {
    if (this.aiReplyTimer) {
      clearTimeout(this.aiReplyTimer);
      this.aiReplyTimer = null;
    }
    this.boardChess = null;
    setAdventurePieceHps(undefined);
  }

  /**
   * 사용자가 보드 위 무브를 시도. 결과를 store에 반영하고 종료 조건을 검사.
   */
  attemptBoardMove(uci: string): AdventureMoveResult | undefined {
    if (!this.boardChess) return undefined;
    const result = this.boardChess.tryMove(uci);
    if (!result.ok) return result;
    this.syncBoard(result.lastMove);
    if (this.checkBoardEndCondition()) return result;
    // 사용자 차례 끝 — AI 응답을 살짝 지연시켜 sprite Tween이 화면에 보이게.
    const delay = settings.accessibility.reducedMotion ? 0 : 250;
    this.aiReplyTimer = setTimeout(() => {
      this.aiReplyTimer = null;
      this.scheduleAiReply();
    }, delay);
    return result;
  }

  /**
   * 사용자가 기물의 액티브 스킬을 사용. 결과를 store에 반영하고 종료 조건을 검사.
   */
  attemptActiveSkill(pieceId: string, targetSquare?: Square): AdventureMoveResult | undefined {
    if (!this.boardChess) return undefined;
    const result = this.boardChess.useActiveSkill(pieceId, targetSquare);
    if (!result.ok) return result;
    this.syncBoard(undefined);
    if (this.checkBoardEndCondition()) return result;
    // 사용자 차례 끝 — AI 응답 지연
    const delay = settings.accessibility.reducedMotion ? 0 : 250;
    this.aiReplyTimer = setTimeout(() => {
      this.aiReplyTimer = null;
      this.scheduleAiReply();
    }, delay);
    return result;
  }

  async scheduleAiReply(): Promise<void> {
    if (!this.boardChess) return;
    if (this.boardChess.turn() !== 'b') return;

    const delay = settings.accessibility.reducedMotion ? 0 : 400;

    const engine = getEngine();
    if (engine.isReady()) {
      try {
        engine.position(this.boardChess.getFen());
        const result = await engine.go({ movetime: 200 });
        if (this.boardChess && this.boardChess.turn() === 'b') {
          if (result.bestmove && result.bestmove !== '(none)' && result.bestmove.length >= 4) {
            this.aiReplyTimer = setTimeout(() => {
              this.aiReplyTimer = null;
              if (!this.boardChess) return;
              const moveResult = this.boardChess.tryMove(result.bestmove);
              if (moveResult.ok) {
                this.syncBoard(moveResult.lastMove);
                this.checkBoardEndCondition();
              } else {
                this.fallbackRandomMove();
              }
            }, delay);
            return;
          }
        }
      } catch (err) {
        console.error('Adventure Stockfish go failed, fallback to random:', err);
      }
    }

    this.fallbackRandomMove();
  }

  private fallbackRandomMove(): void {
    if (!this.boardChess) return;
    const legalUcis = this.collectLegalUcis('b');
    if (legalUcis.length === 0) {
      this.checkBoardEndCondition();
      return;
    }
    const pick = legalUcis[Math.floor(Math.random() * legalUcis.length)]!;
    const delay = settings.accessibility.reducedMotion ? 0 : 400;
    this.aiReplyTimer = setTimeout(() => {
      this.aiReplyTimer = null;
      if (!this.boardChess) return;
      const result = this.boardChess.tryMove(pick);
      if (!result.ok) return;
      this.syncBoard(result.lastMove);
      this.checkBoardEndCondition();
    }, delay);
  }

  private collectLegalUcis(_color: 'w' | 'b'): string[] {
    if (!this.boardChess) return [];
    const pieces = this.boardChess.getPieces();
    const ucis: string[] = [];
    for (const piece of pieces) {
      if (piece.side !== _color) continue;
      const dests = this.boardChess.legalDestinations(piece.square);
      for (const d of dests) {
        ucis.push(`${piece.square}${d}`);
      }
    }
    return ucis;
  }

  private syncBoard(move?: MoveDescriptor, opts?: { instant?: boolean }): void {
    if (!this.boardChess) return;
    const hps = this.boardChess.getPieces().map((p) => ({
      square: p.square,
      hp: p.hp,
      maxHp: p.maxHp,
    }));
    const lastMove: LastMove | undefined = move ? toRichLastMove(move) : undefined;
    setAdventureBoardSnapshot(this.boardChess.getFen(), hps, lastMove, opts);
  }

  /**
   * 보드 종료 조건 검사. 처리되었다면 true.
   * winner 계산은 호출처 인자가 아니라 `chess.turn()`(현재 무브 권한 진영)을 기준으로 한다 —
   * `isCheckmate`는 현재 turn 진영이 체크 상태 + 합법수 없음이므로 그 진영이 loser, 반대가
   * winner. 호출처에서 turnAfterMove 같은 메타 인자를 넘기던 이전 구조는 의미가 모호해
   * (예: scheduleAiReply의 무브 적용 후 vs 무브 실패 후 같은 'b' 전달) winner를 정 반대로
   * 설정하는 버그를 만들었었다.
   */
  private checkBoardEndCondition(): boolean {
    if (!this.boardChess) return false;
    const node = this.currentNode();
    const isBoss = node?.type === 'boss';
    const whiteKingHp = this.boardChess.getKingHp('w');
    const blackKingHp = this.boardChess.getKingHp('b');

    // 플레이어 킹 HP가 0 이하면 노드 종류 불문하고 항상 패배
    if (whiteKingHp <= 0) {
      setStatus({ kind: 'resignation', winner: 'b' });
      return true;
    }

    // 일반 노드에서 적 킹 HP가 0 이하면 즉시 승리
    if (!isBoss && blackKingHp <= 0) {
      this.saveBoardPiecesToRun();
      setStatus({ kind: 'checkmate', winner: 'w' });
      return true;
    }

    if (this.boardChess.isCheckmate()) {
      // chess.turn()이 체크메이트당한 진영(loser). winner는 그 반대.
      const loser = this.boardChess.turn();
      const winner: 'w' | 'b' = loser === 'w' ? 'b' : 'w';
      if (winner === 'w') {
        this.saveBoardPiecesToRun();
      }
      setStatus({ kind: 'checkmate', winner });
      return true;
    }
    if (this.boardChess.isStalemate()) {
      // SPEC §5.5: 플레이어의 차례(w)에 합법 수가 없을 시 패배.
      // 적/보스의 차례(b)에 합법 수가 없을 시 플레이어 승리(또는 페이즈 클리어).
      const loser = this.boardChess.turn();
      if (loser === 'w') {
        setStatus({ kind: 'resignation', winner: 'b' });
      } else {
        this.saveBoardPiecesToRun();
        setStatus({ kind: 'checkmate', winner: 'w' });
      }
      return true;
    }
    return false;
  }

  /** 보드 매니저 외부 접근(애니메이션 컴포넌트 등에서 읽기 전용). */
  getBoardChess(): AdventureChessManager | null {
    return this.boardChess;
  }

  private materializePieces(character: Character): AdventurePiece[] {
    return character.startingPieces.map((loadout, idx) => {
      const base = basePieceStats(loadout.type);
      const hp = loadout.baseStatsOverride?.hp ?? base.hp;
      const attack = loadout.baseStatsOverride?.attack ?? base.attack;
      return {
        id: `${loadout.side === 'w' ? 'p' : 'e'}-${idx}-${loadout.side}-${loadout.type}-${loadout.startingSquare}`,
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

