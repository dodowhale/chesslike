import { describe, expect, test } from 'bun:test';
import { AdventureRunController } from './AdventureSceneController';
import { getCharacterById } from '@/lib/adventure/data/characters';
import { ITEM_POOL } from '@/lib/adventure/data/items';

describe('AdventureRunController', () => {
  const standardChar = getCharacterById('standard')!;

  test('should initialize run with character loadout and gold', () => {
    const ctrl = new AdventureRunController({
      character: standardChar,
      rng: () => 0.5,
    });

    const run = ctrl.state();
    expect(run.characterId).toBe('standard');
    expect(run.act).toBe(1);
    expect(run.gold).toBe(50);
    expect(run.pieces.length).toBe(32);
    expect(run.starShardsThisRun).toBe(0);
    expect(ctrl.currentNode()).toBeDefined();
  });

  test('should manage inventory equipment correctly', () => {
    const ctrl = new AdventureRunController({
      character: standardChar,
      rng: () => 0.5,
    });

    const testItem = ITEM_POOL[0]!;
    ctrl.addInventory(testItem);
    expect(ctrl.state().inventory.length).toBe(1);

    const pawnId = ctrl.state().pieces.find((p) => p.side === 'w' && p.type === 'p')?.id;
    expect(pawnId).toBeDefined();

    const equipped = ctrl.equipItem(pawnId!, testItem.id);
    expect(equipped).toBe(true);
    expect(ctrl.state().inventory.length).toBe(0);
    
    const piece = ctrl.state().pieces.find((p) => p.id === pawnId);
    expect(piece?.items.length).toBe(1);

    const unequipped = ctrl.unequipItem(pawnId!, testItem.id);
    expect(unequipped).toBe(true);
    expect(ctrl.state().inventory.length).toBe(1);
  });

  test('should handle node completion and star shard rewards', () => {
    const ctrl = new AdventureRunController({
      character: standardChar,
      rng: () => 0.5,
    });

    const initialShards = ctrl.state().starShardsThisRun;
    ctrl.markCurrentNodeCompleted();

    expect(ctrl.state().starShardsThisRun).toBeGreaterThan(initialShards);
    expect(ctrl.availableNextNodes().length).toBeGreaterThan(0);
  });

  test('should save promoted piece type back to run state in saveBoardPiecesToRun', () => {
    const ctrl = new AdventureRunController({
      character: standardChar,
      rng: () => 0.5,
    });

    ctrl.enterBoardNode();
    const boardChess = ctrl.getBoardChess();
    expect(boardChess).toBeDefined();

    // Promoted white piece check
    const boardPieces = boardChess!.getPieces();
    const pawn = boardPieces.find((p) => p.side === 'w' && p.type === 'p');
    expect(pawn).toBeDefined();

    // Simulate promotion on board
    pawn!.type = 'q';
    pawn!.attack = 20;

    ctrl.saveBoardPiecesToRun();

    const updatedPiece = ctrl.state().pieces.find((p) => p.id === pawn!.id);
    expect(updatedPiece?.type).toBe('q');
    expect(updatedPiece?.attack).toBe(20);
  });
});
