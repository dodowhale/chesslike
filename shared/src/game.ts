import type { Mode } from './mode';
import type { ClassicConfig } from './classic';
import type { AdventureRunState } from './adventure';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface GameState {
  mode?: Mode;
  classic?: ClassicConfig;
  adventure?: AdventureRunState;
  board: string;
  turn: 'w' | 'b';
}
