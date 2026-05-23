import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BoardScene } from './scenes/BoardScene';

export interface CreateGameOptions {
  parent: HTMLDivElement;
}

export function createGame({ parent }: CreateGameOptions): Phaser.Game {
  const size = BoardScene.getBoardPixelSize();
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: size,
    height: size,
    backgroundColor: '#1a1a1a',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, BoardScene],
  });
}
