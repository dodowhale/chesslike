import { settings } from '@/store/settingsStore';

/**
 * 오디오 매니저 (M5 placeholder).
 *
 * - 실제 BGM/SFX 파일이 없는 동안 Web Audio API로 단순 사인파 SFX만 재생.
 * - settingsStore.audio (bgmVolume/sfxVolume/muted)를 구독해 음량 적용.
 * - 정식 BGM/SFX 파일은 후속 작업에서 Howler.js 또는 Audio 태그로 교체.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterBgm: GainNode | null = null;
  private masterSfx: GainNode | null = null;
  private currentBgmSource: AudioBufferSourceNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;
    const AC =
      (window as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext })
        ?.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterBgm = this.ctx.createGain();
    this.masterSfx = this.ctx.createGain();
    this.masterBgm.connect(this.ctx.destination);
    this.masterSfx.connect(this.ctx.destination);
    this.applyVolumes();
    this.initialized = true;
  }

  /** settings 변경 시 호출 (settingsStore.startSettingsPersistence에서 effect로 연결 가능). */
  applyVolumes(): void {
    if (!this.masterBgm || !this.masterSfx) return;
    const muted = settings.audio.muted;
    this.masterBgm.gain.value = muted ? 0 : settings.audio.bgmVolume;
    this.masterSfx.gain.value = muted ? 0 : settings.audio.sfxVolume;
  }

  /** 짧은 클릭 SFX (Web Audio 단순 사인파). */
  playClick(): void {
    if (!this.ctx || !this.masterSfx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterSfx);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** 무브 SFX. */
  playMove(): void {
    if (!this.ctx || !this.masterSfx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.masterSfx);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playCapture(): void {
    if (!this.ctx || !this.masterSfx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.masterSfx);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * BGM placeholder — 정식 BGM 파일이 도입되기 전까지는 의도적으로 noop이다.
   * 호출 시점만 표시해 두면 정식 도입 시 별도 코드 변경 없이 활성화된다.
   */
  playBgm(_key: 'menu' | 'classic' | 'adventure' | 'boss' | 'result'): void {
    void _key; // TODO(M5+): Howler.js 또는 Audio 태그로 정식 BGM 재생
  }

  stopBgm(): void {
    this.currentBgmSource?.stop();
    this.currentBgmSource = null;
  }
}

export const audioManager = new AudioManager();
