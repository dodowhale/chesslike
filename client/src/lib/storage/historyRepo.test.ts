import { describe, test, expect, beforeEach } from 'bun:test';
import {
  saveHistoryEntry,
  listHistory,
  deleteHistoryEntry,
  makeId,
  type HistoryEntry,
} from './historyRepo';
import { kvDel } from './kv';

const mockStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: (key: string) => {
      mockStorage.delete(key);
    },
    clear: () => {
      mockStorage.clear();
    },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    length: 0,
  };
}

describe('historyRepo module', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await kvDel('history:index');
  });

  test('should generate valid unique id', () => {
    const id1 = makeId();
    const id2 = makeId();
    expect(typeof id1).toBe('string');
    expect(id1).not.toBe(id2);
  });

  test('should save and list history entries in reverse chronological order', async () => {
    const entry1: HistoryEntry = {
      id: 'game-1',
      createdAt: 1000,
      mode: 'classic',
      submode: 'single',
      result: 'win',
      resultDetail: 'checkmate',
      pgn: '1. e4 e5',
      movesCount: 2,
    };
    const entry2: HistoryEntry = {
      id: 'game-2',
      createdAt: 2000,
      mode: 'classic',
      submode: 'single',
      result: 'loss',
      resultDetail: 'timeout',
      pgn: '1. d4 d5',
      movesCount: 2,
    };

    await saveHistoryEntry(entry1);
    await saveHistoryEntry(entry2);

    const list = await listHistory(10);
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe('game-2'); // newest first
    expect(list[1]?.id).toBe('game-1');
  });

  test('should respect limit parameter in listHistory', async () => {
    for (let i = 1; i <= 5; i++) {
      await saveHistoryEntry({
        id: `game-${i}`,
        createdAt: i * 100,
        mode: 'classic',
        submode: 'local',
        result: 'draw',
        resultDetail: 'stalemate',
        pgn: '',
        movesCount: i,
      });
    }

    const limited = await listHistory(3);
    expect(limited.length).toBe(3);
    expect(limited[0]?.id).toBe('game-5');
  });

  test('should delete history entry from index', async () => {
    const entry: HistoryEntry = {
      id: 'del-me',
      createdAt: 500,
      mode: 'classic',
      submode: 'single',
      result: 'win',
      resultDetail: '',
      pgn: '',
      movesCount: 1,
    };
    await saveHistoryEntry(entry);

    let list = await listHistory();
    expect(list.some((e) => e.id === 'del-me')).toBe(true);

    await deleteHistoryEntry('del-me');
    list = await listHistory();
    expect(list.some((e) => e.id === 'del-me')).toBe(false);
  });
});
