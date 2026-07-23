import { describe, test, expect } from 'bun:test';
import {
  ITEM_POOL,
  getItemById,
  rollItems,
  rollBossReward,
} from './items';

describe('items module', () => {
  test('should look up item by ID', () => {
    const shield = getItemById('iron-shield');
    expect(shield).toBeDefined();
    expect(shield?.name).toBe('강철 방패');
    expect(shield?.rarity).toBe('common');

    const invalid = getItemById('non-existent-item');
    expect(invalid).toBeUndefined();
  });

  test('should return items with requested rarities', () => {
    const dummyRng = () => 0.1;
    const rolled = rollItems(dummyRng, 2, ['common']);
    expect(rolled.length).toBe(2);
    expect(rolled[0]!.rarity).toBe('common');
    expect(rolled[1]!.rarity).toBe('common');
  });

  test('should fallback/downgrade when requested rarity is locked', () => {
    const dummyRng = () => 0.1;
    const rolled = rollItems(dummyRng, 1, ['rare'], []);
    expect(rolled.length).toBe(1);
    expect(rolled[0]!.rarity).toBe('uncommon');
  });

  test('should include rare items when rare-pool is unlocked', () => {
    const dummyRng = () => 0.01;
    const rolled = rollItems(dummyRng, 1, ['rare'], ['rare-pool']);
    expect(rolled.length).toBe(1);
    expect(rolled[0]!.rarity).toBe('rare');
  });

  test('should roll boss reward correctly depending on unlocked pools', () => {
    const legendaryRng = () => 0.1;
    const legendItem = rollBossReward(legendaryRng, ['legendary-pool']);
    expect(legendItem).toBeDefined();
    expect(legendItem?.rarity).toBe('legendary');

    const rareRng = () => 0.1;
    const rareItem = rollBossReward(rareRng, ['rare-pool']);
    expect(rareItem).toBeDefined();
    expect(rareItem?.rarity).toBe('rare');

    const defaultRng = () => 0.5;
    const uncommonItem = rollBossReward(defaultRng, []);
    expect(uncommonItem).toBeDefined();
    expect(uncommonItem?.rarity).toBe('uncommon');
  });

  test('ITEM_POOL has items across all 4 rarity tiers', () => {
    const commonCount = ITEM_POOL.filter((i) => i.rarity === 'common').length;
    const uncommonCount = ITEM_POOL.filter((i) => i.rarity === 'uncommon').length;
    const rareCount = ITEM_POOL.filter((i) => i.rarity === 'rare').length;
    const legendaryCount = ITEM_POOL.filter((i) => i.rarity === 'legendary').length;

    expect(commonCount).toBeGreaterThanOrEqual(10);
    expect(uncommonCount).toBeGreaterThanOrEqual(5);
    expect(rareCount).toBeGreaterThanOrEqual(5);
    expect(legendaryCount).toBeGreaterThanOrEqual(2);
  });
});
