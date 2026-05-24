import { Show } from 'solid-js';
import { formatClock } from '@/lib/chess/ClockManager';
import { gameStore } from '@/store/gameStore';

interface SideClockProps {
  side: 'w' | 'b';
  label: string;
}

function SideClock(props: SideClockProps) {
  const clock = () => gameStore.ui.clock;
  const ms = () =>
    props.side === 'w' ? (clock()?.whiteMs ?? 0) : (clock()?.blackMs ?? 0);
  const isActive = () => {
    const c = clock();
    if (!c) return false;
    return c.running && c.turn === props.side && !c.flagged;
  };
  const flagged = () => clock()?.flagged === props.side;
  return (
    <div
      class={`flex items-center justify-between px-3 py-2 rounded-md border ${
        isActive()
          ? 'border-amber-400 bg-amber-500/10'
          : 'border-slate-700 bg-slate-900'
      } ${flagged() ? 'border-red-500 bg-red-500/10' : ''}`}
    >
      <span class="text-xs text-slate-400">{props.label}</span>
      <span
        class={`font-mono text-lg tabular-nums ${
          flagged() ? 'text-red-400' : 'text-slate-100'
        }`}
      >
        {formatClock(ms())}
      </span>
    </div>
  );
}

interface ClockWidgetProps {
  /** 'both'(기본): 두 시계 세로 적층. 'top': 상대편 한쪽만. 'bottom': 본인 한쪽만. */
  split?: 'both' | 'top' | 'bottom';
}

export function ClockWidget(props: ClockWidgetProps = {}) {
  const split = () => props.split ?? 'both';
  const orientation = () => gameStore.ui.orientation;
  // 화면 아래쪽(bottom)은 orientation 진영, 위쪽(top)은 그 반대.
  const bottomSide = orientation;
  const topSide = () => (orientation() === 'w' ? 'b' : 'w');
  return (
    <Show when={gameStore.ui.clock}>
      <Show when={split() === 'both' || split() === 'top'}>
        <div class="w-full max-w-[480px]">
          <SideClock side={topSide()} label={topSide() === 'w' ? '백' : '흑'} />
        </div>
      </Show>
      <Show when={split() === 'both' || split() === 'bottom'}>
        <div class="w-full max-w-[480px]">
          <SideClock side={bottomSide()} label={bottomSide() === 'w' ? '백' : '흑'} />
        </div>
      </Show>
    </Show>
  );
}
