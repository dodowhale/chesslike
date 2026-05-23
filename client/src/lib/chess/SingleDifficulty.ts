import type { SingleModeConfig } from '@shared/classic';
import type { UciOptions } from './StockfishEngine';

export type DifficultyKey = SingleModeConfig['difficulty'];

export interface DifficultyPreset {
  key: Exclude<DifficultyKey, 'custom'>;
  label: string;
  description: string;
  uciElo: number;
  skillLevel: number;
  thinkMs: number;
}

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    key: 'novice',
    label: '초보',
    description: '체스를 막 배운 상대 (ELO 1000)',
    uciElo: 1000,
    skillLevel: 0,
    thinkMs: 500,
  },
  {
    key: 'amateur',
    label: '아마추어',
    description: '동네 클럽 수준 (ELO 1300)',
    uciElo: 1300,
    skillLevel: 5,
    thinkMs: 800,
  },
  {
    key: 'intermediate',
    label: '중급',
    description: '꽤 잘 두는 상대 (ELO 1600)',
    uciElo: 1600,
    skillLevel: 10,
    thinkMs: 1200,
  },
  {
    key: 'advanced',
    label: '상급',
    description: '강자 (ELO 2000)',
    uciElo: 2000,
    skillLevel: 15,
    thinkMs: 1800,
  },
  {
    key: 'master',
    label: '마스터',
    description: '최강 (ELO 2500)',
    uciElo: 2500,
    skillLevel: 20,
    thinkMs: 2500,
  },
];

export function presetByKey(key: Exclude<DifficultyKey, 'custom'>): DifficultyPreset {
  const found = DIFFICULTY_PRESETS.find((p) => p.key === key);
  if (!found) throw new Error(`unknown preset: ${key}`);
  return found;
}

export interface ResolvedDifficulty {
  uciOptions: UciOptions;
  thinkMs: number;
}

export function resolveDifficulty(cfg: SingleModeConfig): ResolvedDifficulty {
  if (cfg.difficulty === 'custom') {
    return {
      uciOptions: {
        uciElo: cfg.elo,
        contempt: cfg.contempt,
        limitStrength: cfg.elo !== undefined,
      },
      thinkMs: cfg.thinkMs ?? 1000,
    };
  }
  const p = presetByKey(cfg.difficulty);
  return {
    uciOptions: {
      uciElo: p.uciElo,
      skillLevel: p.skillLevel,
      limitStrength: true,
    },
    thinkMs: p.thinkMs,
  };
}
