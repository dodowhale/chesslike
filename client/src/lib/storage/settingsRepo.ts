import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type GlobalSettings,
  type Locale,
  type Notation,
} from '@shared/settings';
import { kvGet, kvSet } from './kv';

const KEY = 'settings';

function isLocale(v: unknown): v is Locale {
  return v === 'ko' || v === 'en';
}

function isNotation(v: unknown): v is Notation {
  return v === 'san' || v === 'san+kr';
}

function num(v: unknown, fallback: number, min = 0, max = 1): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback;
  return Math.min(Math.max(v, min), max);
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function migrate(stored: unknown): GlobalSettings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const audio = (s.audio && typeof s.audio === 'object' ? s.audio : {}) as Record<string, unknown>;
  const theme = (s.theme && typeof s.theme === 'object' ? s.theme : {}) as Record<string, unknown>;
  const accessibility = (s.accessibility && typeof s.accessibility === 'object'
    ? s.accessibility
    : {}) as Record<string, unknown>;

  return {
    audio: {
      bgmVolume: num(audio.bgmVolume, DEFAULT_SETTINGS.audio.bgmVolume),
      sfxVolume: num(audio.sfxVolume, DEFAULT_SETTINGS.audio.sfxVolume),
      muted: bool(audio.muted, DEFAULT_SETTINGS.audio.muted),
    },
    locale: isLocale(s.locale) ? s.locale : DEFAULT_SETTINGS.locale,
    theme: {
      boardSkin: str(theme.boardSkin, DEFAULT_SETTINGS.theme.boardSkin),
      pieceSkin: str(theme.pieceSkin, DEFAULT_SETTINGS.theme.pieceSkin),
    },
    accessibility: {
      reducedMotion: bool(accessibility.reducedMotion, DEFAULT_SETTINGS.accessibility.reducedMotion),
    },
    notation: isNotation(s.notation) ? s.notation : DEFAULT_SETTINGS.notation,
    version: SETTINGS_VERSION,
  };
}

export async function loadSettings(): Promise<GlobalSettings> {
  const stored = await kvGet<unknown>(KEY);
  if (stored === undefined) return DEFAULT_SETTINGS;
  return migrate(stored);
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  await kvSet(KEY, settings);
}
