import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { HeaderBar } from '@/components/menu/HeaderBar';
import { ModeCard } from '@/components/menu/ModeCard';
import { SettingsModal } from './SettingsModal';
import { t } from '@/lib/i18n';
import { setMode } from '@/store/gameStore';

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION ?? '0.0.0-dev';

export default function MainMenu() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const dict = () => t();

  return (
    <div class="min-h-screen flex flex-col">
      <HeaderBar onOpenSettings={() => setSettingsOpen(true)} />
      <main class="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-10">
        <div class="text-center max-w-lg">
          <h1 class="text-3xl md:text-4xl font-bold text-amber-400 mb-2">
            {dict().app.title}
          </h1>
          <p class="text-slate-400 text-sm md:text-base">{dict().app.subtitle}</p>
        </div>
        <div class="flex flex-col md:flex-row gap-4 md:gap-6 w-full md:w-auto items-stretch">
          <ModeCard
            title={dict().menu.classic}
            description={dict().menu.classicDesc}
            icon="♛"
            accent="classic"
            onClick={() => {
              setMode('classic');
              navigate('/classic');
            }}
          />
          <ModeCard
            title={dict().menu.adventure}
            description={dict().menu.adventureDesc}
            icon="⚔"
            accent="adventure"
            onClick={() => {
              setMode('adventure');
              navigate('/adventure');
            }}
          />
        </div>
      </main>
      <footer class="px-4 py-3 flex justify-between text-xs text-slate-500 border-t border-slate-800">
        <span>
          {dict().menu.starShards}: <span class="text-amber-400 tabular-nums">0</span>
        </span>
        <span>
          {dict().menu.build} {BUILD_VERSION}
        </span>
      </footer>
      <SettingsModal open={settingsOpen()} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
