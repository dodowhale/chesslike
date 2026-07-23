import { describe, expect, test } from 'bun:test';
import { audioManager } from './AudioManager';

describe('AudioManager', () => {
  test('should handle init and volume adjustments gracefully without browser AudioContext', () => {
    expect(() => audioManager.init()).not.toThrow();
    expect(() => audioManager.applyVolumes()).not.toThrow();
  });

  test('should execute SFX play methods without throwing', () => {
    expect(() => audioManager.playClick()).not.toThrow();
    expect(() => audioManager.playMove()).not.toThrow();
    expect(() => audioManager.playCapture()).not.toThrow();
  });

  test('should execute BGM methods without throwing', () => {
    expect(() => audioManager.playBgm('menu')).not.toThrow();
    expect(() => audioManager.playBgm('classic')).not.toThrow();
    expect(() => audioManager.playBgm('adventure')).not.toThrow();
    expect(() => audioManager.playBgm('boss')).not.toThrow();
    expect(() => audioManager.playBgm('result')).not.toThrow();
    expect(() => audioManager.stopBgm()).not.toThrow();
  });
});
