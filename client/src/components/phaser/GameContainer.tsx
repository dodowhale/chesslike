import { createEffect, on, onCleanup, onMount } from 'solid-js';
import type Phaser from 'phaser';
import { createGame } from '@/lib/phaser/createGame';
import { eventBus } from '@/lib/phaser/bridge/eventBus';
import { gameStore } from '@/store/gameStore';

export function GameContainer() {
  let containerRef: HTMLDivElement | undefined;
  let game: Phaser.Game | null = null;

  createEffect(
    on(
      () => gameStore.board,
      (fen) => {
        eventBus.emit('state:fen', { fen });
      },
      { defer: true },
    ),
  );

  onMount(() => {
    if (!containerRef) return;
    game = createGame({ parent: containerRef });

    const offReady = eventBus.on('board:ready', () => {
      eventBus.emit('state:fen', { fen: gameStore.board });
    });

    onCleanup(() => {
      offReady();
      if (game) {
        game.destroy(true);
        game = null;
      }
    });
  });

  return (
    <div
      ref={containerRef}
      class="aspect-square w-full max-w-[520px] bg-slate-900 rounded-lg overflow-hidden shadow-lg"
    />
  );
}
