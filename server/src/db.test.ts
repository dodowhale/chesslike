import { describe, test, expect } from 'bun:test';
import { db, addLeaderboardEntry, getLeaderboard, verifyAndRecordAchievement } from './db';

describe('Server DB (SQLite)', () => {
  test('should insert and fetch leaderboard entries', () => {
    addLeaderboardEntry({
      nickname: 'TestPlayer',
      character_id: 'standard',
      act: 3,
      star_shards: 45,
      gold: 150,
      nodes_completed: 24,
    });

    const list = getLeaderboard(10);
    expect(list.length).toBeGreaterThan(0);
    const item = list.find((e) => e.nickname === 'TestPlayer');
    expect(item).toBeDefined();
    expect(item?.character_id).toBe('standard');
    expect(item?.act).toBe(3);
  });

  test('should verify and record achievements idempotently', () => {
    const res1 = verifyAndRecordAchievement('TestPlayer', 'first-clear');
    expect(res1).toBe(true);

    const res2 = verifyAndRecordAchievement('TestPlayer', 'first-clear');
    expect(res2).toBe(true); // SQLite INSERT OR IGNORE succeeds without throwing error
  });
});
