import { describe, test, expect, beforeEach } from 'bun:test';
import { loadSettings, saveSettings } from './settingsRepo';
import { kvSet, kvDel } from './kv';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '@shared/settings';

const mockStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: (key: string) => {
      mockStorage.delete(key);
    },
    clear: () => {
      mockStorage.clear();
    },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    length: 0,
  };
}

describe('settingsRepo module', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await kvDel('settings');
  });

  test('should return DEFAULT_SETTINGS when no settings stored', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  test('should save and load settings properly', async () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      audio: { bgmVolume: 0.5, sfxVolume: 0.8, muted: true },
      locale: 'en' as const,
      notation: 'san+kr' as const,
    };
    await saveSettings(customSettings);
    const loaded = await loadSettings();
    expect(loaded.audio.bgmVolume).toBe(0.5);
    expect(loaded.audio.sfxVolume).toBe(0.8);
    expect(loaded.audio.muted).toBe(true);
    expect(loaded.locale).toBe('en');
    expect(loaded.notation).toBe('san+kr');
  });

  test('should migrate incomplete or old version settings smoothly', async () => {
    // Store partial settings
    await kvSet('settings', {
      audio: { bgmVolume: 2.5 }, // should clamp to 1.0
      locale: 'invalid_locale',
    });

    const loaded = await loadSettings();
    expect(loaded.audio.bgmVolume).toBe(1.0); // clamped
    expect(loaded.locale).toBe(DEFAULT_SETTINGS.locale); // fallback to ko
    expect(loaded.version).toBe(SETTINGS_VERSION);
    expect(loaded.theme).toEqual(DEFAULT_SETTINGS.theme);
  });
});
