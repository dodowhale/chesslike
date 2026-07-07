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
});
