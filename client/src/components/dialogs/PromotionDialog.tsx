import { Show } from 'solid-js';
import { Modal } from '@/components/ui/Modal';
import { cancelPromotion, gameStore, getActiveCharacterId, resolvePromotion } from '@/store/gameStore';
import type { PieceSymbol } from '@/lib/chess/ChessManager';

const CHOICES: { piece: PieceSymbol; label: string; key: 'Q' | 'R' | 'B' | 'N' }[] = [
  { piece: 'q', label: 'Queen', key: 'Q' },
  { piece: 'r', label: 'Rook', key: 'R' },
  { piece: 'b', label: 'Bishop', key: 'B' },
  { piece: 'n', label: 'Knight', key: 'N' },
];

function pawnSide(to: string): 'w' | 'b' {
  // chess.js promotion은 rank 8(백) / rank 1(흑)에서만 가능
  return to.charAt(1) === '8' ? 'w' : 'b';
}

export function PromotionDialog() {
  return (
    <Show when={gameStore.ui.pendingPromotion}>
      {(pending) => {
        const characterId = getActiveCharacterId();
        const side = pawnSide(pending().to);
        return (
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
                  <img
                    src={`/assets/pieces/${characterId}/${side}${c.key}.png`}
                    alt={c.label}
                    width={48}
                    height={48}
                    class="w-12 h-12"
                    style={{ 'image-rendering': 'pixelated' }}
                  />
                  <span class="text-xs text-slate-400">{c.label}</span>
                </button>
              ))}
            </div>
          </Modal>
        );
      }}
    </Show>
  );
}
