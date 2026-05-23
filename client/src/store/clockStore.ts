import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { ClassicTimeControl } from '@shared/classic';
import { createClockManager, type ClockManager, type ClockState } from '@/lib/chess/ClockManager';
import { gameStore, setStatus } from '@/store/gameStore';

let manager: ClockManager | null = null;

const [state, setState] = createSignal<ClockState>({
  whiteMs: 0,
  blackMs: 0,
  turn: 'w',
  running: false,
});

export const clockState = state;

export function initClock(tc: ClassicTimeControl): void {
  manager = createClockManager(tc, 'w');
  setState(manager.state());
}

export function startClock(): void {
  manager?.start();
  if (manager) setState(manager.state());
}

export function pauseClock(): void {
  manager?.pause();
  if (manager) setState(manager.state());
}

export function onMoveClock(): void {
  manager?.onMove();
  if (manager) setState(manager.state());
}

export function flagClock(): void {
  manager?.flag();
  if (manager) setState(manager.state());
}

export function resetClock(turn: 'w' | 'b' = 'w'): void {
  manager?.reset(turn);
  if (manager) setState(manager.state());
}

/** Solid 컴포넌트 안에서 호출. 매 frame마다 tick + 시간 만료 시 자동 종료. */
export function useClockTicker(): void {
  let raf: number | null = null;

  createEffect(() => {
    const s = state();
    if (!s.running || s.flagged) return;
    const loop = () => {
      if (!manager) return;
      const now = performance.now();
      const flag = manager.tick(now);
      setState(manager.state());
      if (flag) {
        const winner = flag === 'w' ? 'b' : 'w';
        setStatus({ kind: 'timeout', winner });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    onCleanup(() => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    });
  });

  // 게임이 종료되면 시계 정지
  createEffect(() => {
    if (gameStore.ui.status.kind !== 'ongoing') {
      pauseClock();
    }
  });
}
