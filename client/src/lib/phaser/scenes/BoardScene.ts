import Phaser from 'phaser';
import { eventBus, type BoardRenderState } from '../bridge/eventBus';

const TILE = 56;
const BOARD_SIZE = TILE * 8;
const MARGIN_X = 24;
const MARGIN_Y = 24;

const LIGHT = 0xf0d9b5;
const DARK = 0xb58863;
const HIGHLIGHT = 0x6dd47e;
const SELECTED = 0xffd23f;
const LAST_MOVE = 0xf4a261;
const CHECK = 0xff5050;
const HINT = 0x4dabf7;

const PIECE_KEY: Record<string, string> = {
  K: 'wK', Q: 'wQ', R: 'wR', B: 'wB', N: 'wN', P: 'wP',
  k: 'bK', q: 'bQ', r: 'bR', b: 'bB', n: 'bN', p: 'bP',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function squareToFileRank(square: string): { file: number; rank: number } | null {
  if (square.length !== 2) return null;
  const fileIdx = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]);
  if (fileIdx < 0 || rank < 1 || rank > 8) return null;
  return { file: fileIdx, rank };
}

function fileRankToSquare(file: number, rank: number): string {
  return `${FILES[file]}${rank}`;
}

export class BoardScene extends Phaser.Scene {
  private tileLayer!: Phaser.GameObjects.Container;
  private overlayLayer!: Phaser.GameObjects.Container;
  private pieceLayer!: Phaser.GameObjects.Container;
  private coordLayer!: Phaser.GameObjects.Container;
  private orientation: 'w' | 'b' = 'w';
  private currentState: BoardRenderState | null = null;
  private offReady: (() => void) | null = null;
  private offState: (() => void) | null = null;

  constructor() {
    super('Board');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    this.tileLayer = this.add.container(MARGIN_X, MARGIN_Y);
    this.overlayLayer = this.add.container(MARGIN_X, MARGIN_Y);
    this.pieceLayer = this.add.container(MARGIN_X, MARGIN_Y);
    this.coordLayer = this.add.container(0, 0);

    this.drawTilesAndCoords();

    this.offState = eventBus.on('state:board', (payload) => {
      this.currentState = payload;
      if (payload.orientation !== this.orientation) {
        this.applyOrientation(payload.orientation, payload.instant === true);
      } else {
        this.render();
      }
    });

    const teardown = () => {
      this.offReady?.();
      this.offReady = null;
      this.offState?.();
      this.offState = null;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);

    eventBus.emit('board:ready');
  }

  private squareToPixel(square: string): { x: number; y: number } | null {
    const fr = squareToFileRank(square);
    if (!fr) return null;
    const fileDisplay = this.orientation === 'w' ? fr.file : 7 - fr.file;
    const rankDisplay = this.orientation === 'w' ? 8 - fr.rank : fr.rank - 1;
    return {
      x: fileDisplay * TILE + TILE / 2,
      y: rankDisplay * TILE + TILE / 2,
    };
  }

  private pixelToSquare(localX: number, localY: number): string | null {
    if (localX < 0 || localY < 0 || localX >= BOARD_SIZE || localY >= BOARD_SIZE) return null;
    const fileDisplay = Math.floor(localX / TILE);
    const rankDisplay = Math.floor(localY / TILE);
    const file = this.orientation === 'w' ? fileDisplay : 7 - fileDisplay;
    const rank = this.orientation === 'w' ? 8 - rankDisplay : rankDisplay + 1;
    return fileRankToSquare(file, rank);
  }

  private drawTilesAndCoords(): void {
    this.tileLayer.removeAll(true);
    this.coordLayer.removeAll(true);
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const color = (r + f) % 2 === 0 ? LIGHT : DARK;
        const tile = this.add.rectangle(
          f * TILE + TILE / 2,
          r * TILE + TILE / 2,
          TILE,
          TILE,
          color,
        );
        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerup', () => {
          const square = this.pixelToSquare(f * TILE + 1, r * TILE + 1);
          if (square) eventBus.emit('board:squareClicked', { square });
        });
        this.tileLayer.add(tile);
      }
    }

    const fileLabels = this.orientation === 'w' ? FILES : [...FILES].reverse();
    const rankLabels = this.orientation === 'w'
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8];

    for (let i = 0; i < 8; i++) {
      const file = this.add.text(
        MARGIN_X + i * TILE + TILE / 2,
        MARGIN_Y + BOARD_SIZE + 4,
        String(fileLabels[i]),
        { fontSize: '12px', color: '#94a3b8' },
      );
      file.setOrigin(0.5, 0);
      this.coordLayer.add(file);

      const rank = this.add.text(
        MARGIN_X - 14,
        MARGIN_Y + i * TILE + TILE / 2,
        String(rankLabels[i]),
        { fontSize: '12px', color: '#94a3b8' },
      );
      rank.setOrigin(0.5, 0.5);
      this.coordLayer.add(rank);
    }
  }

  private render(): void {
    if (!this.currentState) return;
    this.overlayLayer.removeAll(true);
    this.pieceLayer.removeAll(true);

    const {
      fen,
      selected,
      highlights,
      lastMove,
      checkSquare,
      hintFrom,
      hintTo,
      pieceHps,
    } = this.currentState;

    if (lastMove) {
      this.drawTile(lastMove.from, LAST_MOVE, 0.35);
      this.drawTile(lastMove.to, LAST_MOVE, 0.35);
    }
    if (selected) this.drawTile(selected, SELECTED, 0.5);
    for (const sq of highlights) this.drawHighlight(sq);
    if (checkSquare) this.drawTile(checkSquare, CHECK, 0.4);
    if (hintFrom && hintTo) this.drawHintArrow(hintFrom, hintTo);

    const [position] = fen.split(' ');
    if (!position) return;
    const hpMap = new Map<string, { hp: number; maxHp: number }>();
    if (pieceHps) {
      for (const p of pieceHps) hpMap.set(p.square, { hp: p.hp, maxHp: p.maxHp });
    }
    const ranks = position.split('/');
    for (let r = 0; r < 8; r++) {
      const rankStr = ranks[r];
      if (!rankStr) continue;
      let file = 0;
      for (const ch of rankStr) {
        if (/\d/.test(ch)) {
          file += Number(ch);
          continue;
        }
        const key = PIECE_KEY[ch];
        if (key && file < 8) {
          const square = fileRankToSquare(file, 8 - r);
          const px = this.squareToPixel(square);
          if (px) {
            const sprite = this.add.image(px.x, px.y, key);
            sprite.setDisplaySize(TILE - 4, TILE - 4);
            this.pieceLayer.add(sprite);
            const hp = hpMap.get(square);
            if (hp) this.drawHpBar(px.x, px.y, hp.hp, hp.maxHp);
          }
        }
        file += 1;
      }
    }
  }

  private drawHpBar(cx: number, cy: number, hp: number, maxHp: number): void {
    const w = TILE - 12;
    const h = 4;
    const y = cy + TILE / 2 - 6;
    const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
    const bg = this.add.rectangle(cx, y, w, h, 0x1f2937, 0.85);
    this.pieceLayer.add(bg);
    const color = pct > 0.5 ? 0x22c55e : pct > 0.2 ? 0xeab308 : 0xef4444;
    const fg = this.add.rectangle(cx - w / 2, y, w * pct, h, color, 0.95);
    fg.setOrigin(0, 0.5);
    this.pieceLayer.add(fg);
  }

  private applyOrientation(orientation: 'w' | 'b', instant: boolean): void {
    if (instant) {
      this.orientation = orientation;
      this.drawTilesAndCoords();
      this.render();
      return;
    }
    // 200ms 페이드 아웃 → swap → 페이드 인. 보드/기물/오버레이가 함께 페이드된다.
    const targets = [this.tileLayer, this.overlayLayer, this.pieceLayer, this.coordLayer];
    this.tweens.add({
      targets,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.orientation = orientation;
        this.drawTilesAndCoords();
        this.render();
        this.tweens.add({ targets, alpha: 1, duration: 100 });
      },
    });
  }

  private drawTile(square: string, color: number, alpha: number): void {
    const px = this.squareToPixel(square);
    if (!px) return;
    const rect = this.add.rectangle(px.x, px.y, TILE, TILE, color, alpha);
    this.overlayLayer.add(rect);
  }

  private drawHighlight(square: string): void {
    const px = this.squareToPixel(square);
    if (!px) return;
    const dot = this.add.circle(px.x, px.y, 8, HIGHLIGHT, 0.7);
    this.overlayLayer.add(dot);
  }

  private drawHintArrow(from: string, to: string): void {
    const a = this.squareToPixel(from);
    const b = this.squareToPixel(to);
    if (!a || !b) return;
    const fromRing = this.add.circle(a.x, a.y, TILE / 2 - 6, HINT, 0).setStrokeStyle(3, HINT, 0.8);
    this.overlayLayer.add(fromRing);
    const toRing = this.add.circle(b.x, b.y, TILE / 2 - 4, HINT, 0.2).setStrokeStyle(3, HINT, 0.9);
    this.overlayLayer.add(toRing);
    const line = this.add.line(0, 0, a.x, a.y, b.x, b.y, HINT, 0.9).setOrigin(0, 0).setLineWidth(3);
    this.overlayLayer.add(line);
  }

  static getBoardPixelSize(): { width: number; height: number } {
    return {
      width: BOARD_SIZE + MARGIN_X + 16,
      height: BOARD_SIZE + MARGIN_Y + 20,
    };
  }
}
