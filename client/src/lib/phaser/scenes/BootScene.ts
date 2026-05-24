import Phaser from 'phaser';

const CHARACTER_IDS = ['standard', 'assassins', 'saints'] as const;
const PIECE_KEYS = [
  'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
  'bK', 'bQ', 'bR', 'bB', 'bN', 'bP',
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const charId of CHARACTER_IDS) {
      for (const pieceKey of PIECE_KEYS) {
        this.load.image(`${charId}-${pieceKey}`, `/assets/pieces/${charId}/${pieceKey}.png`);
      }
    }
  }

  create(): void {
    this.scene.start('Board');
  }
}
