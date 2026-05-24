import { createSignal, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { GameContainer } from '@/components/phaser/GameContainer';
import { ClockWidget } from '@/components/board/ClockWidget';
import { MoveList } from '@/components/board/MoveList';
import { PromotionDialog } from '@/components/dialogs/PromotionDialog';
import { GameOverDialog } from '@/components/dialogs/GameOverDialog';
import { AnalysisPanel } from '@/components/board/AnalysisPanel';
import { t } from '@/lib/i18n';
import { gameStore } from '@/store/gameStore';
import { SingleAdapter } from '@/lib/controllers';

export default function ClassicSinglePlay() {
  const navigate = useNavigate();
  const dict = () => t();
  const [resultClosed, setResultClosed] = createSignal(false);
  const [analyzeOn, setAnalyzeOn] = createSignal(false);
  const [controller, setController] = createSignal<SingleAdapter | null>(null);

  const single = () => gameStore.classic?.single;
  const thinking = () => gameStore.ui.aiThinking;

  onMount(() => {
    const cfg = gameStore.classic;
    if (!cfg?.single) {
      navigate('/classic/single', { replace: true });
      return;
    }
    const c = new SingleAdapter(cfg);
    c.bindAnalysisEnabledAccessor(analyzeOn);
    setController(c);
    c.attach();

    onCleanup(() => {
      c.destroy();
    });
  });

  function resign() {
    controller()?.resign();
  }

  function requestHint() {
    void controller()?.requestHint();
  }

  function requestUndo() {
    controller()?.requestUndo();
  }

  function rematch() {
    setResultClosed(false);
    setAnalyzeOn(false);
    controller()?.rematch();
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/classic/single')}>
            ← {dict().classic.back}
          </Button>
          <span class="font-semibold">
            {dict().classic.title} · {dict().classic.single}
          </span>
          {thinking() && (
            <span class="text-xs text-amber-400 animate-pulse">AI 사고 중…</span>
          )}
        </div>
        <div class="flex gap-2">
          {single()?.hintsEnabled && (
            <Button variant="ghost" onClick={requestHint} class="text-xs">
              힌트 ({gameStore.ui.hintsUsed})
            </Button>
          )}
          {single()?.undoLimit !== 0 && (
            <Button variant="ghost" onClick={requestUndo} class="text-xs">
              무르기 ({single()?.undoLimit === -1
                ? gameStore.ui.undosUsed
                : `${gameStore.ui.undosUsed}/${single()?.undoLimit}`})
            </Button>
          )}
          <Button variant="secondary" onClick={resign} class="text-xs">
            기권
          </Button>
        </div>
      </header>
      <main class="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4">
        <section class="flex flex-col items-center gap-3 w-full max-w-[480px]">
          <GameContainer />
          {controller()?.initError() && (
            <p class="text-xs text-red-400 px-2">
              엔진 초기화 실패: {controller()!.initError()}
            </p>
          )}
        </section>
        <aside class="flex flex-col gap-4 w-full max-w-[480px]">
          <ClockWidget />
          <AnalysisPanel enabled={analyzeOn} onToggle={setAnalyzeOn} />
          <MoveList />
        </aside>
      </main>
      <PromotionDialog />
      <GameOverDialog
        onClose={() => setResultClosed(true)}
        onRematch={rematch}
        onAnalyze={() => {
          setResultClosed(true);
          setAnalyzeOn(true);
        }}
      />
      {resultClosed() && gameStore.ui.status.kind !== 'ongoing' && (
        <div class="fixed bottom-4 right-4">
          <Button onClick={rematch}>다시 두기</Button>
        </div>
      )}
    </div>
  );
}
