import { createEffect, createSignal, on, type Accessor } from 'solid-js';
import type { ClassicConfig, ClassicTimeControl } from '@shared/classic';
import type { ClassicSubmode, Mode } from '@shared/mode';
import {
  applyMove,
  gameStore,
  resetBoard,
  setClassicConfig,
  setClockSnapshot,
  setMode,
  setOrientation,
  setStatus,
  undoMove,
  getChessManager,
} from '@/store/gameStore';
import {
  createClockManager,
  type ClockManager,
} from '@/lib/chess/ClockManager';
import type {
  Color,
  GameStatus,
  MoveDescriptor,
} from '@/lib/chess/ChessManager';
import { getPgn } from '@/store/gameStore';
import { makeId, saveHistoryEntry } from '@/lib/storage/historyRepo';
import type { ClassicSceneController } from './types';

export interface PgnContext {
  white: string;
  black: string;
  difficulty?: string;
  playerColor?: Color;
}

/**
 * 클래식 두 서브모드(single/local) 공통 로직을 흡수한 베이스. ClockManager
 * 인스턴스를 소유하며 매 frame마다 gameStore.ui.clock을 갱신한다.
 *
 * 라이프사이클:
 *   const controller = new SingleAdapter(config);
 *   onMount(() => controller.attach());
 *   onCleanup(() => controller.destroy());
 */
export abstract class ClassicSceneControllerBase implements ClassicSceneController {
  abstract readonly submode: ClassicSubmode;

  protected readonly config: ClassicConfig;
  protected clock: ClockManager;
  protected gameToken = 0;
  protected savedGameToken: number | null = null;
  protected prevMoveCount = 0;
  private raf: number | null = null;
  private initErrorGetter: Accessor<string | null>;
  private setInitErrorSetter: (value: string | null) => void;

  constructor(config: ClassicConfig) {
    this.config = config;
    this.clock = createClockManager(this.resolveTimeControl(), 'w');
    const [get, set] = createSignal<string | null>(null);
    this.initErrorGetter = get;
    this.setInitErrorSetter = set;
  }

  initError = () => this.initErrorGetter();

  attach(): void {
    setMode(this.modeIdentifier());
    setClassicConfig(this.config);
    this.gameToken += 1;
    this.applyOrientation();
    resetBoard();
    this.clock.reset('w');
    this.syncClockSnapshot();
    this.clock.start();
    this.startTicker();
    this.registerEffects();
    void this.start();
  }

  destroy(): void {
    this.clock.pause();
    setClockSnapshot(undefined);
    this.stopTicker();
    this.onDestroy();
  }

  rematch(): void {
    this.gameToken += 1;
    this.savedGameToken = null;
    this.applyOrientation();
    resetBoard();
    this.clock.reset('w');
    this.syncClockSnapshot();
    this.clock.start();
    this.startTicker();
    this.prevMoveCount = 0;
    void this.onRematch();
  }

  abstract requestUndo(): void;
  abstract resign(): void;

  protected setInitError(value: string | null): void {
    this.setInitErrorSetter(value);
  }

  protected modeIdentifier(): Mode {
    return 'classic';
  }

  protected applyOrientation(): void {
    setOrientation(this.preferredOrientation());
  }

  protected abstract preferredOrientation(): Color;
  protected abstract start(): Promise<void> | void;
  protected abstract historyPgnContext(): PgnContext;

  protected onAfterMove(_move: MoveDescriptor): void {}
  protected onStatusChanged(_status: GameStatus): void {}
  protected onDestroy(): void {}
  protected onRematch(): Promise<void> | void {}

  protected applyEngineMove(uci: string): MoveDescriptor | null {
    return applyMove(uci);
  }

  protected undoOne(): MoveDescriptor | undefined {
    return undoMove();
  }

  protected setStatusInternal(status: GameStatus): void {
    setStatus(status);
  }

  protected syncClockSnapshot(): void {
    setClockSnapshot(this.clock.state());
  }

  private resolveTimeControl(): ClassicTimeControl {
    if (this.submode === 'single') {
      return this.config.single?.timeControl ?? { kind: 'preset', preset: 'rapid' };
    }
    return this.config.local?.timeControl ?? { kind: 'preset', preset: 'rapid' };
  }

  private startTicker(): void {
    if (this.raf !== null) return;
    const loop = () => {
      const flag = this.clock.tick(performance.now());
      this.syncClockSnapshot();
      if (flag) {
        const opponent: Color = flag === 'w' ? 'b' : 'w';
        const isInsufficient = getChessManager().hasInsufficientMaterialToMate(opponent);
        if (isInsufficient) {
          this.setStatusInternal({ kind: 'insufficient-material' });
        } else {
          this.setStatusInternal({ kind: 'timeout', winner: opponent });
        }
        this.raf = null;
        return;
      }
      if (gameStore.ui.status.kind !== 'ongoing') {
        this.raf = null;
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopTicker(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  private registerEffects(): void {
    createEffect(
      on(
        () => gameStore.moves.length,
        (count) => {
          if (count > this.prevMoveCount) {
            this.clock.onMove();
            this.syncClockSnapshot();
            const last = gameStore.moves[count - 1];
            if (last) this.onAfterMove(last);
          }
          this.prevMoveCount = count;
        },
      ),
    );

    createEffect(
      on(
        () => gameStore.ui.status.kind,
        (kind) => {
          if (kind === 'ongoing') return;
          this.clock.pause();
          this.syncClockSnapshot();
          this.stopTicker();
          if (this.savedGameToken !== this.gameToken) {
            this.savedGameToken = this.gameToken;
            this.persistHistory(gameStore.ui.status);
          }
          this.onStatusChanged(gameStore.ui.status);
        },
      ),
    );
  }

  private persistHistory(status: GameStatus): void {
    const ctx = this.historyPgnContext();
    const today = new Date().toISOString().split('T')[0] ?? '????.??.??';
    const headers: Record<string, string> = {
      Event:
        this.submode === 'single'
          ? 'Chesslike Classic Single'
          : 'Chesslike Classic Local',
      White: ctx.white,
      Black: ctx.black,
      Date: today,
    };
    if (status.kind === 'checkmate' ||
        status.kind === 'resignation' ||
        status.kind === 'timeout') {
      headers.Result = status.winner === 'w' ? '1-0' : '0-1';
    } else if (
      status.kind === 'stalemate' ||
      status.kind === 'insufficient-material' ||
      status.kind === 'threefold-repetition' ||
      status.kind === 'fifty-move-rule' ||
      status.kind === 'draw-agreement'
    ) {
      headers.Result = '1/2-1/2';
    }
    const pgn = getPgn(headers);
    const result = headers.Result ?? '*';
    void saveHistoryEntry({
      id: makeId(),
      createdAt: Date.now(),
      mode: 'classic',
      submode: this.submode,
      difficulty: ctx.difficulty,
      playerColor: ctx.playerColor,
      result,
      resultDetail: status.kind,
      pgn,
      movesCount: gameStore.moves.length,
    });
  }
}
