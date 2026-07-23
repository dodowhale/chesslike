/**
 * Stockfish UCI 엔진 래퍼.
 * - 한 번에 하나의 go만 처리. 진행 중 새 go가 들어오면 이전 promise는 'superseded'로 reject.
 * - 토큰 기반: 각 go는 고유 token을 가지며 bestmove 수신 시 token이 일치할 때만 resolve.
 * - worker.onerror는 currentGo를 reject하고 ready=false로 표시.
 */

export interface InfoLine {
  depth?: number;
  multipv?: number;
  scoreCp?: number;
  scoreMate?: number;
  nodes?: number;
  nps?: number;
  pv?: string[];
  rawLine: string;
}

export interface GoOptions {
  movetime?: number;
  depth?: number;
  multipv?: number;
  onInfo?: (info: InfoLine) => void;
}

export interface GoResult {
  bestmove: string;
  ponder?: string;
  infos: InfoLine[];
  superseded?: boolean;
}

export interface UciOptions {
  uciElo?: number;
  skillLevel?: number;
  contempt?: number;
  limitStrength?: boolean;
  threads?: number;
  hash?: number;
}

const baseUrl = import.meta.env?.BASE_URL || '/';
const STOCKFISH_URL = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}stockfish/stockfish-18-lite-single.js`;

interface CurrentGo {
  token: number;
  resolve: (result: GoResult) => void;
  reject: (err: Error) => void;
  onInfo?: (info: InfoLine) => void;
  infos: InfoLine[];
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private currentGo: CurrentGo | null = null;
  private nextToken = 0;
  private currentMultiPV = 1;
  private pendingMultiPV = 1;

  async init(): Promise<void> {
    if (this.worker) return;
    this.worker = new Worker(STOCKFISH_URL);
    this.worker.onmessage = (e) => this.handleMessage(e.data);
    this.worker.onerror = (e) => {
      console.error('[Stockfish] worker error', e);
      this.ready = false;
      if (this.currentGo) {
        const cg = this.currentGo;
        this.currentGo = null;
        cg.reject(new Error('worker-error'));
      }
    };
    this.send('uci');
    await this.waitFor('uciok');
    this.send('isready');
    await this.waitFor('readyok');
    this.ready = true;
  }

  setOptions(opts: UciOptions): void {
    if (opts.uciElo !== undefined) this.send(`setoption name UCI_Elo value ${opts.uciElo}`);
    if (opts.skillLevel !== undefined) {
      this.send(`setoption name Skill Level value ${opts.skillLevel}`);
    }
    if (opts.contempt !== undefined) {
      this.send(`setoption name Contempt value ${opts.contempt}`);
    }
    if (opts.limitStrength !== undefined) {
      this.send(`setoption name UCI_LimitStrength value ${opts.limitStrength}`);
    }
    if (opts.threads !== undefined) this.send(`setoption name Threads value ${opts.threads}`);
    if (opts.hash !== undefined) this.send(`setoption name Hash value ${opts.hash}`);
  }

  /** MultiPV는 다음 go() 호출 시 자동으로 적용된다. */
  setMultiPV(value: number): void {
    this.pendingMultiPV = value;
  }

  newGame(): void {
    this.send('ucinewgame');
  }

  position(fen: string, moves: string[] = []): void {
    if (fen === 'startpos') {
      const m = moves.length ? ` moves ${moves.join(' ')}` : '';
      this.send(`position startpos${m}`);
    } else {
      const m = moves.length ? ` moves ${moves.join(' ')}` : '';
      this.send(`position fen ${fen}${m}`);
    }
  }

  go(opts: GoOptions = {}): Promise<GoResult> {
    if (opts.multipv !== undefined) this.pendingMultiPV = opts.multipv;

    // 이전 go가 있으면 superseded로 거절
    if (this.currentGo) {
      const prev = this.currentGo;
      this.currentGo = null;
      this.send('stop');
      prev.resolve({
        bestmove: '(none)',
        infos: prev.infos,
        superseded: true,
      });
    }

    if (this.pendingMultiPV !== this.currentMultiPV) {
      this.send(`setoption name MultiPV value ${this.pendingMultiPV}`);
      this.currentMultiPV = this.pendingMultiPV;
    }

    const parts: string[] = ['go'];
    if (opts.movetime !== undefined) parts.push(`movetime ${opts.movetime}`);
    if (opts.depth !== undefined) parts.push(`depth ${opts.depth}`);

    return new Promise<GoResult>((resolve, reject) => {
      this.currentGo = {
        token: ++this.nextToken,
        resolve,
        reject,
        onInfo: opts.onInfo,
        infos: [],
      };
      this.send(parts.join(' '));
    });
  }

  stop(): void {
    this.send('stop');
  }

  destroy(): void {
    if (!this.worker) return;
    try {
      this.send('quit');
    } catch {
      /* ignore */
    }
    this.worker.terminate();
    this.worker = null;
    this.ready = false;
    if (this.currentGo) {
      const cg = this.currentGo;
      this.currentGo = null;
      cg.reject(new Error('engine destroyed'));
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private waitFor(token: string): Promise<void> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        const data = typeof e.data === 'string' ? e.data : String(e.data);
        if (data.includes(token)) {
          this.worker?.removeEventListener('message', handler);
          resolve();
        }
      };
      this.worker?.addEventListener('message', handler);
    });
  }

  private handleMessage(raw: unknown): void {
    const line = typeof raw === 'string' ? raw : String(raw);
    if (line.startsWith('info ')) {
      if (!this.currentGo) return;
      const info = parseInfo(line);
      this.currentGo.infos.push(info);
      this.currentGo.onInfo?.(info);
      return;
    }
    if (line.startsWith('bestmove ')) {
      const cg = this.currentGo;
      this.currentGo = null;
      if (!cg) return;
      const parts = line.split(/\s+/);
      const bestmove = parts[1] ?? '(none)';
      const ponderIdx = parts.indexOf('ponder');
      const ponder = ponderIdx >= 0 ? parts[ponderIdx + 1] : undefined;
      cg.resolve({ bestmove, ponder, infos: cg.infos });
    }
  }
}

export function parseInfo(line: string): InfoLine {
  const tokens = line.split(/\s+/);
  const info: InfoLine = { rawLine: line };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t) {
      case 'depth':
        info.depth = Number(tokens[++i]);
        break;
      case 'multipv':
        info.multipv = Number(tokens[++i]);
        break;
      case 'nodes':
        info.nodes = Number(tokens[++i]);
        break;
      case 'nps':
        info.nps = Number(tokens[++i]);
        break;
      case 'score':
        if (tokens[i + 1] === 'cp') {
          info.scoreCp = Number(tokens[i + 2]);
          i += 2;
        } else if (tokens[i + 1] === 'mate') {
          info.scoreMate = Number(tokens[i + 2]);
          i += 2;
        }
        break;
      case 'pv':
        info.pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
    }
  }
  return info;
}

let singleton: StockfishEngine | null = null;

export function getEngine(): StockfishEngine {
  if (!singleton) singleton = new StockfishEngine();
  return singleton;
}
