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

render(() => <App />, root);
