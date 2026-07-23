import { describe, expect, test, beforeEach } from 'bun:test';
import { StockfishEngine, parseInfo } from './StockfishEngine';

describe('parseInfo', () => {
  test('should parse depth, nodes, nps, and score cp correctly', () => {
    const raw = 'info depth 12 multipv 1 score cp 45 nodes 10234 nps 500000 pv e2e4 e7e5';
    const info = parseInfo(raw);

    expect(info.depth).toBe(12);
    expect(info.multipv).toBe(1);
    expect(info.scoreCp).toBe(45);
    expect(info.nodes).toBe(10234);
    expect(info.nps).toBe(500000);
    expect(info.pv).toEqual(['e2e4', 'e7e5']);
  });

  test('should parse mate score correctly', () => {
    const raw = 'info depth 20 score mate 3 nodes 50000 pv f2f4 e7e5';
    const info = parseInfo(raw);

    expect(info.depth).toBe(20);
    expect(info.scoreMate).toBe(3);
    expect(info.scoreCp).toBeUndefined();
    expect(info.pv).toEqual(['f2f4', 'e7e5']);
  });

  test('should parse negative mate score correctly', () => {
    const raw = 'info depth 18 score mate -2 nodes 12345';
    const info = parseInfo(raw);

    expect(info.scoreMate).toBe(-2);
  });
});

describe('StockfishEngine class', () => {
  test('should initialize and handle ready state', () => {
    const engine = new StockfishEngine();
    expect(engine.isReady()).toBe(false);
  });

  test('should allow setting multiPV before go', () => {
    const engine = new StockfishEngine();
    expect(() => engine.setMultiPV(3)).not.toThrow();
  });
});
