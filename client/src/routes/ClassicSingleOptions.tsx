import { createSignal, For, Show, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { SingleModeConfig, ClassicTimeControl } from '@shared/classic';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { DIFFICULTY_PRESETS, type DifficultyKey } from '@/lib/chess/SingleDifficulty';
import { setClassicConfig, setMode } from '@/store/gameStore';

import { settings } from '@/store/settingsStore';

const TIME_PRESETS_KEYS: Exclude<ClassicTimeControl['preset'], undefined>[] = [
  'bullet',
  'blitz',
  'rapid',
  'classical',
];

type ColorChoice = SingleModeConfig['playerColor'];

const COLOR_CHOICES_KEYS: ColorChoice[] = ['w', 'b', 'random'];

export default function ClassicSingleOptions() {
  const navigate = useNavigate();
  const dict = () => t();

  const [difficulty, setDifficulty] = createSignal<DifficultyKey>('intermediate');
  const [elo, setElo] = createSignal(1600);
  const [thinkMs, setThinkMs] = createSignal(1200);
  const [contempt, setContempt] = createSignal(0);
  const [hintsEnabled, setHintsEnabled] = createSignal(true);
  const [undoLimit, setUndoLimit] = createSignal(3);
  const [color, setColor] = createSignal<ColorChoice>('w');
  const [timeKind, setTimeKind] = createSignal<ClassicTimeControl['kind']>('preset');
  const [timePreset, setTimePreset] = createSignal<ClassicTimeControl['preset']>('rapid');
  const [customInitialSec, setCustomInitialSec] = createSignal(600);
  const [customIncrementSec, setCustomIncrementSec] = createSignal(5);

  onMount(() => setMode('classic'));

  function start() {
    const isCustom = difficulty() === 'custom';
    const timeControl: ClassicTimeControl =
      timeKind() === 'unlimited'
        ? { kind: 'unlimited' }
        : timeKind() === 'custom'
        ? {
            kind: 'custom',
            initialSec: customInitialSec(),
            incrementSec: customIncrementSec(),
          }
        : { kind: 'preset', preset: timePreset() };

    const single: SingleModeConfig = {
      difficulty: difficulty(),
      hintsEnabled: hintsEnabled(),
      undoLimit: undoLimit(),
      playerColor: color(),
      timeControl,
      ...(isCustom
        ? {
            elo: elo(),
            thinkMs: thinkMs(),
            contempt: contempt(),
          }
        : {}),
    };

    setClassicConfig({ submode: 'single', single });
    navigate('/classic/single/play');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/classic')}>
          ← {dict().classic.back}
        </Button>
        <span class="font-semibold">{dict().classic.title} · {dict().classic.single}</span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <section>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().classicOptions.difficultyHeading}
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <For each={DIFFICULTY_PRESETS}>
              {(p) => (
                <button
                  type="button"
                  onClick={() => setDifficulty(p.key)}
                  class={`p-3 rounded-lg border text-left transition-colors ${
                    difficulty() === p.key
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}
                >
                  <div class="font-semibold text-slate-100">{dict().difficulty[p.key]}</div>
                  <div class="text-xs text-slate-400 mt-1">{dict().difficulty[`${p.key}Desc` as const]}</div>
                </button>
              )}
            </For>
            <button
              type="button"
              onClick={() => setDifficulty('custom')}
              class={`p-3 rounded-lg border text-left transition-colors ${
                difficulty() === 'custom'
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
            >
              <div class="font-semibold text-slate-100">{dict().difficulty.custom}</div>
              <div class="text-xs text-slate-400 mt-1">{dict().difficulty.customDesc}</div>
            </button>
          </div>
        </section>

        <Show when={difficulty() === 'custom'}>
          <section class="flex flex-col gap-3 border border-slate-700 rounded-lg p-4 bg-slate-900/50">
            <label class="flex flex-col gap-1">
              <span class="text-sm text-slate-300">ELO ({elo()})</span>
              <input
                type="range"
                min="600"
                max="3000"
                step="50"
                value={elo()}
                onInput={(e) => setElo(Number(e.currentTarget.value))}
                class="accent-amber-500"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-sm text-slate-300">
                {settings.locale === 'ko' ? '사고 시간' : 'Think Time'} ({thinkMs()}ms)
              </span>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={thinkMs()}
                onInput={(e) => setThinkMs(Number(e.currentTarget.value))}
                class="accent-amber-500"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-sm text-slate-300">Contempt ({contempt()})</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={contempt()}
                onInput={(e) => setContempt(Number(e.currentTarget.value))}
                class="accent-amber-500"
              />
            </label>
          </section>
        </Show>

        <section>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().classicOptions.timeControl}
          </h2>
          <div class="flex gap-2 flex-wrap mb-2">
            <For each={TIME_PRESETS_KEYS}>
              {(key) => (
                <button
                  type="button"
                  onClick={() => {
                    setTimeKind('preset');
                    setTimePreset(key);
                  }}
                  class={`px-3 py-1.5 rounded-md text-sm border ${
                    timeKind() === 'preset' && timePreset() === key
                      ? 'border-amber-400 bg-amber-500/10 text-slate-100'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {dict().classicOptions.presets[key]}
                </button>
              )}
            </For>
            <button
              type="button"
              onClick={() => setTimeKind('unlimited')}
              class={`px-3 py-1.5 rounded-md text-sm border ${
                timeKind() === 'unlimited'
                  ? 'border-amber-400 bg-amber-500/10 text-slate-100'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {dict().classicOptions.unlimited}
            </button>
            <button
              type="button"
              onClick={() => setTimeKind('custom')}
              class={`px-3 py-1.5 rounded-md text-sm border ${
                timeKind() === 'custom'
                  ? 'border-amber-400 bg-amber-500/10 text-slate-100'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {dict().classicOptions.custom}
            </button>
          </div>
          <Show when={timeKind() === 'custom'}>
            <div class="flex flex-col gap-2 border border-slate-700 rounded-lg p-3 bg-slate-900/50">
              <label class="flex flex-col gap-1">
                <span class="text-sm text-slate-300">
                  {dict().classicOptions.initialSec} ({customInitialSec()}{dict().classicOptions.seconds})
                </span>
                <input
                  type="range"
                  min="30"
                  max="3600"
                  step="30"
                  value={customInitialSec()}
                  onInput={(e) => setCustomInitialSec(Number(e.currentTarget.value))}
                  class="accent-amber-500"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm text-slate-300">
                  {dict().classicOptions.incrementSec} ({customIncrementSec()}{dict().classicOptions.seconds})
                </span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={customIncrementSec()}
                  onInput={(e) => setCustomIncrementSec(Number(e.currentTarget.value))}
                  class="accent-amber-500"
                />
              </label>
            </div>
          </Show>
        </section>

        <section>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().classicOptions.colorHeading}
          </h2>
          <div class="flex gap-2">
            <For each={COLOR_CHOICES_KEYS}>
              {(key) => {
                const colorLabel = () => {
                  if (key === 'w') return dict().classicOptions.colorWhite;
                  if (key === 'b') return dict().classicOptions.colorBlack;
                  return dict().classicOptions.colorRandom;
                };
                return (
                  <button
                    type="button"
                    onClick={() => setColor(key)}
                    class={`px-4 py-2 rounded-md text-sm border ${
                      color() === key
                        ? 'border-amber-400 bg-amber-500/10 text-slate-100'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {colorLabel()}
                  </button>
                );
              }}
            </For>
          </div>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {dict().classicOptions.auxHeading}
          </h2>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hintsEnabled()}
              onChange={(e) => setHintsEnabled(e.currentTarget.checked)}
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">{dict().classicOptions.enableHints}</span>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-slate-300">
              {dict().classicOptions.undoCount} ({undoLimit() === -1 ? dict().classicOptions.undoUnlimited : undoLimit() === 0 ? dict().classicOptions.undoDisabled : (settings.locale === 'ko' ? `${undoLimit()}회` : `${undoLimit()} times`)})
            </span>
            <input
              type="range"
              min="-1"
              max="10"
              step="1"
              value={undoLimit()}
              onInput={(e) => setUndoLimit(Number(e.currentTarget.value))}
              class="accent-amber-500"
            />
          </label>
        </section>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => navigate('/classic')}>
            {dict().classicOptions.cancel}
          </Button>
          <Button onClick={start}>{dict().classicOptions.startGame}</Button>
        </div>
      </main>
    </div>
  );
}
