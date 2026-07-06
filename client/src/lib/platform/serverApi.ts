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

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${SERVER_URL}/api/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.entries ?? [];
}

export async function submitScore(entry: {
  nickname: string;
  characterId: string;
  act: number;
  starShards: number;
  gold: number;
  nodesCompleted: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: entry.nickname,
        character_id: entry.characterId,
        act: entry.act,
        star_shards: entry.starShards,
        gold: entry.gold,
        nodes_completed: entry.nodesCompleted,
      }),
    });
    if (!res.ok) throw new Error('Failed to submit score');
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('Score submission error:', err);
    return false;
  }
}

export async function reportAchievementToServer(
  nickname: string,
  achievementId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/achievements/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, achievement_id: achievementId }),
    });
    if (!res.ok) throw new Error('Failed to verify achievement');
    const data = await res.json();
    return !!data.accepted;
  } catch (err) {
    console.error('Achievement verification report error:', err);
    return false;
  }
}
