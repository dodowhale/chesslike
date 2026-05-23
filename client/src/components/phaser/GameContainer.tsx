import { onCleanup, onMount } from 'solid-js';
import type Phaser from 'phaser';
import { createGame } from '@/lib/phaser/createGame';

export function GameContainer() {
  let containerRef: HTMLDivElement | undefined;
  let game: Phaser.Game | null = null;

  onMount(() => {
    if (!containerRef) return;
    game = createGame({ parent: containerRef });
    onCleanup(() => {
      if (game) {
        game.destroy(true);
        game = null;
      }
    });
  });

  return (
    <div
      ref={containerRef}
      class="w-full bg-slate-900 rounded-lg overflow-hidden shadow-lg"
      style={{ 'aspect-ratio': '1 / 1', 'max-width': 'min(480px, calc(100vw - 32px))' }}
    />
  );
}
