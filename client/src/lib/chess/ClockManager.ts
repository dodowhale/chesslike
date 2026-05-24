import type { ClassicTimeControl } from '@shared/classic';
import type { ClockSnapshot } from '@shared/clock';

export type ClockState = ClockSnapshot;

export interface ClockManager {
  state(): ClockState;
  /** 현재 차례 진영의 시계를 시작한다 (이미 진행 중이면 무시). */
  start(): void;
  /** 시계를 일시정지한다 (남은 시간 유지). */
  pause(): void;
  /** 무브가 적용된 직후 호출. increment를 더하고 차례를 전환한다. */
  onMove(): void;
  /** 시간을 0초로 처리하여 시간 만료 상태로 전이. */
  flag(): void;
  /** 시계가 0초가 되었는지 폴링한다(현재 차례 기준). flagged 진영도 반환. */
  tick(now: number): 'w' | 'b' | null;
  /** 시계를 초기화한다. */
  reset(turn?: 'w' | 'b'): void;
}

const UNLIMITED_MS = Number.MAX_SAFE_INTEGER;

function presetDurations(preset: NonNullable<ClassicTimeControl['preset']>): {
  initialMs: number;
  incrementMs: number;
} {
  // docs/modes/classic/COMMON.md §3 시간 제어 프리셋 정의를 따른다.
  switch (preset) {
    case 'bullet':
      return { initialMs: 60_000, incrementMs: 0 };
    case 'blitz':
      return { initialMs: 3 * 60_000, incrementMs: 2_000 };
    case 'rapid':
      return { initialMs: 10 * 60_000, incrementMs: 5_000 };
    case 'classical':
      return { initialMs: 30 * 60_000, incrementMs: 0 };
  }
}

function resolveDurations(tc: ClassicTimeControl): {
  initialMs: number;
  incrementMs: number;
  unlimited: boolean;
} {
  if (tc.kind === 'unlimited') {
    return { initialMs: UNLIMITED_MS, incrementMs: 0, unlimited: true };
  }
  if (tc.kind === 'preset' && tc.preset) {
    const { initialMs, incrementMs } = presetDurations(tc.preset);
    return { initialMs, incrementMs, unlimited: false };
  }
  const initialMs = (tc.initialSec ?? 300) * 1000;
  const incrementMs = (tc.incrementSec ?? 0) * 1000;
  return { initialMs, incrementMs, unlimited: false };
}

export function createClockManager(
  timeControl: ClassicTimeControl,
  startTurn: 'w' | 'b' = 'w',
): ClockManager {
  const { initialMs, incrementMs, unlimited } = resolveDurations(timeControl);

  let whiteMs = initialMs;
  let blackMs = initialMs;
  let turn: 'w' | 'b' = startTurn;
  let running = false;
  let flagged: 'w' | 'b' | undefined;
  let lastTick = 0;

  function snapshot(): ClockState {
    return { whiteMs, blackMs, turn, running, flagged, unlimited };
  }

  function settle(now: number): void {
    if (!running || flagged || unlimited) {
      lastTick = now;
      return;
    }
    const delta = Math.max(0, now - lastTick);
    if (turn === 'w') whiteMs = Math.max(0, whiteMs - delta);
    else blackMs = Math.max(0, blackMs - delta);
    lastTick = now;
    if (whiteMs <= 0) flagged = 'w';
    else if (blackMs <= 0) flagged = 'b';
    if (flagged) running = false;
  }

  return {
    state: snapshot,
    start() {
      if (running || flagged) return;
      lastTick = performance.now();
      running = true;
    },
    pause() {
      if (!running) return;
      settle(performance.now());
      running = false;
    },
    onMove() {
      if (flagged) return;
      const now = performance.now();
      settle(now);
      if (!unlimited) {
        if (turn === 'w') whiteMs += incrementMs;
        else blackMs += incrementMs;
      }
      turn = turn === 'w' ? 'b' : 'w';
      if (!running) {
        running = true;
        lastTick = performance.now();
      }
    },
    flag() {
      if (flagged) return;
      flagged = turn;
      running = false;
    },
    tick(now: number): 'w' | 'b' | null {
      settle(now);
      return flagged ?? null;
    },
    reset(t: 'w' | 'b' = 'w') {
      whiteMs = initialMs;
      blackMs = initialMs;
      turn = t;
      running = false;
      flagged = undefined;
      lastTick = 0;
    },
  };
}

export function formatClock(ms: number): string {
  if (!isFinite(ms) || ms >= UNLIMITED_MS / 2) return '∞';
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
