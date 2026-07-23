import { describe, expect, test } from 'bun:test';
import {
  settings,
  updateSettings,
  updateAudio,
  updateTheme,
  updateAccessibility,
  hydrateSettings,
  startSettingsPersistence,
  stopSettingsPersistence,
} from './settingsStore';

describe('settingsStore', () => {
  test('should have default settings initialized', () => {
    expect(settings.locale).toBe('ko');
    expect(settings.audio.sfxVolume).toBe(0.8);
    expect(settings.theme.boardSkin).toBe('default');
    expect(settings.accessibility.reducedMotion).toBe(false);
  });

  test('should update audio settings correctly', () => {
    updateAudio({ sfxVolume: 0.5, muted: true });
    expect(settings.audio.sfxVolume).toBe(0.5);
    expect(settings.audio.muted).toBe(true);
  });

  test('should update theme settings correctly', () => {
    updateTheme({ boardSkin: 'forest' });
    expect(settings.theme.boardSkin).toBe('forest');
  });

  test('should update accessibility settings correctly', () => {
    updateAccessibility({ reducedMotion: true });
    expect(settings.accessibility.reducedMotion).toBe(true);
  });

  test('should update global settings correctly', () => {
    updateSettings({ locale: 'en' });
    expect(settings.locale).toBe('en');
  });

  test('should start and stop settings persistence without errors', () => {
    expect(() => startSettingsPersistence()).not.toThrow();
    expect(() => stopSettingsPersistence()).not.toThrow();
  });
});
