import { createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { HeaderBar } from '@/components/menu/HeaderBar';
import { ModeCard } from '@/components/menu/ModeCard';
import { SettingsModal } from './SettingsModal';
import { t } from '@/lib/i18n';
import { setMode } from '@/store/gameStore';
import { ensureMetaLoaded, metaSignal } from '@/store/metaStore';

const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION ?? '0.0.0-dev';

export default function MainMenu() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const dict = () => t();

  onMount(() => {
    void ensureMetaLoaded();
  });

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
            icon={
              <img
                src="./assets/pieces/standard/wQ.png"
                class="w-12 h-12 object-contain"
                style={{ "image-rendering": "pixelated" }}
                alt="Classic Mode"
              />
            }
            accent="classic"
            onClick={() => {
              setMode('classic');
              navigate('/classic');
            }}
          />
          <ModeCard
            title={dict().menu.adventure}
            description={dict().menu.adventureDesc}
            icon={
              <img
                src="./assets/adventure/nodes/boss.png"
                class="w-12 h-12 object-contain"
                style={{ "image-rendering": "pixelated" }}
                alt="Adventure Mode"
              />
            }
            accent="adventure"
            onClick={() => {
              setMode('adventure');
              navigate('/adventure');
            }}
          />
        </div>
      </main>
      <footer class="px-4 py-3 flex justify-between text-xs text-slate-500 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/meta')}
          class="hover:text-amber-300 transition-colors"
        >
          {dict().menu.starShards}:{' '}
          <span class="text-amber-400 tabular-nums">
            {metaSignal()?.totalStarShards ?? 0}
          </span>{' '}
          · {dict().menu.meta} →
        </button>
        <span>
          {dict().menu.build} {BUILD_VERSION}
        </span>
      </footer>
      <SettingsModal open={settingsOpen()} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
