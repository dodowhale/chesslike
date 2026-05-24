import { Show } from 'solid-js';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { gameStore, type LocalRequestKind } from '@/store/gameStore';
import type { Color } from '@/lib/chess/ChessManager';

interface LocalRequestDialogProps {
  onAccept: () => void;
  onDecline: () => void;
}

function colorLabel(c: Color): string {
  return c === 'w' ? '백' : '흑';
}

function title(kind: LocalRequestKind, requestedBy: Color): string {
  const requester = colorLabel(requestedBy);
  const responder = colorLabel(requestedBy === 'w' ? 'b' : 'w');
  switch (kind) {
    case 'undo':
      return `${requester}이 무르기를 요청했습니다 — ${responder} 동의?`;
    case 'draw':
      return `${requester}이 무승부를 제안했습니다 — ${responder} 동의?`;
    case 'resign':
      return `${requester}, 정말 기권하시겠어요?`;
  }
}

function description(kind: LocalRequestKind): string {
  switch (kind) {
    case 'undo':
      return '직전 한 쌍(상대 + 본인)의 수를 함께 되돌립니다.';
    case 'draw':
      return '양측 합의로 무승부가 성립됩니다.';
    case 'resign':
      return '이 게임을 포기하면 상대가 승리합니다.';
  }
}

export function LocalRequestDialog(props: LocalRequestDialogProps) {
  const req = () => gameStore.ui.localRequest;
  const isResign = () => req()?.kind === 'resign';
  return (
    <Show when={req()}>
      {(r) => (
        <Modal open={true} onClose={props.onDecline} title={title(r().kind, r().requestedBy)}>
          <p class="text-sm text-slate-300 mb-4">{description(r().kind)}</p>
          <div class="flex justify-end gap-2">
            <Button variant="ghost" onClick={props.onDecline}>
              {isResign() ? '아니오' : '거부'}
            </Button>
            <Button onClick={props.onAccept}>
              {isResign() ? '기권 확정' : '동의'}
            </Button>
          </div>
        </Modal>
      )}
    </Show>
  );
}
