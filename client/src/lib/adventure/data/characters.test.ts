import { describe, test, expect } from 'bun:test';
import { CHARACTER_POOL, getCharacterById, STANDARD_CHARACTER } from './characters';

describe('characters module', () => {
  test('should return all characters list', () => {
    expect(CHARACTER_POOL.length).toBe(5);
    expect(CHARACTER_POOL[0]!.id).toBe('standard');
    expect(CHARACTER_POOL[1]!.id).toBe('assassins');
    expect(CHARACTER_POOL[2]!.id).toBe('saints');
    expect(CHARACTER_POOL[3]!.id).toBe('fortress');
    expect(CHARACTER_POOL[4]!.id).toBe('chaos');
  });

  test('should find character by ID', () => {
    const std = getCharacterById('standard');
    expect(std).toBeDefined();
    expect(std?.name).toBe('정규단');

    const assassins = getCharacterById('assassins');
    expect(assassins).toBeDefined();
    expect(assassins?.name).toBe('암살자단');

    const invalid = getCharacterById('unknown-id');
    expect(invalid).toBeUndefined();
  });

  test('STANDARD_CHARACTER should have standard 32 pieces loadout', () => {
    expect(STANDARD_CHARACTER.startingPieces.length).toBe(32);
    const whitePieces = STANDARD_CHARACTER.startingPieces.filter((p) => p.side === 'w');
    const blackPieces = STANDARD_CHARACTER.startingPieces.filter((p) => p.side === 'b');
    expect(whitePieces.length).toBe(16);
    expect(blackPieces.length).toBe(16);
  });

  test('character starting pieces overrides should match archetype design', () => {
    const assassins = getCharacterById('assassins');
    expect(assassins).toBeDefined();
    const assassinKnights = assassins!.startingPieces.filter(
      (p) => p.side === 'w' && (p.type === 'n' || p.startingSquare === 'c1' || p.startingSquare === 'f1'),
    );
    expect(assassinKnights.length).toBe(4);
    expect(assassinKnights[0]!.baseStatsOverride).toEqual({ hp: 40, attack: 15 });

    const saints = getCharacterById('saints');
    expect(saints).toBeDefined();
    const saintKing = saints!.startingPieces.find((p) => p.side === 'w' && p.type === 'k');
    expect(saintKing?.baseStatsOverride).toEqual({ hp: 65, attack: 10 });
  });
});
