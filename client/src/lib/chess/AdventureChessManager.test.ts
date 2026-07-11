import { describe, expect, it } from 'bun:test';
import { createAdventureChessManager } from './AdventureChessManager';
import type { PieceState } from './AdventureChessManager';
import type { Item } from '@shared/adventure';

const sharpBlade: Item = {
  id: 'sharp-blade',
  name: '날카로운 칼',
  rarity: 'common',
  category: 'stat',
  description: '공격력 +3',
  modifier: { attack: 3 }
};

const serpentFang: Item = {
  id: 'serpent-fang',
  name: '독사의 송곳니',
  rarity: 'rare',
  category: 'effect',
  description: '공격력 +7, 피격 시 반사 +3',
  modifier: { attack: 7, thornsDamage: 3 }
};

const bindingChain: Item = {
  id: 'binding-chain',
  name: '속박의 사슬',
  rarity: 'common',
  category: 'effect',
  description: '공격/스킬 성공 시 대상 1턴 속박(이동 불가)',
  modifier: { bindOnHit: 1 }
};

const weakingTotem: Item = {
  id: 'weaking-totem',
  name: '약화의 토템',
  rarity: 'uncommon',
  category: 'effect',
  description: '공격/스킬 성공 시 대상 1턴 약화(공격력 반감)',
  modifier: { weakenOnHit: 1 }
};

const vampireFang: Item = {
  id: 'vampire-fang',
  name: '뱀파이어의 송곳니',
  rarity: 'rare',
  category: 'effect',
  description: '기물이 적 캡처 시 공격력의 30%만큼 본인 HP 흡혈 회복',
  modifier: { lifestealRatio: 0.3 }
};

describe('AdventureChessManager', () => {
  it('should initialize pieces on board correctly', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 50,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    });

    expect(manager.getPieces().length).toBe(2);
    expect(manager.getPieceAt('e1')).toBeDefined();
    expect(manager.getPieceAt('e8')).toBeDefined();
  });

  it('should handle standard piece move', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-pawn',
        type: 'p',
        side: 'w',
        hp: 10,
        maxHp: 10,
        attack: 5,
        items: [],
        square: 'e2',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    });

    const result = manager.tryMove('e2e4');
    expect(result.ok).toBe(true);
    expect(result.outcome.kind).toBe('noop');
    expect(manager.getPieceAt('e4')).toBeDefined();
    expect(manager.getPieceAt('e2')).toBeUndefined();
  });

  it('should apply Viper poison debuff to boss King on attack', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-queen',
        type: 'q',
        side: 'w',
        hp: 40,
        maxHp: 40,
        attack: 20,
        items: [sharpBlade, serpentFang],
        square: 'e2',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e3',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '8/8/8/8/8/4k3/4Q3/4K3 w - - 0 1',
    });

    // 백 퀸(e2)이 흑 킹(e3, 보스)을 공격
    const result = manager.tryMove('e2e3');
    expect(result.ok).toBe(true);
    expect(result.outcome.kind).toBe('damaged');
    
    const defender = manager.getPieceAt('e3')!;
    expect(defender.poisonTurns).toBe(3);
    expect(defender.poisonDamage).toBe(3);
  });

  it('should apply poison damage on turn start', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 50,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
        poisonTurns: 3,
        poisonDamage: 3,
      }
    ];

    // FEN 차례를 w에서 b로 바꾼 상태로 시작
    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K3 b - - 0 1',
    });

    // 흑 턴 시작 시에 맹독 데미지 적용을 확인하기 위해, 흑 기물이 이동하는 액션을 취함
    // 흑 킹을 e8에서 d8로 이동
    const result = manager.tryMove('e8d8');
    expect(result.ok).toBe(true);

    const targetKing = manager.getPieceAt('d8')!;
    // 100 - 3 = 97
    expect(targetKing.hp).toBe(97);
    expect(targetKing.poisonTurns).toBe(2);
  });

  it('should clamp boss King HP to 0 and not remove it from board when dying of poison', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 50,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 2, // 2 HP, 독 데미지 3을 받으면 0 이하가 됨
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
        poisonTurns: 1,
        poisonDamage: 3,
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K3 b - - 0 1',
    });

    // 흑 턴 시작 시 독 데미지가 적용되도록 이동 시도
    const result = manager.tryMove('e8d8');
    expect(result.ok).toBe(true);

    const targetKing = manager.getPieceAt('d8')!;
    expect(targetKing.hp).toBe(0); // 0으로 클램프되어야 함
    expect(targetKing.poisonTurns).toBe(0);
    // 킹 기물이 여전히 존재해야 함
    expect(manager.getPieceAt('d8')).toBeDefined();
    expect(manager.getPieces().length).toBe(2);
  });

  it('should clamp ally King HP to 0 and not remove it from board when dying of poison', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 2, // 2 HP
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
        poisonTurns: 1,
        poisonDamage: 3,
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
    });

    // 백 턴 시작 시 맹독 적용을 위해 백 킹을 e1에서 d1로 이동 시도
    const result = manager.tryMove('e1d1');
    expect(result.ok).toBe(true);

    const targetKing = manager.getPieceAt('d1')!;
    expect(targetKing.hp).toBe(0); // 0으로 클램프
    expect(targetKing.poisonTurns).toBe(0);
    expect(manager.getPieceAt('d1')).toBeDefined();
    expect(manager.getPieces().length).toBe(2);
  });

  it('should clamp ally King HP to 0 and not remove it from board when hit by enemy King active skill', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 5, // 5 HP
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e2', // 인접 셀
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K3 b - - 0 1',
    });

    // 흑 킹(e2)이 액티브 스킬 시전
    const result = manager.useActiveSkill('e-king');
    expect(result.ok).toBe(true);

    const allyKing = manager.getPieceAt('e1')!;
    expect(allyKing.hp).toBe(0); // 10 데미지 받았으므로 0으로 클램프
    expect(manager.getPieceAt('e1')).toBeDefined();
    expect(manager.getPieces().length).toBe(2);
  });

  it('should block move when piece is Bound and decrement bindTurns on turn end', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-pawn',
        type: 'p',
        side: 'w',
        hp: 10,
        maxHp: 10,
        attack: 5,
        items: [],
        square: 'e2',
        bindTurns: 1, // 1턴 속박
      },
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 50,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    });

    // 1. 속박되어 있으므로 e2 폰의 합법 수는 0이어야 함
    expect(manager.legalDestinations('e2').length).toBe(0);

    // 2. 강제 무브 시도 시, bound-piece 에러가 반환되어야 함
    const result = manager.tryMove('e2e4');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bound-piece');

    // 3. 다른 아군 기물(킹)을 움직여서 백 턴 종료 -> 흑 턴으로 전환
    const kingMove = manager.tryMove('e1d1');
    expect(kingMove.ok).toBe(true);

    // 4. 백 턴이 정상 종료되었으므로 폰의 bindTurns가 1에서 0으로 차감되었는지 검증
    const pawn = manager.getPieceAt('e2')!;
    expect(pawn.bindTurns).toBe(0);

    // 5. 흑 턴을 넘김 (흑 킹 e8 -> d8) -> 다시 백 턴으로 전환
    const enemyMove = manager.tryMove('e8d8');
    expect(enemyMove.ok).toBe(true);

    // 6. 이제 속박이 0이므로 e2 폰이 정상적으로 이동할 수 있어야 함
    expect(manager.legalDestinations('e2').length).toBeGreaterThan(0);
    const pawnMove = manager.tryMove('e2e4');
    expect(pawnMove.ok).toBe(true);
    expect(manager.getPieceAt('e4')).toBeDefined();
  });

  it('should apply Weaken debuff halving effective attack', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-pawn',
        type: 'p',
        side: 'w',
        hp: 10,
        maxHp: 10,
        attack: 10, // 원공 10
        items: [],
        square: 'e2',
        weakenTurns: 2, // 2턴 약화
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    });

    const result = manager.tryMove('e2e4');
    expect(result.ok).toBe(true);

    const pawn = manager.getPieceAt('e4')!;
    // 턴 시작 정산으로 weakenTurns: 2 -> 1로 차감
    expect(pawn.weakenTurns).toBe(1);
    
    // 공격력 반감: 10 * 0.5 = 5
    const { effectiveAttack } = require('./AdventureChessManager');
    expect(effectiveAttack(pawn, [])).toBe(5);
  });

  it('should trigger Bind and Weaken on targets from item modifiers on strike', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-queen',
        type: 'q', // 폰 대신 퀸을 두어 e2 -> e3 캡처가 합법수가 되도록 설정
        side: 'w',
        hp: 40,
        maxHp: 40,
        attack: 10,
        items: [bindingChain, weakingTotem],
        square: 'e2',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 100,
        maxHp: 100,
        attack: 10,
        items: [],
        square: 'e3', // 보스 킹 타격
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '8/8/8/8/8/4k3/4Q3/4K3 w - - 0 1',
      rng: () => 0.0,
    });

    const result = manager.tryMove('e2e3');
    expect(result.ok).toBe(true);
    expect(result.outcome.kind).toBe('damaged');

    const boss = manager.getPieceAt('e3')!;
    expect(boss.bindTurns).toBe(1);
    expect(boss.weakenTurns).toBe(1); // 2 -> 1로 밸런싱
  });

  it('should restore HP to attacker through Lifesteal modifier on capture', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-rook',
        type: 'r',
        side: 'w',
        hp: 15,
        maxHp: 40,
        attack: 15,
        items: [vampireFang],
        square: 'e2',
      },
      {
        id: 'e-pawn',
        type: 'p',
        side: 'b',
        hp: 5,
        maxHp: 10,
        attack: 2, // 반격 공격력 2
        items: [],
        square: 'e3',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 10,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'e8', // 흑 킹 추가로 FEN 검증 성공
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/4p3/4R3/4K3 w - - 0 1',
    });

    const result = manager.tryMove('e2e3');
    expect(result.ok).toBe(true);
    expect(result.outcome.kind).toBe('captured');

    const rook = manager.getPieceAt('e3')!;
    // 반격 피해: 2.  rook hp: 15 - 2 = 13.
    // 흡혈량: 공격력 15 * 30% = 4.5 -> Math.round(4.5) = 5. (50% -> 30%로 밸런싱)
    // 최종 HP: 13 + 5 = 18.
    expect(rook.hp).toBe(18);
  });

  it('should relocate Rook and trigger Fortress passive heal during castling', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 20,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'p-rook',
        type: 'r',
        side: 'w',
        hp: 10,
        maxHp: 35,
        attack: 15,
        items: [],
        square: 'h1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 10,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'e8', // 흑 킹 추가
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
      characterId: 'fortress',
    });

    // 킹사이드 캐슬링 실행
    const result = manager.tryMove('e1g1');
    expect(result.ok).toBe(true);

    // 킹이 g1으로, 룩이 f1으로 정상 relocation 되었는지 확인
    const king = manager.getPieceAt('g1')!;
    const rook = manager.getPieceAt('f1')!;
    expect(king).toBeDefined();
    expect(rook).toBeDefined();

    // 힐 보너스 +15 적용 확인 (킹: 20->35, 룩: 10->25)
    expect(king.hp).toBe(35);
    expect(rook.hp).toBe(25);
  });

  it('should apply permanent ATK bonus to Pawn through Chaos evolution passive on capture', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-pawn',
        type: 'p',
        side: 'w',
        hp: 10,
        maxHp: 10,
        attack: 5,
        items: [],
        square: 'e2',
      },
      {
        id: 'e-pawn',
        type: 'p',
        side: 'b',
        hp: 5,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'f3',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 10,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'e8', // 흑 킹 추가
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/5p2/4P3/4K3 w - - 0 1',
      characterId: 'chaos',
    });

    // 폰 e2가 f3의 흑 폰을 캡처
    const result = manager.tryMove('e2f3');
    expect(result.ok).toBe(true);

    const pawn = manager.getPieceAt('f3')!;
    // 폰 기본 공격력 5 -> 캡처로 인해 +2 가산 -> 7
    expect(pawn.attack).toBe(7);
  });

  it('should apply Saints turn-start heal only to King', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-king',
        type: 'k',
        side: 'w',
        hp: 40,
        maxHp: 50,
        attack: 8,
        items: [],
        square: 'e1',
      },
      {
        id: 'p-bishop',
        type: 'b',
        side: 'w',
        hp: 20,
        maxHp: 25,
        attack: 10,
        items: [],
        square: 'c1',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 10,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1',
      characterId: 'saints',
      turnStartHeal: 1, // Saints 패시브 가상 설정
    });

    // 백 킹 e1 -> d1 이동으로 턴 시작 정산 발화
    const result = manager.tryMove('e1d1');
    expect(result.ok).toBe(true);

    const king = manager.getPieceAt('d1')!;
    const bishop = manager.getPieceAt('c1')!;

    // 킹만 +1 힐 (40 -> 41)
    expect(king.hp).toBe(41);
    // 비숍은 힐을 받지 않음 (20 -> 20)
    expect(bishop.hp).toBe(20);
  });

  it('should apply permanent ATK bonus to Knight through Assassins jump passive on capture', () => {
    const pieces: PieceState[] = [
      {
        id: 'p-knight',
        type: 'n',
        side: 'w',
        hp: 25,
        maxHp: 25,
        attack: 10,
        items: [],
        square: 'b1',
      },
      {
        id: 'e-pawn',
        type: 'p',
        side: 'b',
        hp: 5,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'c3',
      },
      {
        id: 'e-king',
        type: 'k',
        side: 'b',
        hp: 10,
        maxHp: 10,
        attack: 2,
        items: [],
        square: 'e8',
      }
    ];

    const manager = createAdventureChessManager({
      pieces,
      initialFen: '4k3/8/8/8/8/2p5/8/1N2K3 w - - 0 1',
      characterId: 'assassins',
    });

    // 나이트 b1이 c3의 폰을 캡처
    const result = manager.tryMove('b1c3');
    expect(result.ok).toBe(true);

    const knight = manager.getPieceAt('c3')!;
    // 나이트 기본 공격력 10 -> 캡처로 인해 +1 가산 -> 11
    expect(knight.attack).toBe(11);
  });
});
