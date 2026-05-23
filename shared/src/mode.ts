export type Mode = 'classic' | 'adventure';
export type ClassicSubmode = 'single' | 'local';

export const MODE_VALUES: readonly Mode[] = ['classic', 'adventure'];
export const CLASSIC_SUBMODE_VALUES: readonly ClassicSubmode[] = ['single', 'local'];

export function isMode(value: unknown): value is Mode {
  return value === 'classic' || value === 'adventure';
}

export function isClassicSubmode(value: unknown): value is ClassicSubmode {
  return value === 'single' || value === 'local';
}
