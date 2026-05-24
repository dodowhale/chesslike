type Handler<T = unknown> = (payload: T) => void;

export interface BoardPieceHp {
  square: string;
  hp: number;
  maxHp: number;
}

export type LastMoveKind = 'normal' | 'capture' | 'castling' | 'en-passant' | 'promotion';

export interface LastMove {
  from: string;
  to: string;
  kind: LastMoveKind;
  /** kind='castling' 시 룩의 from/to. */
  rookFrom?: string;
  rookTo?: string;
  /** kind='en-passant' 시 캡처되는 폰의 실제 칸 (to와 다름). */
  victimSquare?: string;
  /** kind='promotion' 시 승급된 기물 종류 (소문자: 'q'|'r'|'b'|'n'). */
  promotedTo?: string;
  /** 피격된 sprite의 PIECE_KEY (예: 'bP', 'wN'). capture/en-passant/promotion(캡처 동반) 시 채움. */
  capturedKey?: string;
}

export type BoardTheme = 'default' | 'forest' | 'ocean';

export interface BoardRenderState {
  fen: string;
  selected?: string;
  highlights: readonly string[];
  lastMove?: LastMove;
  checkSquare?: string;
  hintFrom?: string;
  hintTo?: string;
  orientation: 'w' | 'b';
  interactive: boolean;
  /** orientation 변경 시 트랜지션 효과를 건너뛸지 여부 (모션 감소 옵션 등). */
  instant?: boolean;
  /** 모험 모드일 때만 채워지는 piece HP 정보. BoardScene이 HP 바를 그린다. */
  pieceHps?: readonly BoardPieceHp[];
  /** 기물 이동 애니메이션 비활성 플래그 (예: 모션 감소 옵션 시). */
  noPieceAnim?: boolean;
  theme?: BoardTheme;
}

export interface GameEvents {
  'state:board': BoardRenderState;
  'cmd:reset': void;
  'cmd:applyMove': { uci: string };
  'cmd:selectSquare': { square: string };
  'cmd:clearSelection': void;
  'board:ready': void;
  'board:squareClicked': { square: string };
}

class TypedEventBus {
  private handlers = new Map<string, Set<Handler>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    const key = event as string;
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    const set = this.handlers.get(event as string);
    if (set) set.delete(handler as Handler);
  }

  emit<K extends keyof GameEvents>(
    event: K,
    ...args: GameEvents[K] extends void ? [] : [payload: GameEvents[K]]
  ): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    const payload = args[0] as GameEvents[K];
    for (const handler of set) {
      (handler as Handler<GameEvents[K]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new TypedEventBus();
