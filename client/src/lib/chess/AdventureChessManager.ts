import type { Piece as AdventurePiece, Modifier, PieceSkill } from '@shared/adventure';
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
 * - 결사의 캡처: FIDE 룰대로 캡처는 100% 무조건 먼저 성공하고, 성공 직후 attacker는 defender의 ATK 및 thornsDamage만큼 반격 피해를 입으며, HP 0 이하 시 양방향 소멸 처리.
 * - 앙파상: 스쳐 지나간 폰의 실제 위치를 추적해 HP 차감 및 반격 피해 적용.
 * - 폰 승급: 잔여 HP 무관하게 베이스 스탯 갱신, 슬롯 아이템은 유지.
 * - 스테일메이트: 일반 노드는 패배, 보스 노드는 양측 진행 불가 시 따로 처리.
 *
 * 본 모듈은 도메인 로직만 제공하고, "패배/승리 전이"는 컨트롤러가 결정한다.
 */

export interface PieceState extends AdventurePiece {
  /** chess.js 좌표 (a8..h1). 무브 후 갱신된다. */
  square: Square;
  shieldTurns?: number;
  mitigationTurns?: number;
  thornsReflectTurns?: number;
  poisonTurns?: number;
  poisonDamage?: number;
  tempAtkBonus?: number;
  tempAtkBonusTurns?: number;
  bindTurns?: number;
  weakenTurns?: number;
  skill?: PieceSkill;
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
  characterId?: string;
}

interface SynergyCheckResult {
  hasIronKnight: boolean;
  hasArcaneSage: boolean;
  hasViper: boolean;
  hasSunShield: boolean;
}

export function getSetSynergyIds(piece: AdventurePiece): SynergyCheckResult {
  if (piece.items.length < 2) {
    return { hasIronKnight: false, hasArcaneSage: false, hasViper: false, hasSunShield: false };
  }
  const ids = new Set(piece.items.map((i) => i.id));
  return {
    hasIronKnight: ids.has('iron-shield') && (ids.has('leather-armor') || ids.has('aegis-plate') || ids.has('dragon-scale')),
    hasArcaneSage: ids.has('oak-staff') && ids.has('runic-gauntlet'),
    hasViper: ids.has('sharp-blade') && ids.has('serpent-fang'),
    hasSunShield: ids.has('sturdy-cloak') && ids.has('sunforged-blade'),
  };
}

function getSynergyModifier(piece: AdventurePiece): Modifier {
  const syn = getSetSynergyIds(piece);
  const mod: Modifier = {};
  if (syn.hasIronKnight) {
    mod.hp = 15;
    mod.thornsDamage = 4;
  }
  if (syn.hasSunShield) {
    mod.attack = 2;
  }
  return mod;
}

function effectiveAttack(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce((acc, item) => acc + (item.modifier.attack ?? 0), 0);
  const globalBonus = globalMods.reduce((acc, mod) => acc + (mod.attack ?? 0), 0);
  const synergyBonus = getSynergyModifier(piece).attack ?? 0;
  const tempBonus = (piece as PieceState).tempAtkBonus ?? 0;
  let val = piece.attack + itemBonus + globalBonus + synergyBonus + tempBonus;
  if ((piece as PieceState).weakenTurns && ((piece as PieceState).weakenTurns ?? 0) > 0) {
    val = Math.floor(val * 0.5);
  }
  return Math.max(0, val);
}

function effectiveMaxHp(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce((acc, item) => acc + (item.modifier.hp ?? 0), 0);
  const globalBonus = globalMods.reduce((acc, mod) => acc + (mod.hp ?? 0), 0);
  const synergyBonus = getSynergyModifier(piece).hp ?? 0;
  return Math.max(1, piece.maxHp + itemBonus + globalBonus + synergyBonus);
}

/** 피격 시 attacker에게 되돌려주는 반사 데미지 — 장착 + 글로벌 + 시너지 + 버프 합산. */
function effectiveThornsDamage(piece: AdventurePiece, globalMods: Modifier[]): number {
  const itemBonus = piece.items.reduce(
    (acc, item) => acc + (item.modifier.thornsDamage ?? 0),
    0,
  );
  const globalBonus = globalMods.reduce(
    (acc, mod) => acc + (mod.thornsDamage ?? 0),
    0,
  );
  const synergyBonus = getSynergyModifier(piece).thornsDamage ?? 0;
  const reflectBonus = (piece as PieceState).thornsReflectTurns && ((piece as PieceState).thornsReflectTurns ?? 0) > 0 ? 8 : 0;
  return Math.max(0, itemBonus + globalBonus + synergyBonus + reflectBonus);
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

function initPieceSkill(type: AdventurePiece['type']): PieceSkill | undefined {
  switch (type) {
    case 'p': return { name: '진격의 방패', cooldownTurns: 5, currentCooldown: 0, hasUsedThisMatch: false };
    case 'n': return { name: '번개 돌진', cooldownTurns: 6, currentCooldown: 0, hasUsedThisMatch: false };
    case 'b': return { name: '성스러운 치유', cooldownTurns: 4, currentCooldown: 0, hasUsedThisMatch: false };
    case 'r': return { name: '강철 방벽', cooldownTurns: 7, currentCooldown: 0, hasUsedThisMatch: false };
    case 'q': return { name: '진공의 손길', cooldownTurns: 8, currentCooldown: 0, hasUsedThisMatch: false };
    case 'k': return { name: '왕의 진노', cooldownTurns: 99, currentCooldown: 0, hasUsedThisMatch: false };
  }
}

export function createAdventureChessManager(opts: AdventureChessManagerOptions) {
  const chess: ChessManager = createChessManager(opts.initialFen);
  const piecesBySquare = new Map<Square, PieceState>();
  const piecesById = new Map<string, PieceState>();
  let globalMods: Modifier[] = opts.globalModifiers ?? [];
  const turnStartHeal = opts.turnStartHeal ?? 0;
  const characterId = opts.characterId;

  function getStatusOnHitModifiers(piece: AdventurePiece, globalMods: Modifier[]): { bind: number; weaken: number; lifesteal: number } {
    let bind = piece.items.reduce((acc, item) => acc + (item.modifier.bindOnHit ?? 0), 0);
    bind += globalMods.reduce((acc, mod) => acc + (mod.bindOnHit ?? 0), 0);

    let weaken = piece.items.reduce((acc, item) => acc + (item.modifier.weakenOnHit ?? 0), 0);
    weaken += globalMods.reduce((acc, mod) => acc + (mod.weakenOnHit ?? 0), 0);

    let lifesteal = piece.items.reduce((acc, item) => acc + (item.modifier.lifestealRatio ?? 0), 0);
    lifesteal += globalMods.reduce((acc, mod) => acc + (mod.lifestealRatio ?? 0), 0);

    return { bind, weaken, lifesteal };
  }

  function getRookCastleSquares(kingFrom: Square, kingTo: Square): { from: Square; to: Square } | null {
    const fileTo = kingTo.charAt(0);
    const rank = kingFrom.charAt(1);
    if (fileTo === 'g') {
      return { from: `h${rank}` as Square, to: `f${rank}` as Square };
    }
    if (fileTo === 'c') {
      return { from: `a${rank}` as Square, to: `d${rank}` as Square };
    }
    return null;
  }

  for (const piece of opts.pieces) {
    if (!piece.skill) {
      piece.skill = initPieceSkill(piece.type);
    }
    piecesBySquare.set(piece.square, piece);
    piecesById.set(piece.id, piece);
  }

  // 멱등성 보장: 같은 차례에 두 번 호출되어도 한 번만 발화.
  let lastHealedKey = '';

  function isPathBlocked(from: Square, to: Square): boolean {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const f1 = files.indexOf(from.charAt(0));
    const r1 = Number(from.charAt(1));
    const f2 = files.indexOf(to.charAt(0));
    const r2 = Number(to.charAt(1));

    const df = Math.sign(f2 - f1);
    const dr = Math.sign(r2 - r1);

    let currF = f1 + df;
    let currR = r1 + dr;

    while (currF !== f2 || currR !== r2) {
      if (currF < 0 || currF > 7 || currR < 1 || currR > 8) {
        return true;
      }
      const sq = `${files[currF]}${currR}` as Square;
      if (piecesBySquare.has(sq)) {
        return true;
      }
      currF += df;
      currR += dr;
    }
    return false;
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

  function calculateMitigatedDamage(victim: PieceState, rawDamage: number): void {
    if (rawDamage <= 0) return;
    
    // 폰 '진격의 방패' (피해 무효화 보호막)
    if (victim.shieldTurns && victim.shieldTurns > 0) {
      victim.shieldTurns = 0; // 방패 소모
      return;
    }

    let finalDamage = rawDamage;
    // 룩 '강철 방벽' (피해 50% 경감)
    if (victim.mitigationTurns && victim.mitigationTurns > 0) {
      finalDamage = Math.ceil(rawDamage * 0.5);
    }

    victim.hp = Math.max(0, victim.hp - finalDamage);
  }

  /**
   * SPEC §5.6 트리거 발화 — 매 턴 시작 시 버프/디버프 및 healPerTurn 적용.
   */
  function applyTurnStartHeal(side: 'w' | 'b'): void {
    const key = `${side}:${chess.moves().length}`;
    if (lastHealedKey === key) return;
    lastHealedKey = key;

    // 1. 해당 진영 기물들의 스킬 쿨다운 감소
    for (const piece of piecesById.values()) {
      if (piece.side === side && piece.skill) {
        piece.skill.currentCooldown = Math.max(0, piece.skill.currentCooldown - 1);
      }
    }

    // 2. 맹독(Poison) 피해 정산 및 기물 제거
    for (const piece of piecesById.values()) {
      if (piece.side === side && piece.poisonTurns && piece.poisonTurns > 0) {
        const pDamage = piece.poisonDamage ?? 3;
        piece.hp = Math.max(0, piece.hp - pDamage);
        piece.poisonTurns -= 1;
        
        if (piece.hp <= 0) {
          if (piece.type === 'k') {
            piece.hp = 0;
          } else {
            chess.removePiece(piece.square);
            piecesBySquare.delete(piece.square);
            piecesById.delete(piece.id);
            
            if (piece.side === 'w') {
              applyKingPenalty(getKingPenalty(piece.type));
            }
          }
        }
      }
    }

    // 3. 기물들의 버프 턴수 및 임시 스탯 버프 해제
    for (const piece of piecesById.values()) {
      if (piece.side === side) {
        if (piece.shieldTurns && piece.shieldTurns > 0) piece.shieldTurns -= 1;
        if (piece.mitigationTurns && piece.mitigationTurns > 0) piece.mitigationTurns -= 1;
        if (piece.thornsReflectTurns && piece.thornsReflectTurns > 0) piece.thornsReflectTurns -= 1;
        
        // 킹 왕의 진노 ATK 버프 해제
        if (piece.tempAtkBonus) {
          if (piece.tempAtkBonusTurns !== undefined) {
            piece.tempAtkBonusTurns -= 1;
            if (piece.tempAtkBonusTurns < 0) {
              delete piece.tempAtkBonus;
              delete piece.tempAtkBonusTurns;
            }
          } else {
            delete piece.tempAtkBonus;
          }
        }
      }
    }

    // 4. 턴 회복 힐 적용
    for (const piece of piecesById.values()) {
      if (piece.side !== side) continue;
      const itemHeal = effectivePieceHealPerTurn(piece, globalMods);
      const totalHeal = turnStartHeal + itemHeal;
      if (totalHeal <= 0) continue;
      const newHp = Math.min(piece.maxHp, piece.hp + totalHeal);
      piece.hp = newHp;
    }
  }

  function applyTurnEndStatusReduction(side: 'w' | 'b'): void {
    for (const piece of piecesById.values()) {
      if (piece.side === side) {
        if (piece.bindTurns && piece.bindTurns > 0) piece.bindTurns -= 1;
        if (piece.weakenTurns && piece.weakenTurns > 0) piece.weakenTurns -= 1;
      }
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

    if (attacker.bindTurns && attacker.bindTurns > 0) {
      return { ok: false, reason: 'bound-piece', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }

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

      // 캐슬링 처리: 룩의 piecesBySquare 및 square 갱신
      if (real.move.isCastle) {
        const rookCastle = getRookCastleSquares(real.move.from, real.move.to);
        if (rookCastle) {
          const rookPiece = piecesBySquare.get(rookCastle.from);
          if (rookPiece) {
            relocatePiece(rookPiece, rookCastle.from, rookCastle.to);

            // 요새단 패시브 발화: 캐슬링 참여 킹과 룩 HP +15 회복
            if (characterId === 'fortress') {
              attacker.hp = Math.min(attacker.maxHp, attacker.hp + 15);
              rookPiece.hp = Math.min(rookPiece.maxHp, rookPiece.hp + 15);
            }
          }
        }
      }

      applyTurnEndStatusReduction(attacker.side);

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

    // 적 킹(보스)을 공격하는 경우 — 캡처(소멸)가 아니라 데미지만 가하고 원위치로 돌아감 (damaged 분기)
    if (defender.type === 'k') {
      const dmg = effectiveAttack(attacker, globalMods);
      defender.hp = Math.max(0, defender.hp - dmg);

      // 독사의 이빨 세트 시너지 감지: 보스 킹 공격 시 맹독 부여
      const synIds = getSetSynergyIds(attacker);
      if (synIds.hasViper) {
        defender.poisonTurns = 3;
        defender.poisonDamage = 3;
      }

      // 신규 속박/약화 아이템 효과 적용
      const hits = getStatusOnHitModifiers(attacker, globalMods);
      if (hits.bind > 0) {
        defender.bindTurns = Math.max(defender.bindTurns ?? 0, hits.bind);
      }
      if (hits.weaken > 0) {
        defender.weakenTurns = Math.max(defender.weakenTurns ?? 0, hits.weaken);
      }

      // 공격자의 피해 정산 (반격 데미지 = 방어자(킹) attack + thorns)
      const attackerDamage = effectiveAttack(defender, globalMods) + effectiveThornsDamage(defender, globalMods);
      let attackerDied = false;

      if (attackerDamage > 0) {
        if (attacker.type === 'k') {
          calculateMitigatedDamage(attacker, attackerDamage);
        } else {
          calculateMitigatedDamage(attacker, attackerDamage);
          if (attacker.hp <= 0) {
            attackerDied = true;
            // 공격 기물 자멸 -> 보드 판 원래 위치(from)에서 제거
            chess.removePiece(from);
            piecesBySquare.delete(from);
            piecesById.delete(attacker.id);

            // 자멸한 기물이 아군이면 킹 HP 전가 패널티 적용
            if (attacker.side === 'w') {
              applyKingPenalty(getKingPenalty(attacker.type));
            }
          }
        }
      }

      // 차례 교대 및 en-passant 권리 무효화 등을 위해 swapTurnOnly 호출
      chess.swapTurnOnly();
      applyTurnEndStatusReduction(attacker.side);

      return {
        ok: true,
        outcome: {
          kind: 'damaged',
          attackerId: attacker.id,
          defenderId: defender.id,
          damage: dmg,
          defenderRemainingHp: defender.hp,
          revert: true,
        },
        fen: chess.getFen(),
      };
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

    // 혼돈단 패시브 발화: 아군 폰이 적 캡처 성공 시 공격력 +2 영구 누적
    if (characterId === 'chaos' && attacker.type === 'p' && attacker.side === 'w') {
      attacker.attack += 2;
    }

    // 태양의 가호 세트 시너지 감지: sturdy-cloak + sunforged-blade 장착 시 아군 킹 8 힐, 장착 기물 ATK +2 영구 누적
    const synIds = getSetSynergyIds(attacker);
    if (synIds.hasSunShield) {
      attacker.attack += 2;
      for (const p of piecesById.values()) {
        if (p.type === 'k' && p.side === 'w') {
          p.hp = Math.min(p.maxHp, p.hp + 8);
          break;
        }
      }
    }

    // 공격자의 피해 정산 (반격 데미지 = 방어자 attack + thorns)
    const attackerDamage = effectiveAttack(defender, globalMods) + effectiveThornsDamage(defender, globalMods);
    let attackerDied = false;

    if (attackerDamage > 0) {
      if (attacker.type === 'k') {
        // 킹이 반격 피해를 입음 (경감 적용)
        calculateMitigatedDamage(attacker, attackerDamage);
      } else {
        // 일반 기물이 반격 피해를 입음 (경감 적용)
        calculateMitigatedDamage(attacker, attackerDamage);
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

      // 흡혈 처리
      const hits = getStatusOnHitModifiers(attacker, globalMods);
      if (hits.lifesteal > 0) {
        const healAmt = Math.round(effectiveAttack(attacker, globalMods) * hits.lifesteal);
        if (healAmt > 0) {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
        }
      }

      if (real.move.promotion) {
        applyPromotion(attacker, real.move.promotion);
      }
    }

    applyTurnEndStatusReduction(attacker.side);

    return {
      ok: true,
      outcome: {
        kind: 'captured',
        attackerId: attacker.id,
        capturedId: defender.id,
        damage: effectiveAttack(defender, globalMods),
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

  function useActiveSkill(pieceId: string, targetSquare?: Square): AdventureMoveResult {
    const attacker = piecesById.get(pieceId);
    if (!attacker || !attacker.skill) {
      return { ok: false, reason: 'no-piece-or-skill', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    if (attacker.side !== chess.turn()) {
      return { ok: false, reason: 'not-your-turn', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }
    if (attacker.skill.currentCooldown > 0 || attacker.skill.hasUsedThisMatch) {
      return { ok: false, reason: 'skill-on-cooldown', outcome: { kind: 'noop' }, fen: chess.getFen() };
    }

    applyTurnStartHeal(chess.turn());

    const hasArcaneSage = getSetSynergyIds(attacker).hasArcaneSage;
    const cooldownPenalty = hasArcaneSage ? 1 : 0;
    const effectMultiplier = hasArcaneSage ? 1.3 : 1.0;

    let skillUsed = false;

    switch (attacker.type) {
      case 'p': {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fileIdx = files.indexOf(attacker.square.charAt(0));
        const rank = Number(attacker.square.charAt(1));
        const forwardRank = attacker.side === 'w' ? rank + 1 : rank - 1;
        
        const targets: Square[] = [attacker.square];
        if (forwardRank >= 1 && forwardRank <= 8) {
          targets.push(`${files[fileIdx]}${forwardRank}` as Square);
        }
        if (fileIdx > 0) {
          targets.push(`${files[fileIdx - 1]}${rank}` as Square);
        }
        if (fileIdx < 7) {
          targets.push(`${files[fileIdx + 1]}${rank}` as Square);
        }

        targets.forEach((sq) => {
          const piece = piecesBySquare.get(sq);
          if (piece && piece.side === attacker.side) {
            piece.shieldTurns = 1;
          }
        });
        skillUsed = true;
        break;
      }
      case 'n': {
        if (!targetSquare) {
          return { ok: false, reason: 'target-required', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        const dests = chess.legalDestinations(attacker.square);
        if (!dests.includes(targetSquare) || piecesBySquare.has(targetSquare)) {
          return { ok: false, reason: 'invalid-target-square', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }

        const targetDmg = Math.round(8 * effectMultiplier);
        const uci = `${attacker.square}${targetSquare}`;
        const real = chess.tryMove(uci);
        if (!real.ok) {
          return { ok: false, reason: 'illegal-move', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }

        relocatePiece(attacker, real.move.from, real.move.to);

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fileIdx = files.indexOf(targetSquare.charAt(0));
        const rank = Number(targetSquare.charAt(1));

        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            const f = fileIdx + df;
            const r = rank + dr;
            if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
              const sq = `${files[f]}${r}` as Square;
              const enemy = piecesBySquare.get(sq);
              if (enemy && enemy.side !== attacker.side) {
                const hasViper = getSetSynergyIds(attacker).hasViper;
                if (hasViper) {
                  enemy.poisonTurns = 3;
                  enemy.poisonDamage = 3;
                }

                // 신규 속박/약화 아이템 효과 적용
                const hits = getStatusOnHitModifiers(attacker, globalMods);
                if (hits.bind > 0) {
                  enemy.bindTurns = Math.max(enemy.bindTurns ?? 0, hits.bind);
                }
                if (hits.weaken > 0) {
                  enemy.weakenTurns = Math.max(enemy.weakenTurns ?? 0, hits.weaken);
                }

                calculateMitigatedDamage(enemy, targetDmg);
                if (enemy.hp <= 0) {
                  if (enemy.type === 'k') {
                    enemy.hp = 0;
                  } else {
                    chess.removePiece(sq);
                    piecesBySquare.delete(sq);
                    piecesById.delete(enemy.id);
                    if (enemy.side === 'w') {
                      applyKingPenalty(getKingPenalty(enemy.type));
                    }
                  }
                }
              }
            }
          }
        }
        
        skillUsed = true;
        break;
      }
      case 'b': {
        if (!targetSquare) {
          return { ok: false, reason: 'target-required', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        const targetPiece = piecesBySquare.get(targetSquare);
        if (!targetPiece || targetPiece.side !== attacker.side) {
          return { ok: false, reason: 'invalid-ally-target', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        const f1 = attacker.square.charCodeAt(0);
        const r1 = attacker.square.charCodeAt(1);
        const f2 = targetSquare.charCodeAt(0);
        const r2 = targetSquare.charCodeAt(1);
        if (Math.abs(f1 - f2) !== Math.abs(r1 - r2)) {
          return { ok: false, reason: 'not-diagonal-path', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        if (isPathBlocked(attacker.square, targetSquare)) {
          return { ok: false, reason: 'heal-path-blocked', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }

        const healAmount = Math.round(20 * effectMultiplier);
        targetPiece.hp = Math.min(targetPiece.maxHp, targetPiece.hp + healAmount);
        
        skillUsed = true;
        break;
      }
      case 'r': {
        attacker.mitigationTurns = 2;
        attacker.thornsReflectTurns = 2;
        skillUsed = true;
        break;
      }
      case 'q': {
        if (!targetSquare) {
          return { ok: false, reason: 'target-required', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        const enemy = piecesBySquare.get(targetSquare);
        if (!enemy || enemy.side === attacker.side) {
          return { ok: false, reason: 'invalid-enemy-target', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        const f1 = attacker.square.charCodeAt(0);
        const r1 = attacker.square.charCodeAt(1);
        const f2 = targetSquare.charCodeAt(0);
        const r2 = targetSquare.charCodeAt(1);
        const isOrthogonal = f1 === f2 || r1 === r2;
        const isDiagonal = Math.abs(f1 - f2) === Math.abs(r1 - r2);
        if (!isOrthogonal && !isDiagonal) {
          return { ok: false, reason: 'not-straight-path', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }
        if (isPathBlocked(attacker.square, targetSquare)) {
          return { ok: false, reason: 'pull-path-blocked', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const f1Idx = files.indexOf(attacker.square.charAt(0));
        const r1Num = Number(attacker.square.charAt(1));
        const f2Idx = files.indexOf(targetSquare.charAt(0));
        const r2Num = Number(targetSquare.charAt(1));
        
        const df = Math.sign(f2Idx - f1Idx);
        const dr = Math.sign(r2Num - r1Num);
        
        const pullSquare = `${files[f1Idx + df]}${r1Num + dr}` as Square;
        
        if (piecesBySquare.has(pullSquare) && pullSquare !== targetSquare) {
          return { ok: false, reason: 'pull-path-blocked', outcome: { kind: 'noop' }, fen: chess.getFen() };
        }

        const removed = chess.removePiece(targetSquare);
        if (!removed.ok) return { ok: false, reason: 'cannot-pull-piece', outcome: { kind: 'noop' }, fen: chess.getFen() };
        
        const placed = chess.putPiece({ type: enemy.type, color: enemy.side }, pullSquare);
        if (!placed.ok) return { ok: false, reason: 'cannot-place-pulled-piece', outcome: { kind: 'noop' }, fen: chess.getFen() };

        piecesBySquare.delete(enemy.square);
        enemy.square = pullSquare;
        piecesBySquare.set(pullSquare, enemy);

        const dmg = Math.round(10 * effectMultiplier);
        
        const hasViper = getSetSynergyIds(attacker).hasViper;
        if (hasViper) {
          enemy.poisonTurns = 3;
          enemy.poisonDamage = 3;
        }

        // 신규 속박/약화 아이템 효과 적용
        const hits = getStatusOnHitModifiers(attacker, globalMods);
        if (hits.bind > 0) {
          enemy.bindTurns = Math.max(enemy.bindTurns ?? 0, hits.bind);
        }
        if (hits.weaken > 0) {
          enemy.weakenTurns = Math.max(enemy.weakenTurns ?? 0, hits.weaken);
        }

        calculateMitigatedDamage(enemy, dmg);
        if (enemy.hp <= 0) {
          if (enemy.type === 'k') {
            enemy.hp = 0;
          } else {
            chess.removePiece(pullSquare);
            piecesBySquare.delete(pullSquare);
            piecesById.delete(enemy.id);
            if (enemy.side === 'w') {
              applyKingPenalty(getKingPenalty(enemy.type));
            }
          }
        }

        skillUsed = true;
        break;
      }
      case 'k': {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fileIdx = files.indexOf(attacker.square.charAt(0));
        const rank = Number(attacker.square.charAt(1));

        const dmg = Math.round(10 * effectMultiplier);

        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const f = fileIdx + df;
            const r = rank + dr;
            if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
              const sq = `${files[f]}${r}` as Square;
              const enemy = piecesBySquare.get(sq);
              if (enemy && enemy.side !== attacker.side) {
                const hasViper = getSetSynergyIds(attacker).hasViper;
                if (hasViper) {
                  enemy.poisonTurns = 3;
                  enemy.poisonDamage = 3;
                }
                
                // 신규 속박/약화 아이템 효과 적용
                const hits = getStatusOnHitModifiers(attacker, globalMods);
                if (hits.bind > 0) {
                  enemy.bindTurns = Math.max(enemy.bindTurns ?? 0, hits.bind);
                }
                if (hits.weaken > 0) {
                  enemy.weakenTurns = Math.max(enemy.weakenTurns ?? 0, hits.weaken);
                }

                calculateMitigatedDamage(enemy, dmg);
                if (enemy.hp <= 0) {
                  if (enemy.type === 'k') {
                    enemy.hp = 0;
                  } else {
                    chess.removePiece(sq);
                    piecesBySquare.delete(sq);
                    piecesById.delete(enemy.id);
                    if (enemy.side === 'w') {
                      applyKingPenalty(getKingPenalty(enemy.type));
                    }
                  }
                }
              }
            }
          }
        }

        for (const p of piecesById.values()) {
          if (p.side === attacker.side) {
            p.tempAtkBonus = 5;
            p.tempAtkBonusTurns = 1;
          }
        }

        skillUsed = true;
        break;
      }
    }

    if (skillUsed) {
      attacker.skill.currentCooldown = Math.max(0, attacker.skill.cooldownTurns - cooldownPenalty);
      if (attacker.type === 'q' || attacker.type === 'k') {
        attacker.skill.hasUsedThisMatch = true;
      }
      chess.swapTurnOnly();
      applyTurnEndStatusReduction(attacker.side);

      return {
        ok: true,
        outcome: {
          kind: 'noop',
        },
        fen: chess.getFen(),
      };
    }

    return { ok: false, reason: 'unknown-error', outcome: { kind: 'noop' }, fen: chess.getFen() };
  }

  return {
    chess,
    getFen: () => chess.getFen(),
    turn: () => chess.turn(),
    legalDestinations: (sq: Square) => {
      const p = piecesBySquare.get(sq);
      if (p && p.bindTurns && p.bindTurns > 0) {
        return [];
      }
      return chess.legalDestinations(sq);
    },
    getPieces,
    getPieceAt,
    getKingHp,
    setGlobalModifiers,
    tryMove,
    useActiveSkill,
    isStalemate: () => chess.evaluateNaturalStatus().kind === 'stalemate',
    isCheckmate: () => chess.evaluateNaturalStatus().kind === 'checkmate',
    isInCheck: () => chess.isInCheck(),
    moves: () => chess.moves(),
  };
}

export type AdventureChessManager = ReturnType<typeof createAdventureChessManager>;

export { effectiveAttack, effectiveMaxHp, basePieceStats };
