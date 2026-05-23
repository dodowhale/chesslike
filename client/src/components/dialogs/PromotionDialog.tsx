import { Show } from 'solid-js';
import { Modal } from '@/components/ui/Modal';
import { cancelPromotion, gameStore, resolvePromotion } from '@/store/gameStore';
import type { PieceSymbol } from '@/lib/chess/ChessManager';

const CHOICES: { piece: PieceSymbol; label: string; icon: string }[] = [
  { piece: 'q', label: 'Queen', icon: '♛' },
  { piece: 'r', label: 'Rook', icon: '♜' },
  { piece: 'b', label: 'Bishop', icon: '♝' },
  { piece: 'n', label: 'Knight', icon: '♞' },
];

export function PromotionDialog() {
  return (
    <Show when={gameStore.ui.pendingPromotion}>
      {(pending) => (
        <Modal open={true} onClose={cancelPromotion} title="폰 승급">
          <p class="text-sm text-slate-300 mb-4">
            폰이 끝 열에 도달했습니다 ({pending().from} → {pending().to}). 승급할 기물을
            선택하세요.
          </p>
          <div class="grid grid-cols-4 gap-3">
            {CHOICES.map((c) => (
              <button
                type="button"
                onClick={() => resolvePromotion(c.piece)}
                class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-slate-700 bg-slate-800 hover:border-amber-400 hover:bg-slate-700 transition-colors"
                aria-label={c.label}
              >
                <span class="text-4xl">{c.icon}</span>
                <span class="text-xs text-slate-400">{c.label}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </Show>
  );
}
