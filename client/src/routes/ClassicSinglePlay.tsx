import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { GameContainer } from '@/components/phaser/GameContainer';
import { t } from '@/lib/i18n';
import { resetBoard, setClassicConfig, setMode } from '@/store/gameStore';

export default function ClassicSinglePlay() {
  const navigate = useNavigate();
  const dict = () => t();

  onMount(() => {
    setMode('classic');
    setClassicConfig({ submode: 'single' });
    resetBoard();
  });

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/classic')}>
            ← {dict().classic.back}
          </Button>
          <span class="font-semibold">
            {dict().classic.title} · {dict().classic.single}
          </span>
        </div>
        <span class="text-xs text-slate-500">M1에서 옵션·AI 추가 예정</span>
      </header>
      <main class="flex-1 flex items-center justify-center p-4">
        <GameContainer />
      </main>
    </div>
  );
}
