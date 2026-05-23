import { clockState } from '@/store/clockStore';
import { formatClock } from '@/lib/chess/ClockManager';
import { gameStore } from '@/store/gameStore';

interface SideClockProps {
  side: 'w' | 'b';
  label: string;
}

function SideClock(props: SideClockProps) {
  const ms = () => (props.side === 'w' ? clockState().whiteMs : clockState().blackMs);
  const isActive = () =>
    clockState().running && clockState().turn === props.side && !clockState().flagged;
  const flagged = () => clockState().flagged === props.side;
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

export function ClockWidget() {
  const orientation = () => gameStore.ui.orientation;
  return (
    <div class="flex flex-col gap-2 w-full max-w-[560px]">
      <SideClock side={orientation() === 'w' ? 'b' : 'w'} label={orientation() === 'w' ? '흑' : '백'} />
      <SideClock side={orientation()} label={orientation() === 'w' ? '백' : '흑'} />
    </div>
  );
}
