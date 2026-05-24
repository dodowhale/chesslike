import { createSignal } from 'solid-js';
import type { MetaProgress } from '@shared/adventure';
import { loadMetaProgress, saveMetaProgress } from '@/store/gameStore';

/**
 * 메타 진행 상태의 단일 출처. MainMenu/AdventureEntry/MetaProgress 모두 동일 신호를
 * 구독해 해금 후 즉시 반영.
 */
const [meta, setMeta] = createSignal<MetaProgress | undefined>();
let initialized = false;

export const metaSignal = meta;

export async function ensureMetaLoaded(): Promise<MetaProgress> {
  if (!initialized) {
    initialized = true;
    const loaded = await loadMetaProgress();
    setMeta(loaded);
  }
  return meta()!;
}

export async function updateMeta(next: MetaProgress): Promise<void> {
  setMeta(next);
  await saveMetaProgress(next);
}

export function getMeta(): MetaProgress | undefined {
  return meta();
}
