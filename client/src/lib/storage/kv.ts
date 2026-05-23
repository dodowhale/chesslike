import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const LS_PREFIX = 'chesslike:';

function lsKey(key: string): string {
  return `${LS_PREFIX}${key}`;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const value = await idbGet<T>(key);
    if (value !== undefined) return value;
  } catch {
    /* fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(lsKey(key));
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  try {
    await idbSet(key, value);
  } catch {
    /* idb unavailable — continue to localStorage */
  }
  try {
    localStorage.setItem(lsKey(key), JSON.stringify(value));
  } catch {
    /* quota exceeded or disabled — best-effort only */
  }
}

export async function kvDel(key: string): Promise<void> {
  try {
    await idbDel(key);
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(lsKey(key));
  } catch {
    /* noop */
  }
}
