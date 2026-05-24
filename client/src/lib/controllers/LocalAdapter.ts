import { createEffect, on } from 'solid-js';
import type { ClassicConfig, LocalMultiConfig } from '@shared/classic';
import type { ClassicSubmode } from '@shared/mode';
import {
  gameStore,
  incrementUndosUsed,
  setLocalRequest,
  setOrientation,
} from '@/store/gameStore';
import type { Color } from '@/lib/chess/ChessManager';
import { ClassicSceneControllerBase, type PgnContext } from './ClassicSceneController';

/**
 * 핫시트 로컬멀티 어댑터. 양측 합의가 필요한 요청(무르기/무승부)을 모달
 * 흐름으로 관리하고, 옵션 ON일 때 차례 변경 시 보드를 자동 회전한다.
 */
export class LocalAdapter extends ClassicSceneControllerBase {
  readonly submode: ClassicSubmode = 'local';

  private startingColor: Color = 'w';
  private prevTurn: Color = 'w';

  constructor(config: ClassicConfig) {
    super(config);
  }

  protected override preferredOrientation(): Color {
    // 시작 시 항상 백 진영을 보여준다. 회전은 차례 변화 effect가 담당.
    return this.startingColor;
  }

  protected override start(): void {
    this.prevTurn = gameStore.turn;
    if (this.localCfg()?.autoRotateBoard) {
      createEffect(
        on(
          () => gameStore.turn,
          (turn) => {
            if (turn === this.prevTurn) return;
            this.prevTurn = turn;
            // 보드는 현재 차례 진영이 아래쪽에 오도록 회전한다.
            setOrientation(turn);
          },
        ),
      );
    }
  }

  protected override onRematch(): void {
    // 다시 두기 시 'Player A/B' 라벨이 교대된다(PGN/히스토리 헤더에 반영).
    // 보드 자체는 항상 백 진영을 아래에 두고 시작 — 자동 회전 옵션은 이후 차례에서만 작동.
    this.startingColor = this.startingColor === 'w' ? 'b' : 'w';
    this.prevTurn = 'w';
    setOrientation('w');
    setLocalRequest(undefined);
  }

  protected override historyPgnContext(): PgnContext {
    // 첫 게임: A가 백, B가 흑. 다시 두기마다 startingColor가 교대되어
    // 두 번째 게임은 B가 백, A가 흑이 된다.
    return this.startingColor === 'w'
      ? { white: 'Player A', black: 'Player B' }
      : { white: 'Player B', black: 'Player A' };
  }

  // ---------- 양측 합의 요청 ----------

  requestUndo(): void {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (gameStore.ui.localRequest) return;
    if (!this.localCfg()?.allowUndo) return;
    if (gameStore.moves.length === 0) return;
    setLocalRequest({ kind: 'undo', requestedBy: gameStore.turn });
  }

  requestDraw(): void {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (gameStore.ui.localRequest) return;
    if (!this.localCfg()?.allowDrawOffer) return;
    setLocalRequest({ kind: 'draw', requestedBy: gameStore.turn });
  }

  resign(): void {
    if (gameStore.ui.status.kind !== 'ongoing') return;
    if (gameStore.ui.localRequest) return;
    setLocalRequest({ kind: 'resign', requestedBy: gameStore.turn });
  }

  /** 요청을 수락한다. 응답자는 상대편이어야 한다. */
  acceptRequest(): void {
    const req = gameStore.ui.localRequest;
    if (!req) return;
    setLocalRequest(undefined);
    if (req.kind === 'undo') {
      // 한 쌍(2 ply) 무르기 — 마지막 한 수만 있는 경우 1 ply만 되돌린다.
      let undid = 0;
      if (this.undoOne()) undid += 1;
      if (this.undoOne()) undid += 1;
      if (undid > 0) incrementUndosUsed();
    } else if (req.kind === 'draw') {
      this.setStatusInternal({ kind: 'draw-agreement' });
    } else if (req.kind === 'resign') {
      const winner: Color = req.requestedBy === 'w' ? 'b' : 'w';
      this.setStatusInternal({ kind: 'resignation', winner });
    }
  }

  /** 요청을 거부한다. */
  declineRequest(): void {
    setLocalRequest(undefined);
  }

  private localCfg(): LocalMultiConfig | undefined {
    return this.config.local;
  }
}
