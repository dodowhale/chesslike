export type Locale = 'ko' | 'en';
export type Notation = 'san' | 'san+kr';

export interface AudioSettings {
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface ThemeSettings {
  boardSkin: string;
  pieceSkin: string;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
}

export interface GlobalSettings {
  audio: AudioSettings;
  locale: Locale;
  theme: ThemeSettings;
  accessibility: AccessibilitySettings;
  notation: Notation;
  version: number;
}

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: GlobalSettings = {
  audio: { bgmVolume: 0.6, sfxVolume: 0.8, muted: false },
  locale: 'ko',
  theme: { boardSkin: 'default', pieceSkin: 'default' },
  accessibility: { reducedMotion: false },
  notation: 'san',
  version: SETTINGS_VERSION,
};
