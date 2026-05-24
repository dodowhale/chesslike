import { Show } from 'solid-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { gameStore } from '@/store/gameStore';
import type { GameStatus } from '@/lib/chess/ChessManager';

interface GameOverDialogProps {
  onClose?: () => void;
  onRematch?: () => void;
  onAnalyze?: () => void;
}

function statusTitle(s: GameStatus): string {
  switch (s.kind) {
    case 'checkmate':
      return s.winner === 'w' ? '백 승리 — 체크메이트' : '흑 승리 — 체크메이트';
    case 'stalemate':
      return '무승부 — 스테일메이트';
    case 'insufficient-material':
      return '무승부 — 기물 부족';
    case 'threefold-repetition':
      return '무승부 — 3회 동형 반복';
    case 'fifty-move-rule':
      return '무승부 — 50수 규칙';
    case 'resignation':
      return s.winner === 'w' ? '백 승리 — 기권' : '흑 승리 — 기권';
    case 'timeout':
      return s.winner === 'w' ? '백 승리 — 시간 만료' : '흑 승리 — 시간 만료';
    case 'draw-agreement':
      return '무승부 — 합의';
    default:
      return '진행 중';
  }
}

function statusEmoji(s: GameStatus): string {
  if (s.kind === 'ongoing') return '';
  if (s.kind === 'checkmate' || s.kind === 'resignation' || s.kind === 'timeout') {
    return s.winner === 'w' ? '♔' : '♚';
  }
  return '🤝';
}

export function GameOverDialog(props: GameOverDialogProps) {
  const status = () => gameStore.ui.status;
  const open = () => status().kind !== 'ongoing';
  const lastMove = () => gameStore.moves.at(-1);

  return (
    <Show when={open()}>
      <Modal open={true} onClose={() => props.onClose?.()} title={statusTitle(status())}>
        <div class="flex flex-col items-center gap-4 py-2">
          <span class="text-6xl">{statusEmoji(status())}</span>
          <Show when={lastMove()}>
            {(m) => (
              <p class="text-sm text-slate-400">
                마지막 수: <span class="text-amber-400 font-mono">{m().san}</span>
              </p>
            )}
          </Show>
          <div class="flex gap-2 mt-2">
            <Show when={props.onRematch}>
              <Button onClick={() => props.onRematch?.()}>다시 두기</Button>
            </Show>
            <Show when={props.onAnalyze}>
              <Button variant="secondary" onClick={() => props.onAnalyze?.()}>
                분석 모드
              </Button>
            </Show>
            <Button variant="ghost" onClick={() => props.onClose?.()}>
              닫기
            </Button>
          </div>
        </div>
      </Modal>
    </Show>
  );
}
