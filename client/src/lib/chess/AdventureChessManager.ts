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

  /** SPEC §5.6 트리거 발화 — 매 턴 시작 시 healPerTurn. */
  function applyTurnStartHeal(side: 'w' | 'b'): void {
    if (turnStartHeal <= 0) return;
    // 차례 진영 + chess.js 무브 수 조합으로 멱등 키.
    const key = `${side}:${chess.moves().length}`;
    if (lastHealedKey === key) return;
    lastHealedKey = key;
    for (const piece of piecesById.values()) {
      if (piece.side !== side) continue;
      const newHp = Math.min(piece.maxHp, piece.hp + turnStartHeal);
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

    // 3. 데미지 계산
    const damage = effectiveAttack(attacker, globalMods);
    const remainingHp = defender.hp - damage;

    if (remainingHp > 0) {
      // 4a. 캡처 실패 — defender HP만 감소, attacker 원위치 (체스 무브 적용 안 함)
      // chess.js 무브를 적용하지 않으므로 active color가 그대로 남아 후속 차례가
      // 멈춘다. swapTurnOnly로 차례만 넘긴다 (SPEC §5.1 "공격 시도 = 한 턴 소비").
      defender.hp = remainingHp;
      chess.swapTurnOnly();
      return {
        ok: true,
        outcome: {
          kind: 'damaged',
          attackerId: attacker.id,
          defenderId: defender.id,
          damage,
          defenderRemainingHp: remainingHp,
          revert: true,
        },
        fen: chess.getFen(),
      };
    }

    // 4b. 캡처 성공 — chess.js 무브 진짜로 적용
    const real = chess.tryMove(uci);
    if (!real.ok) {
      return { ok: false, reason: real.reason, outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    // capturedSquare에서 defender 제거 (앙파상은 capturedSquare !== to)
    piecesBySquare.delete(defender.square);
    piecesById.delete(defender.id);
    relocatePiece(attacker, real.move.from, real.move.to);
    if (real.move.promotion) applyPromotion(attacker, real.move.promotion);
    return {
      ok: true,
      outcome: {
        kind: 'captured',
        attackerId: attacker.id,
        capturedId: defender.id,
        damage,
        move: real.move,
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
