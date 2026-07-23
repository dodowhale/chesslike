import { describe, test, expect, beforeEach } from 'bun:test';
import { kvGet, kvSet, kvDel } from './kv';

// Simple in-memory localStorage mock for Bun test environment
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

describe('kv storage module', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('should set and get values correctly', async () => {
    await kvSet('test-key', { name: 'Chesslike', score: 100 });
    const val = await kvGet<{ name: string; score: number }>('test-key');
    expect(val).toEqual({ name: 'Chesslike', score: 100 });
  });

  test('should return undefined for non-existent key', async () => {
    const val = await kvGet<string>('non-existent-key');
    expect(val).toBeUndefined();
  });

  test('should delete value when kvDel is called', async () => {
    await kvSet('to-del', 'hello');
    const valBefore = await kvGet<string>('to-del');
    expect(valBefore).toBe('hello');
    await kvDel('to-del');
    const valAfter = await kvGet<string>('to-del');
    expect(valAfter).toBeUndefined();
  });

  test('should handle corrupted JSON gracefully in localStorage', async () => {
    mockStorage.set('chesslike:corrupted', 'invalid json {{{');
    const val = await kvGet<string>('corrupted');
    expect(val).toBeUndefined();
  });
});
