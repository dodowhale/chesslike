import Phaser from 'phaser';
import { eventBus } from '../bridge/eventBus';

const TILE = 56;
const BOARD_SIZE = TILE * 8;
const MARGIN = 16;

const LIGHT = 0xf0d9b5;
const DARK = 0xb58863;

const PIECE_KEY: Record<string, string> = {
  K: 'wK', Q: 'wQ', R: 'wR', B: 'wB', N: 'wN', P: 'wP',
  k: 'bK', q: 'bQ', r: 'bR', b: 'bB', n: 'bN', p: 'bP',
};

export class BoardScene extends Phaser.Scene {
  private pieceLayer!: Phaser.GameObjects.Container;
  private currentFen = '';
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('Board');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    const boardX = MARGIN;
    const boardY = MARGIN;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const x = boardX + f * TILE;
        const y = boardY + r * TILE;
        const color = (r + f) % 2 === 0 ? LIGHT : DARK;
        this.add.rectangle(x + TILE / 2, y + TILE / 2, TILE, TILE, color);
      }
    }

    this.pieceLayer = this.add.container(boardX, boardY);

    this.unsubscribe = eventBus.on('state:fen', ({ fen }) => {
      this.renderFen(fen);
    });

    const teardown = () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
    this.events.once(Phaser.Scenes.Events.DESTROY, teardown);

    eventBus.emit('board:ready');
  }

  renderFen(fen: string): void {
    if (fen === this.currentFen) return;
    this.currentFen = fen;
    this.pieceLayer.removeAll(true);

    const [position] = fen.split(' ');
    if (!position) return;

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
          const x = file * TILE + TILE / 2;
          const y = r * TILE + TILE / 2;
          const sprite = this.add.image(x, y, key);
          sprite.setDisplaySize(TILE - 4, TILE - 4);
          this.pieceLayer.add(sprite);
        }
        file += 1;
      }
    }
  }

  static getBoardPixelSize(): number {
    return BOARD_SIZE + MARGIN * 2;
  }
}
