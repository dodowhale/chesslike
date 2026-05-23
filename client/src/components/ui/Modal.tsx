import { Show, createEffect, onCleanup, type JSX } from 'solid-js';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
}

export function Modal(props: ModalProps) {
  createEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.currentTarget === e.target) props.onClose();
        }}
        role="presentation"
      >
        <div
          class="w-[min(92vw,520px)] max-h-[88vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6"
          role="dialog"
          aria-modal="true"
        >
          {props.title && (
            <h2 class="text-xl font-semibold mb-4 text-amber-400">{props.title}</h2>
          )}
          {props.children}
        </div>
      </div>
    </Show>
  );
}
