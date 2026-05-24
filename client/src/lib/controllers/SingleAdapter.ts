import { createEffect, on } from 'solid-js';
import type { ClassicConfig, SingleModeConfig } from '@shared/classic';
import type { ClassicSubmode } from '@shared/mode';
import {
  gameStore,
  incrementHintsUsed,
  incrementUndosUsed,
  setAiThinking,
  setHint,
} from '@/store/gameStore';
import type { Color, GameStatus, MoveDescriptor, Square } from '@/lib/chess/ChessManager';
import { getEngine, type StockfishEngine } from '@/lib/chess/StockfishEngine';
import { resolveDifficulty } from '@/lib/chess/SingleDifficulty';
import { ClassicSceneControllerBase, type PgnContext } from './ClassicSceneController';

/**
 * vs AI 어댑터. Stockfish 엔진을 보유하고 자동 응답·힌트·무르기를 구현.
 * 분석 모드 ON일 때는 자동 응답을 비활성화한다(엔진 공유 충돌 방지).
 */
export class SingleAdapter extends ClassicSceneControllerBase {
  readonly submode: ClassicSubmode = 'single';

  private engine: StockfishEngine;
  private resolvedColor: Color = 'w';
  private thinking = false;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private analysisEnabled = () => false;

  constructor(config: ClassicConfig) {
    super(config);
    this.engine = getEngine();
  }

  /** 분석 모드 토글 접근자를 라우트 컴포넌트가 주입한다. true이면 자동 응답을 멈춘다. */
  bindAnalysisEnabledAccessor(accessor: () => boolean): void {
    this.analysisEnabled = accessor;
  }

  protected override preferredOrientation(): Color {
    this.resolvedColor = this.resolvePlayerColor();
    return this.resolvedColor;
  }

  protected override async start(): Promise<void> {
    const cfg = this.singleCfg();
    if (!cfg) return;
    try {
      await this.engine.init();
      this.engine.newGame();
      const resolved = resolveDifficulty(cfg);
      this.engine.setOptions(resolved.uciOptions);
      this.maybeAskEngine();
    } catch (err) {
      this.setInitError(err instanceof Error ? err.message : String(err));
    }

    // turn / status / analyzeOn 변화 시 AI 응답 트리거
    createEffect(
      on(
        () => [
          gameStore.turn,
          gameStore.ui.status.kind,
          this.analysisEnabled(),
        ] as const,
        ([turn, status, analyzing]) => {
          if (status !== 'ongoing') return;
          if (analyzing) return;
          if (!this.engine.isReady()) return;
          if (turn === this.resolvedColor) return;
          if (this.thinking) return;
          void this.askEngine();
        },
      ),
    );
  }

  protected override onDestroy(): void {
    this.engine.stop();
    this.clearHintTimer();
  }

  protected override onRematch(): Promise<void> | void {
    this.engine.stop();
    this.clearHintTimer();
    this.engine.newGame();
    this.maybeAskEngine();
  }

  protected override historyPgnContext(): PgnContext {
    const cfg = this.singleCfg();
    return {
      white: this.resolvedColor === 'w' ? 'Player' : 'AI',
      black: this.resolvedColor === 'b' ? 'Player' : 'AI',
      difficulty: cfg?.difficulty,
      playerColor: this.resolvedColor,
    };
  }

  protected override onAfterMove(_move: MoveDescriptor): void {
    // turn 변화 effect가 응답을 트리거하므로 별도 처리 없음
  }

  protected override onStatusChanged(_status: GameStatus): void {
    this.engine.stop();
  }

  async requestHint(): Promise<void> {
    const cfg = this.singleCfg();
    if (!cfg || !cfg.hintsEnabled) return;
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (gameStore.turn !== this.resolvedColor) return;
    if (this.thinking) return;
    this.setThinkingState(true);
    setHint(undefined);
    this.clearHintTimer();
    const expectedToken = this.gameToken;
    const expectedMoves = gameStore.moves.length;
    try {
      const moves = gameStore.moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
      this.engine.position('startpos', moves);
      const result = await this.engine.go({ movetime: 800 });
      if (result.superseded) return;
      if (expectedToken !== this.gameToken) return;
      if (expectedMoves !== gameStore.moves.length) return;
      incrementHintsUsed();
      if (
        result.bestmove &&
        result.bestmove !== '(none)' &&
        result.bestmove.length >= 4
      ) {
        const from = result.bestmove.slice(0, 2) as Square;
        const to = result.bestmove.slice(2, 4) as Square;
        setHint({ from, to });
        this.hintTimer = setTimeout(() => {
          this.hintTimer = null;
          setHint(undefined);
        }, 4000);
      }
    } finally {
      this.setThinkingState(false);
    }
  }

  requestUndo(): void {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    const cfg = this.singleCfg();
    if (!cfg) return;
    const limit = cfg.undoLimit;
    if (limit === 0) return;
    if (limit !== -1 && gameStore.ui.undosUsed >= limit) return;
    if (gameStore.moves.length === 0) return;

    this.engine.stop();

    let undid = false;
    const last = gameStore.moves[gameStore.moves.length - 1];
    if (last && last.color !== this.resolvedColor) {
      this.undoOne();
      undid = true;
    }
    const next = gameStore.moves[gameStore.moves.length - 1];
    if (next && next.color === this.resolvedColor) {
      this.undoOne();
      undid = true;
    }
    if (undid) incrementUndosUsed();
  }

  resign(): void {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (!confirm('정말 기권하시겠어요?')) return;
    const loser = this.resolvedColor;
    const winner: Color = loser === 'w' ? 'b' : 'w';
    this.setStatusInternal({ kind: 'resignation', winner });
  }

  private clearHintTimer(): void {
    if (this.hintTimer !== null) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }

  private singleCfg(): SingleModeConfig | undefined {
    return this.config.single;
  }

  private resolvePlayerColor(): Color {
    const pc = this.singleCfg()?.playerColor ?? 'w';
    if (pc === 'random') return Math.random() < 0.5 ? 'w' : 'b';
    return pc;
  }

  private setThinkingState(thinking: boolean): void {
    this.thinking = thinking;
    setAiThinking(thinking);
  }

  private maybeAskEngine(): void {
    if (this.analysisEnabled()) return;
    if (gameStore.turn !== this.resolvedColor && gameStore.ui.status.kind === 'ongoing') {
      void this.askEngine();
    }
  }

  private async askEngine(): Promise<void> {
    if (this.thinking) return;
    const cfg = this.singleCfg();
    if (!cfg) return;
    this.setThinkingState(true);
    const expectedToken = this.gameToken;
    const expectedMoves = gameStore.moves.length;
    const expectedTurn = gameStore.turn;
    const resolved = resolveDifficulty(cfg);
    const moves = gameStore.moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
    this.engine.position('startpos', moves);
    try {
      const result = await this.engine.go({ movetime: resolved.thinkMs });
      if (result.superseded) return;
      if (expectedToken !== this.gameToken) return;
      if (expectedMoves !== gameStore.moves.length) return;
      if (expectedTurn !== gameStore.turn) return;
      if (gameStore.ui.status.kind !== 'ongoing') return;
      if (result.bestmove && result.bestmove !== '(none)') {
        this.applyEngineMove(result.bestmove);
      }
    } catch (err) {
      console.error('[SingleAdapter] go failed', err);
    } finally {
      this.setThinkingState(false);
    }
  }
}
