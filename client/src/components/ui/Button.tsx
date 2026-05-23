import { splitProps, type JSX } from 'solid-js';

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-[0.98]',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-100',
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children']);
  return (
    <button
      type="button"
      class={`px-4 py-2 rounded-md font-medium transition-colors ${VARIANT[local.variant ?? 'primary']} ${local.class ?? ''}`}
      {...rest}
    >
      {local.children}
    </button>
  );
}
