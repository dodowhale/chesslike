/**
 * Pixel Chess Roguelike — Hono 서버 스켈레톤 (M5 placeholder).
 *
 * 게임플레이는 오프라인 우선. 본 서버는 M5+의 옵션 기능 — 랭킹, 도전과제 검증,
 * 계정 동기화 — 진입점으로 준비된 골격이다. SQLite/Drizzle 연결은 미시작.
 */
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) =>
  c.json({ ok: true, service: 'chesslike-server', version: '0.0.0' }),
);

app.get('/api/leaderboard', (c) =>
  c.json({ entries: [], note: 'placeholder — implementation pending' }),
);

app.post('/api/achievements/verify', async (c) => {
  const body = await c.req.json().catch(() => null);
  return c.json({ accepted: false, body, note: 'placeholder' });
});

const port = Number(process.env.PORT ?? 3000);
console.log(`[chesslike-server] starting on :${port}`);

export default {
  port,
  fetch: app.fetch,
};
