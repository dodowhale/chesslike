/**
 * Pixel Chess Roguelike — Hono 서버 (정식 SQLite 구현).
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getLeaderboard, addLeaderboardEntry, verifyAndRecordAchievement } from './db';

const app = new Hono();

// CORS 활성화
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.get('/health', (c) =>
  c.json({ ok: true, service: 'chesslike-server', version: '1.0.0' }),
);

// 랭킹 조회
app.get('/api/leaderboard', (c) => {
  try {
    const limit = Number(c.req.query('limit') ?? '100');
    const entries = getLeaderboard(limit);
    return c.json({ ok: true, entries });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Database error' }, 500);
  }
});

// 랭킹 등록
app.post('/api/leaderboard', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.nickname || !body.character_id) {
      return c.json({ ok: false, error: 'Invalid parameters' }, 400);
    }
    addLeaderboardEntry({
      nickname: String(body.nickname),
      character_id: String(body.character_id),
      act: Number(body.act ?? 1),
      star_shards: Number(body.star_shards ?? 0),
      gold: Number(body.gold ?? 0),
      nodes_completed: Number(body.nodes_completed ?? 0),
    });
    return c.json({ ok: true, message: 'Leaderboard entry added successfully' });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Database error' }, 500);
  }
});

// 도전과제 서버 검증 및 저장
app.post('/api/achievements/verify', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.nickname || !body.achievement_id) {
      return c.json({ ok: false, error: 'Invalid parameters' }, 400);
    }

    const verified = verifyAndRecordAchievement(
      String(body.nickname),
      String(body.achievement_id)
    );

    return c.json({
      ok: true,
      accepted: verified,
      nickname: body.nickname,
      achievement_id: body.achievement_id,
    });
  } catch (err) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : 'Database error' }, 500);
  }
});

const port = Number(process.env.PORT ?? 3000);
console.log(`[chesslike-server] starting on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
