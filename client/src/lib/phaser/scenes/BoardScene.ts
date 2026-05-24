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

interface PieceSprite {
  container: Phaser.GameObjects.Container;
  pieceChar: string;
  image: Phaser.GameObjects.Image;
  hpBg?: Phaser.GameObjects.Rectangle;
  hpFg?: Phaser.GameObjects.Rectangle;
}

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
  private sprites = new Map<string, PieceSprite>();
  private activeTween: Phaser.Tweens.Tween | null = null;

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
      this.tweens.killAll();
      for (const square of Array.from(this.sprites.keys())) {
        this.destroyPieceSprite(square);
      }
      this.activeTween = null;
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

    const desired = this.parseFenPosition(fen);
    const hpMap = new Map<string, { hp: number; maxHp: number }>();
    if (pieceHps) {
      for (const p of pieceHps) hpMap.set(p.square, { hp: p.hp, maxHp: p.maxHp });
    }
    // Task 2: instant only. Task 3에서 lastMove + !noPieceAnim 분기로 applyAnimated 추가.
    this.applyInstant(desired, hpMap);
  }

  private createPieceSprite(
    square: string,
    pieceChar: string,
    hpInfo?: { hp: number; maxHp: number },
  ): PieceSprite {
    const px = this.squareToPixel(square);
    const x = px?.x ?? 0;
    const y = px?.y ?? 0;
    const container = this.add.container(x, y);
    const textureKey = PIECE_KEY[pieceChar] ?? '';
    const image = this.add.image(0, 0, textureKey);
    image.setDisplaySize(TILE - 4, TILE - 4);
    container.add(image);
    this.pieceLayer.add(container);

    const sprite: PieceSprite = { container, pieceChar, image };
    if (hpInfo) {
      this.attachHpBar(sprite, hpInfo.hp, hpInfo.maxHp);
    }
    return sprite;
  }

  private attachHpBar(sprite: PieceSprite, hp: number, maxHp: number): void {
    const w = TILE - 12;
    const h = 4;
    const yOff = TILE / 2 - 6;
    const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
    const color = pct > 0.5 ? 0x22c55e : pct > 0.2 ? 0xeab308 : 0xef4444;
    if (!sprite.hpBg) {
      sprite.hpBg = this.add.rectangle(0, yOff, w, h, 0x1f2937, 0.85);
      sprite.container.add(sprite.hpBg);
    }
    if (!sprite.hpFg) {
      sprite.hpFg = this.add.rectangle(-w / 2, yOff, w * pct, h, color, 0.95);
      sprite.hpFg.setOrigin(0, 0.5);
      sprite.container.add(sprite.hpFg);
    } else {
      sprite.hpFg.width = w * pct;
      sprite.hpFg.fillColor = color;
    }
  }

  private destroyPieceSprite(square: string): void {
    const s = this.sprites.get(square);
    if (!s) return;
    s.container.destroy();
    this.sprites.delete(square);
  }

  private parseFenPosition(fen: string): Map<string, string> {
    const desired = new Map<string, string>();
    const [position] = fen.split(' ');
    if (!position) return desired;
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
        if (file < 8 && PIECE_KEY[ch]) {
          const square = fileRankToSquare(file, 8 - r);
          desired.set(square, ch);
        }
        file += 1;
      }
    }
    return desired;
  }

  private applyInstant(
    desired: Map<string, string>,
    hpMap: Map<string, { hp: number; maxHp: number }>,
  ): void {
    // 1. 제거
    for (const square of Array.from(this.sprites.keys())) {
      if (!desired.has(square)) this.destroyPieceSprite(square);
    }
    // 2. 추가/갱신
    for (const [square, pieceChar] of desired) {
      const existing = this.sprites.get(square);
      if (!existing) {
        const sprite = this.createPieceSprite(square, pieceChar, hpMap.get(square));
        this.sprites.set(square, sprite);
        continue;
      }
      if (existing.pieceChar !== pieceChar) {
        this.destroyPieceSprite(square);
        const sprite = this.createPieceSprite(square, pieceChar, hpMap.get(square));
        this.sprites.set(square, sprite);
        continue;
      }
      const px = this.squareToPixel(square);
      if (px) existing.container.setPosition(px.x, px.y);

      const hp = hpMap.get(square);
      if (hp) {
        this.attachHpBar(existing, hp.hp, hp.maxHp);
      } else if (existing.hpBg || existing.hpFg) {
        existing.hpBg?.destroy();
        existing.hpFg?.destroy();
        existing.hpBg = undefined;
        existing.hpFg = undefined;
      }
    }
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
