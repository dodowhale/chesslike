import Phaser from 'phaser';

const PIECE_KEYS = [
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
  'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of PIECE_KEYS) {
      this.load.image(key, `/assets/pieces/${key}.png`);
    }
  }

  create(): void {
    this.scene.start('Board');
  }
}
