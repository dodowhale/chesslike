import type { Mode, ClassicSubmode } from '@shared/mode';
import { kvGet, kvSet } from './kv';

const INDEX_KEY = 'history:index';

export interface HistoryEntry {
  id: string;
  createdAt: number;
  mode: Mode;
  submode?: ClassicSubmode;
  difficulty?: string;
  playerColor?: 'w' | 'b';
  result: string;
  resultDetail: string;
  pgn: string;
  movesCount: number;
}

async function readIndex(): Promise<string[]> {
  return (await kvGet<string[]>(INDEX_KEY)) ?? [];
}

async function writeIndex(ids: string[]): Promise<void> {
  await kvSet(INDEX_KEY, ids);
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  await kvSet(`history:${entry.id}`, entry);
  const index = await readIndex();
  if (!index.includes(entry.id)) {
    const next = [entry.id, ...index].slice(0, 200);
    await writeIndex(next);
  }
}

export async function listHistory(limit = 50): Promise<HistoryEntry[]> {
  const index = await readIndex();
  const ids = index.slice(0, limit);
  const entries = await Promise.all(ids.map((id) => kvGet<HistoryEntry>(`history:${id}`)));
  return entries.filter((e): e is HistoryEntry => Boolean(e));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const index = await readIndex();
  await writeIndex(index.filter((x) => x !== id));
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
