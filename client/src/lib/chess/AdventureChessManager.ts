import type { Piece as AdventurePiece, Modifier } from '@shared/adventure';
import {
  createChessManager,
  type ChessManager,
  type Color,
  type MoveDescriptor,
  type Square,
} from './ChessManager';

/**
 * 모험 모드 전용 전투 매니저.
 *
 * SPEC §5.1~5.5의 동작을 캡슐화한다:
 * - 캡처 시도 시 데미지 = attacker.attack; defender.hp <= 0이면 캡처 진행, 그렇지
 *   않으면 attacker 원위치 + defender HP만 감소.
 * - 앙파상: 스쳐 지나간 폰의 실제 위치를 추적해 HP 차감.
 * - 폰 승급: 잔여 HP 무관하게 베이스 스탯 갱신, 슬롯 아이템은 유지.
 * - 스테일메이트: 일반 노드는 패배, 보스 노드는 양측 진행 불가 시 따로 처리.
 *
 * 본 모듈은 도메인 로직만 제공하고, "패배/승리 전이"는 컨트롤러가 결정한다.
 */

export interface PieceState extends AdventurePiece {
  /** chess.js 좌표 (a8..h1). 무브 후 갱신된다. */
  square: Square;
}

export type CombatOutcome =
  | { kind: 'noop' }
  | {
      kind: 'damaged';
      attackerId: string;
      defenderId: string;
      damage: number;
      defenderRemainingHp: number;
      /** attacker는 원위치로 돌아간다 — chess.js 무브를 뒤집어야 함을 의미. */
      revert: true;
    }
  | {
      kind: 'captured';
      attackerId: string;
      capturedId: string;
      damage: number;
      move: MoveDescriptor;
      attackerDied?: boolean;
    }
  | {
      kind: 'promoted';
      pieceId: string;
      move: MoveDescriptor;
    };

export interface AdventureMoveResult {
  ok: boolean;
  reason?: string;
  outcome: CombatOutcome;
  fen: string;
  /** 보드가 이동한 케이스(damaged 제외)에서 chess.js MoveDescriptor. 컨트롤러가 LastMove로 합성. */
  lastMove?: MoveDescriptor;
}

export interface AdventureChessManagerOptions {
  pieces: PieceState[];
  globalModifiers?: Modifier[];
  initialFen?: string;
  /** 매 턴 시작 시 적용되는 캐릭터 패시브 (turn-start healPerTurn 등). */
  turnStartHeal?: number;
}

function effectiveAttack(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce((acc, item) => acc + (item.modifier.attack ?? 0), 0);
  const globalBonus = globalMods.reduce((acc, mod) => acc + (mod.attack ?? 0), 0);
  return Math.max(0, piece.attack + itemBonus + globalBonus);
}

function effectiveMaxHp(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce((acc, item) => acc + (item.modifier.hp ?? 0), 0);
  const globalBonus = globalMods.reduce((acc, mod) => acc + (mod.hp ?? 0), 0);
  return Math.max(1, piece.maxHp + itemBonus + globalBonus);
}

/** 피격 시 attacker에게 되돌려주는 반사 데미지 — 장착 + 글로벌 합산. */
function effectiveThornsDamage(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce(
    (acc, item) => acc + (item.modifier.thornsDamage ?? 0),
    0,
  );
  const globalBonus = globalMods.reduce(
    (acc, mod) => acc + (mod.thornsDamage ?? 0),
    0,
  );
  return Math.max(0, itemBonus + globalBonus);
}

/** turn-start 시 piece 1개에 적용되는 healPerTurn — 아이템 + 글로벌 합산. */
function effectivePieceHealPerTurn(
  piece: AdventurePiece,
  globalMods: Modifier[],
): number {
  const itemBonus = piece.items.reduce(
    (acc, item) => acc + (item.modifier.healPerTurn ?? 0),
    0,
  );
  const globalBonus = globalMods.reduce(
    (acc, mod) => acc + (mod.healPerTurn ?? 0),
    0,
  );
  return Math.max(0, itemBonus + globalBonus);
}

function basePieceStats(type: AdventurePiece['type']): { hp: number; attack: number } {
  // docs/modes/ADVENTURE.md §5 베이스 스탯 표. 캐릭터별 차이는 baseStatsOverride.
  switch (type) {
    case 'p':
      return { hp: 10, attack: 5 };
    case 'n':
      return { hp: 25, attack: 10 };
    case 'b':
      return { hp: 25, attack: 10 };
    case 'r':
      return { hp: 35, attack: 15 };
    case 'q':
      return { hp: 40, attack: 20 };
    case 'k':
      return { hp: 50, attack: 8 };
  }
}

export function createAdventureChessManager(opts: AdventureChessManagerOptions) {
  const chess: ChessManager = createChessManager(opts.initialFen);
  const piecesBySquare = new Map<Square, PieceState>();
  const piecesById = new Map<string, PieceState>();
  let globalMods: Modifier[] = opts.globalModifiers ?? [];
  const turnStartHeal = opts.turnStartHeal ?? 0;

  for (const piece of opts.pieces) {
    piecesBySquare.set(piece.square, piece);
    piecesById.set(piece.id, piece);
  }

  // 멱등성 보장: 같은 차례에 두 번 호출되어도 한 번만 힐.
  let lastHealedKey = '';

  /**
   * SPEC §5.6 트리거 발화 — 매 턴 시작 시 healPerTurn.
   * - 캐릭터 패시브 healPerTurn(opts.turnStartHeal) — 자기 진영 모든 piece에 동일 적용.
   * - 아이템·글로벌 modifier healPerTurn — 장착·범위에 따라 piece별 차등 적용.
   */
  function applyTurnStartHeal(side: 'w' | 'b'): void {
    // 차례 진영 + chess.js 무브 수 조합으로 멱등 키.
    const key = `${side}:${chess.moves().length}`;
    if (lastHealedKey === key) return;
    lastHealedKey = key;
    for (const piece of piecesById.values()) {
      if (piece.side !== side) continue;
      const itemHeal = effectivePieceHealPerTurn(piece, globalMods);
      const totalHeal = turnStartHeal + itemHeal;
      if (totalHeal <= 0) continue;
      const newHp = Math.min(piece.maxHp, piece.hp + totalHeal);
      piece.hp = newHp;
    }
  }

  function getPieces(): PieceState[] {
    return Array.from(piecesById.values());
  }

  function getPieceAt(sq: Square): PieceState | undefined {
    return piecesBySquare.get(sq);
  }

  function getKingHp(color: Color): number {
    for (const piece of piecesById.values()) {
      if (piece.type === 'k' && piece.side === color) return piece.hp;
    }
    return 0;
  }

  function setGlobalModifiers(mods: Modifier[]): void {
    globalMods = mods;
  }

  function getKingPenalty(type: AdventurePiece['type']): number {
    switch (type) {
      case 'p': return 2;
      case 'n': return 5;
      case 'b': return 5;
      case 'r': return 8;
      case 'q': return 12;
      default: return 0;
    }
  }

  function applyKingPenalty(penalty: number): void {
    if (penalty <= 0) return;
    for (const piece of piecesById.values()) {
      if (piece.type === 'k' && piece.side === 'w') {
        piece.hp = Math.max(0, piece.hp - penalty);
        break;
      }
    }
  }

  function tryMove(uci: string): AdventureMoveResult {
    if (uci.length < 4) {
      return { ok: false, reason: 'invalid-uci', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const attacker = piecesBySquare.get(from);
    if (!attacker) {
      return { ok: false, reason: 'no-piece', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    // 턴 시작 시점 패시브 발화 (현재 차례 진영에 적용 — 무브 직전에 한 번).
    applyTurnStartHeal(chess.turn());

    // 1. chess.js로 합법성 검증 + 메타데이터 수집 (preview)
    const preview = chess.previewMove(uci);
    if (!preview.ok) {
      return { ok: false, reason: preview.reason, outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    const move = preview.move;

    // 2. 캡처 대상 결정 (앙파상 포함)
    const capturedSquare = move.capturedSquare;
    const defender = capturedSquare ? piecesBySquare.get(capturedSquare) : undefined;

    if (!defender) {
      // 캡처 없음 — 그대로 적용 (승급 케이스 처리)
      const real = chess.tryMove(uci);
      if (!real.ok) {
        return { ok: false, reason: real.reason, outcome: { kind: 'noop' }, fen: chess.getFen() };
      }
      relocatePiece(attacker, real.move.from, real.move.to);
      if (real.move.promotion) {
        applyPromotion(attacker, real.move.promotion);
        return {
          ok: true,
          outcome: { kind: 'promoted', pieceId: attacker.id, move: real.move },
          fen: real.move.fen,
          lastMove: real.move,
        };
      }
      return { ok: true, outcome: { kind: 'noop' }, fen: real.move.fen, lastMove: real.move };
    }

    // 3. 캡처가 있는 경우 -> FIDE 룰대로 캡처는 100% 무조건 먼저 성공
    const real = chess.tryMove(uci);
    if (!real.ok) {
      return { ok: false, reason: real.reason, outcome: { kind: 'noop' }, fen: chess.getFen() };
    }

    // 방어자 기물 제거
    piecesBySquare.delete(defender.square);
    piecesById.delete(defender.id);

    // 아군 기물이 캡처당했을 시 킹 HP 전가 패널티 적용
    if (defender.side === 'w') {
      applyKingPenalty(getKingPenalty(defender.type));
    }

    // 공격자의 피해 정산 (반격 데미지 = 방어자 attack + thorns)
    const attackerDamage = defender.attack + effectiveThornsDamage(defender, globalMods);
    let attackerDied = false;

    if (attackerDamage > 0) {
      if (attacker.type === 'k') {
        // 킹이 반격 피해를 입음
        attacker.hp = Math.max(0, attacker.hp - attackerDamage);
      } else {
        // 일반 기물이 반격 피해를 입음
        attacker.hp -= attackerDamage;
        if (attacker.hp <= 0) {
          attackerDied = true;
          // 공격 기물 자멸 -> 보드 판에서 제거
          chess.removePiece(real.move.to);
          piecesBySquare.delete(real.move.to);
          piecesById.delete(attacker.id);
          
          // 자멸한 기물이 아군이면 킹 HP 전가 패널티 적용
          if (attacker.side === 'w') {
            applyKingPenalty(getKingPenalty(attacker.type));
          }
        }
      }
    }

    if (!attackerDied) {
      // 공격 기물이 살아남았을 경우 위치 갱신 및 승급 체크
      relocatePiece(attacker, real.move.from, real.move.to);
      if (real.move.promotion) {
        applyPromotion(attacker, real.move.promotion);
      }
    }

    return {
      ok: true,
      outcome: {
        kind: 'captured',
        attackerId: attacker.id,
        capturedId: defender.id,
        damage: defender.attack,
        move: real.move,
        attackerDied,
      },
      fen: real.move.fen,
      lastMove: real.move,
    };
  }

  function relocatePiece(piece: PieceState, from: Square, to: Square): void {
    if (from === to) return;
    piecesBySquare.delete(from);
    piece.square = to;
    piecesBySquare.set(to, piece);
  }

  function applyPromotion(piece: PieceState, newType: AdventurePiece['type']): void {
    const baseStats = basePieceStats(newType);
    piece.type = newType;
    piece.attack = baseStats.attack;
    piece.maxHp = baseStats.hp;
    piece.hp = baseStats.hp;
    // 슬롯 아이템(piece.items)은 유지 — SPEC §5.3 슬롯 보존
  }

  return {
    chess,
    getFen: () => chess.getFen(),
    turn: () => chess.turn(),
    legalDestinations: (sq: Square) => chess.legalDestinations(sq),
    getPieces,
    getPieceAt,
    getKingHp,
    setGlobalModifiers,
    tryMove,
    isStalemate: () => chess.evaluateNaturalStatus().kind === 'stalemate',
    isCheckmate: () => chess.evaluateNaturalStatus().kind === 'checkmate',
    isInCheck: () => chess.isInCheck(),
    moves: () => chess.moves(),
  };
}

export type AdventureChessManager = ReturnType<typeof createAdventureChessManager>;

export { effectiveAttack, effectiveMaxHp, basePieceStats };
