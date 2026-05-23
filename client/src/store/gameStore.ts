import { createStore } from 'solid-js/store';
import type { Mode } from '@shared/mode';
import type { ClassicConfig } from '@shared/classic';
import type { AdventureRunState } from '@shared/adventure';
import { INITIAL_FEN, type GameState } from '@shared/game';
import { createChessManager, type MoveDescriptor } from '@/lib/chess/ChessManager';
import { eventBus } from '@/lib/phaser/bridge/eventBus';

const initial: GameState = {
  board: INITIAL_FEN,
  turn: 'w',
};

const [state, setState] = createStore<GameState>(initial);
const chess = createChessManager();

export const gameStore = state;

export function setMode(mode: Mode | undefined): void {
  setState('mode', mode);
}

export function setClassicConfig(config: ClassicConfig | undefined): void {
  setState('classic', config);
}

export function setAdventureRun(run: AdventureRunState | undefined): void {
  setState('adventure', run);
}

export function resetBoard(): void {
  chess.reset();
  setState({ board: chess.getFen(), turn: chess.turn() });
}

export function applyMove(uci: string): MoveDescriptor | null {
  const result = chess.tryMove(uci);
  if (!result.ok) return null;
  setState({ board: result.move.fen, turn: chess.turn() });
  return result.move;
}

eventBus.on('cmd:reset', () => {
  resetBoard();
});

eventBus.on('cmd:applyMove', ({ uci }) => {
  applyMove(uci);
});
