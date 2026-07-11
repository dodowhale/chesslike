import { Show, type JSX } from 'solid-js';

interface ModeCardProps {
  title: string;
  description: string;
  icon: string | JSX.Element;
  onClick: () => void;
  accent?: 'classic' | 'adventure';
}

const ACCENT: Record<NonNullable<ModeCardProps['accent']>, string> = {
  classic:
    'from-amber-500/20 to-amber-700/10 border-amber-500/40 hover:border-amber-400',
  adventure:
    'from-purple-500/20 to-fuchsia-700/10 border-purple-500/40 hover:border-purple-400',
};

export function ModeCard(props: ModeCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`group flex flex-col items-start gap-3 p-6 w-full md:w-72 rounded-xl border-2 bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-xl text-left ${ACCENT[props.accent ?? 'classic']}`}
    >
      <span class="text-5xl flex items-center justify-center min-h-[48px]">
        <Show when={typeof props.icon === 'string'} fallback={props.icon}>
          {props.icon}
        </Show>
      </span>
      <span class="text-2xl font-bold text-slate-100">{props.title}</span>
      <span class="text-sm text-slate-300 leading-relaxed">{props.description}</span>
    </button>
  );
}
