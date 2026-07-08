import { createSignal, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { GameContainer } from '@/components/phaser/GameContainer';
import { ClockWidget } from '@/components/board/ClockWidget';
import { MoveList } from '@/components/board/MoveList';
import { PromotionDialog } from '@/components/dialogs/PromotionDialog';
import { GameOverDialog } from '@/components/dialogs/GameOverDialog';
import { LocalRequestDialog } from '@/components/dialogs/LocalRequestDialog';
import { t } from '@/lib/i18n';
import { gameStore } from '@/store/gameStore';
import { LocalAdapter } from '@/lib/controllers';
import { useWakeLock } from '@/lib/platform/useWakeLock';

export default function ClassicLocalPlay() {
  const navigate = useNavigate();
  const dict = () => t();
  const [resultClosed, setResultClosed] = createSignal(false);
  const [controller, setController] = createSignal<LocalAdapter | null>(null);

  useWakeLock();

  const local = () => gameStore.classic?.local;

  onMount(() => {
    const cfg = gameStore.classic;
    if (!cfg?.local) {
      navigate('/classic/local', { replace: true });
      return;
    }
    const c = new LocalAdapter(cfg);
    setController(c);
    c.attach();
    onCleanup(() => c.destroy());
  });

  function rematch() {
    setResultClosed(false);
    controller()?.rematch();
  }

  function requestUndo() {
    controller()?.requestUndo();
  }

  function requestDraw() {
    controller()?.requestDraw();
  }

  function requestResign() {
    controller()?.resign();
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/classic/local')}>
            ← {dict().classic.back}
          </Button>
          <span class="font-semibold">
            {dict().classic.title} · {dict().classic.local}
          </span>
          <span class="text-xs text-amber-400">
            {gameStore.turn === 'w' ? '백 차례' : '흑 차례'}
          </span>
        </div>
        <div class="flex gap-2">
          {local()?.allowUndo && (
            <Button variant="ghost" onClick={requestUndo} class="text-xs">
              무르기 요청
            </Button>
          )}
          {local()?.allowDrawOffer && (
            <Button variant="ghost" onClick={requestDraw} class="text-xs">
              무승부 제안
            </Button>
          )}
          <Button variant="secondary" onClick={requestResign} class="text-xs">
            기권
          </Button>
        </div>
      </header>
      <main class="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <section class="flex flex-col items-center gap-3 w-full max-w-[480px]">
          <ClockWidget split="top" />
          <GameContainer />
          <ClockWidget split="bottom" />
        </section>
        <aside class="w-full max-w-[480px]">
          <MoveList />
        </aside>
      </main>
      <PromotionDialog />
      <LocalRequestDialog
        onAccept={() => controller()?.acceptRequest()}
        onDecline={() => controller()?.declineRequest()}
      />
      <GameOverDialog
        onClose={() => navigate('/')}
        onRematch={rematch}
      />
      {resultClosed() && gameStore.ui.status.kind !== 'ongoing' && (
        <div class="fixed bottom-4 right-4">
          <Button onClick={rematch}>다시 두기 (색 교대)</Button>
        </div>
      )}
    </div>
  );
}
