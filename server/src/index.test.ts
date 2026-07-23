import { describe, test, expect } from 'bun:test';
import { app } from './index';

describe('Server API Endpoints', () => {
  test('GET /health should return 200 and health info', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('chesslike-server');
  });

  test('GET /api/leaderboard should return leaderboard list', async () => {
    const res = await app.request('/api/leaderboard?limit=10');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.entries)).toBe(true);
  });

  test('POST /api/leaderboard should reject missing parameters', async () => {
    const res = await app.request('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Tester' }), // missing character_id
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Invalid parameters');
  });

  test('POST /api/leaderboard should record entry when valid', async () => {
    const res = await app.request('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: 'TestPlayer',
        character_id: 'standard',
        act: 2,
        star_shards: 15,
        gold: 120,
        nodes_completed: 8,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('POST /api/achievements/verify should handle validation and recording', async () => {
    // Missing achievement_id
    const badRes = await app.request('/api/achievements/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'TestPlayer' }),
    });
    expect(badRes.status).toBe(400);

    // Valid achievement
    const validRes = await app.request('/api/achievements/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: 'TestPlayer',
        achievement_id: 'first-clear',
      }),
    });
    expect(validRes.status).toBe(200);
    const body = await validRes.json();
    expect(body.ok).toBe(true);
    expect(typeof body.accepted).toBe('boolean');
  });
});
