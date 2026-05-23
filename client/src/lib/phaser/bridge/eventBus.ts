type Handler<T = unknown> = (payload: T) => void;

export interface BoardRenderState {
  fen: string;
  selected?: string;
  highlights: readonly string[];
  lastMoveFrom?: string;
  lastMoveTo?: string;
  checkSquare?: string;
  hintFrom?: string;
  hintTo?: string;
  orientation: 'w' | 'b';
  interactive: boolean;
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
