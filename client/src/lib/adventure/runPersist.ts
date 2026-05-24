import type { AdventureRunState } from '@shared/adventure';
import { kvGet, kvSet, kvDel } from '@/lib/storage/kv';

const RUN_KEY = 'adventure:run';

export async function loadPersistedRun(): Promise<AdventureRunState | undefined> {
  return kvGet<AdventureRunState>(RUN_KEY);
}

export async function persistRun(run: AdventureRunState): Promise<void> {
  await kvSet(RUN_KEY, run);
}

export async function clearPersistedRun(): Promise<void> {
  await kvDel(RUN_KEY);
}
