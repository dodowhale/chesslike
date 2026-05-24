/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { hydrateSettings, startSettingsPersistence } from '@/store/settingsStore';
import { audioManager } from '@/lib/audio/AudioManager';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

void hydrateSettings().then(() => {
  startSettingsPersistence();
});

// AudioManager는 브라우저 정책상 사용자 제스처 후에야 init 가능.
function initAudioOnce() {
  audioManager.init();
  audioManager.applyVolumes();
  document.removeEventListener('pointerdown', initAudioOnce);
  document.removeEventListener('keydown', initAudioOnce);
}
document.addEventListener('pointerdown', initAudioOnce, { once: true });
document.addEventListener('keydown', initAudioOnce, { once: true });

if (import.meta.env.DEV) {
  void (async () => {
    const gs = await import('@/store/gameStore');
    const bus = await import('@/lib/phaser/bridge/eventBus');
    (window as unknown as { __chesslike: unknown }).__chesslike = {
      game: gs,
      bus: bus.eventBus,
    };
  })();
}

render(() => <App />, root);
