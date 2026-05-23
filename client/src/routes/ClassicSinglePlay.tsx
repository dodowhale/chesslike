import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { GameContainer } from '@/components/phaser/GameContainer';
import { ClockWidget } from '@/components/board/ClockWidget';
import { MoveList } from '@/components/board/MoveList';
import { PromotionDialog } from '@/components/dialogs/PromotionDialog';
import { GameOverDialog } from '@/components/dialogs/GameOverDialog';
import { AnalysisPanel } from '@/components/board/AnalysisPanel';
import { t } from '@/lib/i18n';
import {
  applyMove,
  gameStore,
  incrementHintsUsed,
  incrementUndosUsed,
  resetBoard,
  setHint,
  setMode,
  setOrientation,
  setStatus,
  undoMove,
} from '@/store/gameStore';
import type { Square, GameStatus } from '@/lib/chess/ChessManager';
import {
  initClock,
  onMoveClock,
  resetClock,
  startClock,
  useClockTicker,
} from '@/store/clockStore';
import { getEngine } from '@/lib/chess/StockfishEngine';
import { resolveDifficulty } from '@/lib/chess/SingleDifficulty';
import { getPgn } from '@/store/gameStore';
import { makeId, saveHistoryEntry } from '@/lib/storage/historyRepo';

export default function ClassicSinglePlay() {
  const navigate = useNavigate();
  const dict = () => t();
  const [resultClosed, setResultClosed] = createSignal(false);
  const [thinking, setThinking] = createSignal(false);
  const [initError, setInitError] = createSignal<string | null>(null);
  const [analyzeOn, setAnalyzeOn] = createSignal(false);

  useClockTicker();

  const single = () => gameStore.classic?.single;

  function playerColor(): 'w' | 'b' {
    const pc = single()?.playerColor ?? 'w';
    if (pc === 'random') return Math.random() < 0.5 ? 'w' : 'b';
    return pc;
  }

  let resolvedPlayerColor: 'w' | 'b' = 'w';
  let gameToken = 0;
  let hintTimer: ReturnType<typeof setTimeout> | null = null;
  const engine = getEngine();

  function clearHintTimer() {
    if (hintTimer !== null) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  }

  onMount(() => {
    if (!gameStore.classic?.single) {
      navigate('/classic/single', { replace: true });
      return;
    }
    setMode('classic');
    resolvedPlayerColor = playerColor();
    gameToken += 1;
    setOrientation(resolvedPlayerColor);
    resetBoard();
    initClock(single()!.timeControl);
    resetClock('w');
    startClock();

    void engine
      .init()
      .then(() => {
        engine.newGame();
        const resolved = resolveDifficulty(single()!);
        engine.setOptions(resolved.uciOptions);
        maybeAskEngine();
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setInitError(msg);
      });

    onCleanup(() => {
      engine.stop();
      clearHintTimer();
    });
  });

  let prevMoveCount = 0;
  createEffect(
    on(
      () => gameStore.moves.length,
      (count) => {
        if (count > prevMoveCount) onMoveClock();
        prevMoveCount = count;
      },
    ),
  );

  // 게임 종료 시 자동 히스토리 저장 (게임 token으로 동일 게임 1회만 저장)
  let savedGameToken: number | null = null;
  createEffect(
    on(
      () => gameStore.ui.status.kind,
      (kind) => {
        if (kind === 'ongoing') return;
        if (savedGameToken === gameToken) return;
        savedGameToken = gameToken;
        const cfg = single();
        if (!cfg) return;
        const headers = {
          Event: 'Chesslike Classic Single',
          White: resolvedPlayerColor === 'w' ? 'Player' : 'AI',
          Black: resolvedPlayerColor === 'b' ? 'Player' : 'AI',
          Date: new Date().toISOString().split('T')[0] ?? '????.??.??',
        };
        const pgn = getPgn(headers);
        const status = gameStore.ui.status;
        const winnerStr =
          status.kind === 'checkmate' ||
          status.kind === 'resignation' ||
          status.kind === 'timeout'
            ? status.winner === 'w'
              ? '1-0'
              : '0-1'
            : status.kind === 'ongoing'
              ? '*'
              : '1/2-1/2';
        void saveHistoryEntry({
          id: makeId(),
          createdAt: Date.now(),
          mode: 'classic',
          submode: 'single',
          difficulty: cfg.difficulty,
          playerColor: resolvedPlayerColor,
          result: winnerStr,
          resultDetail: status.kind,
          pgn,
          movesCount: gameStore.moves.length,
        });
      },
    ),
  );

  // 차례가 AI일 때 자동 응답 (분석 모드 중에는 비활성화)
  createEffect(
    on(
      () => [gameStore.turn, gameStore.ui.status.kind] as const,
      ([turn, status]) => {
        if (status !== 'ongoing') return;
        if (analyzeOn()) return;
        if (!engine.isReady()) return;
        if (turn === resolvedPlayerColor) return;
        if (thinking()) return;
        void askEngine();
      },
    ),
  );

  function maybeAskEngine() {
    if (analyzeOn()) return;
    if (gameStore.turn !== resolvedPlayerColor && gameStore.ui.status.kind === 'ongoing') {
      void askEngine();
    }
  }

  async function askEngine() {
    if (thinking()) return;
    const cfg = single();
    if (!cfg) return;
    setThinking(true);
    // 진입 시점 스냅샷: 무르기/리매치 등으로 상태가 바뀌면 결과를 폐기한다.
    const expectedToken = gameToken;
    const expectedMoves = gameStore.moves.length;
    const expectedTurn = gameStore.turn;
    const resolved = resolveDifficulty(cfg);
    const moves = gameStore.moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    engine.position('startpos', moves);
    try {
      const result = await engine.go({ movetime: resolved.thinkMs });
      if (result.superseded) return;
      if (expectedToken !== gameToken) return;
      if (expectedMoves !== gameStore.moves.length) return;
      if (expectedTurn !== gameStore.turn) return;
      if (gameStore.ui.status.kind !== 'ongoing') return;
      if (result.bestmove && result.bestmove !== '(none)') {
        applyMove(result.bestmove);
      }
    } catch (err) {
      console.error('[engine] go failed', err);
    } finally {
      setThinking(false);
    }
  }

  async function requestHint() {
    const cfg = single();
    if (!cfg || !cfg.hintsEnabled) return;
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (gameStore.turn !== resolvedPlayerColor) return;
    if (thinking()) return;
    setThinking(true);
    setHint(undefined);
    clearHintTimer();
    const expectedToken = gameToken;
    const expectedMoves = gameStore.moves.length;
    try {
      const moves = gameStore.moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
      engine.position('startpos', moves);
      const result = await engine.go({ movetime: 800 });
      if (result.superseded) return;
      if (expectedToken !== gameToken) return;
      if (expectedMoves !== gameStore.moves.length) return;
      incrementHintsUsed();
      if (result.bestmove && result.bestmove !== '(none)' && result.bestmove.length >= 4) {
        const from = result.bestmove.slice(0, 2) as Square;
        const to = result.bestmove.slice(2, 4) as Square;
        setHint({ from, to });
        hintTimer = setTimeout(() => {
          hintTimer = null;
          setHint(undefined);
        }, 4000);
      }
    } finally {
      setThinking(false);
    }
  }

  function requestUndo() {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    const cfg = single();
    if (!cfg) return;
    const limit = cfg.undoLimit;
    if (limit === 0) return;
    if (limit !== -1 && gameStore.ui.undosUsed >= limit) return;
    if (gameStore.moves.length === 0) return;

    // AI가 사고 중이면 우선 중단해 race를 차단
    engine.stop();

    // 마지막 무브가 AI의 응답이면 함께 되돌리고, 그 다음 사용자 마지막 수를 되돌린다.
    let undid = false;
    const last = gameStore.moves[gameStore.moves.length - 1];
    if (last && last.color !== resolvedPlayerColor) {
      undoMove();
      undid = true;
    }
    const next = gameStore.moves[gameStore.moves.length - 1];
    if (next && next.color === resolvedPlayerColor) {
      undoMove();
      undid = true;
    }
    if (undid) incrementUndosUsed();
  }

  function resign() {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (!confirm('정말 기권하시겠어요?')) return;
    const loser = resolvedPlayerColor;
    const winner = loser === 'w' ? 'b' : 'w';
    setStatus({ kind: 'resignation', winner });
    engine.stop();
  }

  function rematch() {
    engine.stop();
    clearHintTimer();
    gameToken += 1;
    resolvedPlayerColor = playerColor();
    setOrientation(resolvedPlayerColor);
    resetBoard();
    resetClock('w');
    startClock();
    prevMoveCount = 0;
    setResultClosed(false);
    setAnalyzeOn(false);
    engine.newGame();
    maybeAskEngine();
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
          {initError() && (
            <p class="text-xs text-red-400 px-2">
              엔진 초기화 실패: {initError()}
            </p>
          )}
        </section>
        <aside class="flex flex-col gap-4 w-full max-w-[480px]">
          <ClockWidget />
          <AnalysisPanel enabled={analyzeOn} onToggle={setAnalyzeOn} />
          <MoveList
            pgnHeaders={() => ({
              Event: 'Chesslike Classic Single',
              White: resolvedPlayerColor === 'w' ? 'Player' : 'AI',
              Black: resolvedPlayerColor === 'b' ? 'Player' : 'AI',
              Date: new Date().toISOString().split('T')[0] ?? '????.??.??',
            })}
          />
        </aside>
      </main>
      <PromotionDialog />
      <GameOverDialog
        onClose={() => setResultClosed(true)}
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
