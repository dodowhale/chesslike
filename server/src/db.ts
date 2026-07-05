import { Database } from 'bun:sqlite';
import { join } from 'path';

// 프로젝트 루트나 server 폴더 내에 sqlite db 파일을 생성
const dbPath = join(process.cwd(), 'chesslike.db');
console.log(`[db] Opening SQLite database at: ${dbPath}`);

export const db = new Database(dbPath);

// 테이블 초기화
db.run(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    character_id TEXT NOT NULL,
    act INTEGER NOT NULL,
    star_shards INTEGER NOT NULL,
    gold INTEGER NOT NULL,
    nodes_completed INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS achievements_verified (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nickname, achievement_id)
  )
`);

export interface LeaderboardEntry {
  id: number;
  nickname: string;
  character_id: string;
  act: number;
  star_shards: number;
  gold: number;
  nodes_completed: number;
  created_at: string;
}

export function getLeaderboard(limit = 100): LeaderboardEntry[] {
  // 3막 완료(act=3 & 노드완료가 많거나, 골드가 많거나, 별조각이 많은 순) 기준 정렬
  return db.query(`
    SELECT * FROM leaderboard 
    ORDER BY act DESC, nodes_completed DESC, star_shards DESC, gold DESC 
    LIMIT ?
  `).all(limit) as LeaderboardEntry[];
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'created_at'>): void {
  db.run(
    `INSERT INTO leaderboard (nickname, character_id, act, star_shards, gold, nodes_completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.nickname,
      entry.character_id,
      entry.act,
      entry.star_shards,
      entry.gold,
      entry.nodes_completed,
    ]
  );
}

export function verifyAndRecordAchievement(nickname: string, achievementId: string): boolean {
  try {
    db.run(
      `INSERT OR IGNORE INTO achievements_verified (nickname, achievement_id) VALUES (?, ?)`,
      [nickname, achievementId]
    );
    return true;
  } catch (err) {
    console.error('Failed to verify achievement:', err);
    return false;
  }
}
