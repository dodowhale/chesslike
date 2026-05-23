import { createStore, reconcile, unwrap } from 'solid-js/store';
import { createEffect, createRoot, on } from 'solid-js';
import { DEFAULT_SETTINGS, type GlobalSettings } from '@shared/settings';
import { loadSettings, saveSettings } from '@/lib/storage/settingsRepo';

const [state, setState] = createStore<GlobalSettings>(DEFAULT_SETTINGS);

let loaded = false;

export const settings = state;

export async function hydrateSettings(): Promise<void> {
  const stored = await loadSettings();
  setState(reconcile(stored));
  loaded = true;
}

export function updateSettings(patch: Partial<GlobalSettings>): void {
  setState(patch);
}

export function updateAudio(patch: Partial<GlobalSettings['audio']>): void {
  setState('audio', patch);
}

export function updateTheme(patch: Partial<GlobalSettings['theme']>): void {
  setState('theme', patch);
}

export function updateAccessibility(patch: Partial<GlobalSettings['accessibility']>): void {
  setState('accessibility', patch);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let disposePersistence: (() => void) | null = null;

export function startSettingsPersistence(): void {
  if (disposePersistence) return;
  createRoot((dispose) => {
    disposePersistence = dispose;
    createEffect(
      on(
        () => JSON.stringify(unwrap(state)),
        () => {
          if (!loaded) return;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            void saveSettings(structuredClone(unwrap(state)));
          }, 300);
        },
      ),
    );
  });
}

export function stopSettingsPersistence(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  disposePersistence?.();
  disposePersistence = null;
}
