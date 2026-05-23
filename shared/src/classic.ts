import type { ClassicSubmode } from './mode';

export interface ClassicTimeControl {
  kind: 'preset' | 'custom' | 'unlimited';
  preset?: 'bullet' | 'blitz' | 'rapid' | 'classical';
  initialSec?: number;
  incrementSec?: number;
}

export interface SingleModeConfig {
  difficulty: 'novice' | 'amateur' | 'intermediate' | 'advanced' | 'master' | 'custom';
  elo?: number;
  thinkMs?: number;
  contempt?: number;
  hintsEnabled: boolean;
  undoLimit: number;
  timeControl: ClassicTimeControl;
  playerColor: 'w' | 'b' | 'random';
}

export interface LocalMultiConfig {
  timeControl: ClassicTimeControl;
  autoRotateBoard: boolean;
  allowUndo: boolean;
  allowDrawOffer: boolean;
}

export interface ClassicConfig {
  submode: ClassicSubmode;
  single?: SingleModeConfig;
  local?: LocalMultiConfig;
}
