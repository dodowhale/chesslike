import { For, Show, createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { ClassicTimeControl, LocalMultiConfig } from '@shared/classic';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { setClassicConfig, setMode } from '@/store/gameStore';

const TIME_PRESETS_KEYS: Exclude<ClassicTimeControl['preset'], undefined>[] = [
  'bullet',
  'blitz',
  'rapid',
  'classical',
];

export default function ClassicLocalOptions() {
  const navigate = useNavigate();
  const dict = () => t();

  const [timeKind, setTimeKind] = createSignal<ClassicTimeControl['kind']>('preset');
  // 로컬멀티 기본은 SPEC LOCAL_MULTI.md §2의 권장값 Blitz 3+2.
  const [timePreset, setTimePreset] = createSignal<ClassicTimeControl['preset']>('blitz');
  const [customInitialSec, setCustomInitialSec] = createSignal(600);
  const [customIncrementSec, setCustomIncrementSec] = createSignal(5);
  const [autoRotate, setAutoRotate] = createSignal(true);
  const [allowUndo, setAllowUndo] = createSignal(true);
  const [allowDrawOffer, setAllowDrawOffer] = createSignal(true);

  onMount(() => setMode('classic'));

  function start() {
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

    const local: LocalMultiConfig = {
      timeControl,
      autoRotateBoard: autoRotate(),
      allowUndo: allowUndo(),
      allowDrawOffer: allowDrawOffer(),
    };
    setClassicConfig({ submode: 'local', local });
    navigate('/classic/local/play');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/classic')}>
          ← {dict().classic.back}
        </Button>
        <span class="font-semibold">
          {dict().classic.title} · {dict().classic.local}
        </span>
      </header>
      <main class="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
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

        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {dict().classicOptions.hotseatHeading}
          </h2>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRotate()}
              onChange={(e) => setAutoRotate(e.currentTarget.checked)}
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">{dict().classicOptions.rotateBoard}</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowUndo()}
              onChange={(e) => setAllowUndo(e.currentTarget.checked)}
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">{dict().classicOptions.allowUndo}</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDrawOffer()}
              onChange={(e) => setAllowDrawOffer(e.currentTarget.checked)}
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">{dict().classicOptions.allowDrawOffer}</span>
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
