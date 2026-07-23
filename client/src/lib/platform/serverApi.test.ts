import { describe, expect, test, afterEach } from 'bun:test';
import { fetchLeaderboard, submitScore, reportAchievementToServer } from './serverApi';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('serverApi', () => {
  describe('fetchLeaderboard', () => {
    test('should return leaderboard entries on success', async () => {
      const mockEntries = [
        {
          id: 1,
          nickname: 'Hero',
          character_id: 'standard',
          act: 3,
          star_shards: 15,
          gold: 250,
          nodes_completed: 12,
          created_at: '2026-07-23T00:00:00Z',
        },
      ];

      globalThis.fetch = (async (url: string | URL | Request) => {
        expect(String(url)).toContain('/api/leaderboard?limit=5');
        return new Response(JSON.stringify({ entries: mockEntries }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await fetchLeaderboard(5);
      expect(result).toEqual(mockEntries);
    });

    test('should throw error when response is not ok', async () => {
      globalThis.fetch = (async () => {
        return new Response('Internal Server Error', { status: 500 });
      }) as unknown as typeof fetch;

      expect(fetchLeaderboard()).rejects.toThrow('Failed to fetch leaderboard');
    });

    test('should return empty array if entries field is missing', async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await fetchLeaderboard();
      expect(result).toEqual([]);
    });
  });

  describe('submitScore', () => {
    test('should return true on successful score submission', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse((options?.body as string) || '{}');
        expect(body.nickname).toBe('Player1');
        expect(body.character_id).toBe('assassins');
        expect(body.act).toBe(2);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch;

      const success = await submitScore({
        nickname: 'Player1',
        characterId: 'assassins',
        act: 2,
        starShards: 10,
        gold: 150,
        nodesCompleted: 8,
      });

      expect(success).toBe(true);
    });

    test('should return false on server error or exception', async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ ok: false }), { status: 400 });
      }) as unknown as typeof fetch;

      const success = await submitScore({
        nickname: 'Player1',
        characterId: 'standard',
        act: 1,
        starShards: 0,
        gold: 0,
        nodesCompleted: 0,
      });

      expect(success).toBe(false);
    });
  });

  describe('reportAchievementToServer', () => {
    test('should return true when achievement is accepted by server', async () => {
      globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse((options?.body as string) || '{}');
        expect(body.nickname).toBe('Winner');
        expect(body.achievement_id).toBe('boss-slayer');
        return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      }) as unknown as typeof fetch;

      const result = await reportAchievementToServer('Winner', 'boss-slayer');
      expect(result).toBe(true);
    });

    test('should return false when network error occurs', async () => {
      globalThis.fetch = (async () => {
        throw new Error('Network offline');
      }) as unknown as typeof fetch;

      const result = await reportAchievementToServer('Winner', 'boss-slayer');
      expect(result).toBe(false);
    });
  });
});
