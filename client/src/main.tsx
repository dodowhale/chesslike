/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { hydrateSettings, startSettingsPersistence } from '@/store/settingsStore';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

void hydrateSettings().then(() => {
  startSettingsPersistence();
});

if (import.meta.env.DEV) {
  void (async () => {
    const gs = await import('@/store/gameStore');
    const cs = await import('@/store/clockStore');
    const bus = await import('@/lib/phaser/bridge/eventBus');
    (window as unknown as { __chesslike: unknown }).__chesslike = {
      game: gs,
      clock: cs,
      bus: bus.eventBus,
    };
  })();
}

render(() => <App />, root);
