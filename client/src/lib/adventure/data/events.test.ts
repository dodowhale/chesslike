import { describe, expect, test } from 'bun:test';
import { EVENT_POOL, pickEventForNode } from './events';

describe('events module', () => {
  test('EVENT_POOL elements should have unique IDs and valid choices', () => {
    const ids = new Set<string>();
    for (const event of EVENT_POOL) {
      expect(ids.has(event.id)).toBe(false);
      ids.add(event.id);

      expect(event.narrative).toBeTruthy();
      expect(event.acts.length).toBeGreaterThan(0);
      expect(event.choices.length).toBeGreaterThan(0);

      for (const choice of event.choices) {
        expect(choice.label).toBeTruthy();
        expect(choice.description).toBeTruthy();
        expect(choice.effects.length).toBeGreaterThan(0);

        for (const effect of choice.effects) {
          expect(effect.kind).toBeTruthy();
          if (effect.kind === 'heal-king' || effect.kind === 'damage-king' || effect.kind === 'add-gold') {
            expect(effect.amount).toBeGreaterThan(0);
          } else if (effect.kind === 'spend-gold') {
            expect(effect.cost).toBeGreaterThan(0);
          } else if (effect.kind === 'reward') {
            expect(['common', 'uncommon']).toContain(effect.rarity);
          } else if (effect.kind === 'reward-double-gold') {
            expect(effect.chance).toBeGreaterThan(0);
            expect(effect.doubleAmount).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('pickEventForNode should deterministically select an event based on nodeId and act', () => {
    const event1 = pickEventForNode('node-1-2', 1);
    const event2 = pickEventForNode('node-1-2', 1);
    expect(event1).toBe(event2);
    expect(event1.acts).toContain(1);

    const eventAct2 = pickEventForNode('node-2-5', 2);
    expect(eventAct2.acts).toContain(2);

    const eventAct3 = pickEventForNode('node-3-8', 3);
    expect(eventAct3.acts).toContain(3);
  });

  test('pickEventForNode should gracefully handle unknown act numbers via fallback', () => {
    // 99 is not in any acts array, but pickEventForNode should fall back to EVENT_POOL safely
    const eventFallback = pickEventForNode('node-test', 99 as any);
    expect(eventFallback).toBeDefined();
    expect(eventFallback.id).toBeTruthy();
  });
});
