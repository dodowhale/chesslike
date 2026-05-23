import { For, Show, createEffect, createSignal, on, onCleanup } from 'solid-js';
import { gameStore, setInteractive } from '@/store/gameStore';
import { getEngine, type InfoLine } from '@/lib/chess/StockfishEngine';

interface PvLine {
  multipv: number;
  scoreCp?: number;
  scoreMate?: number;
  depth?: number;
  pv: string[];
}

interface AnalysisPanelProps {
  enabled: () => boolean;
  onToggle: (next: boolean) => void;
}

function evalToBarPct(cp: number | undefined, mate: number | undefined): number {
  if (mate !== undefined) return mate > 0 ? 100 : 0;
  if (cp === undefined) return 50;
  const v = Math.tanh(cp / 400);
  return 50 + v * 50;
}

function scoreLabel(line: PvLine): string {
  if (line.scoreMate !== undefined) return `M${line.scoreMate}`;
  if (line.scoreCp !== undefined) {
    const v = (line.scoreCp / 100).toFixed(2);
    return line.scoreCp >= 0 ? `+${v}` : v;
  }
  return '—';
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const [lines, setLines] = createSignal<PvLine[]>([]);
  const [analyzing, setAnalyzing] = createSignal(false);

  function infoToPv(info: InfoLine): PvLine | null {
    if (!info.pv || info.multipv === undefined) return null;
    return {
      multipv: info.multipv,
      scoreCp: info.scoreCp,
      scoreMate: info.scoreMate,
      depth: info.depth,
      pv: info.pv,
    };
  }

  createEffect(
    on(
      () => [props.enabled(), gameStore.board] as const,
      ([enabled]) => {
        const engine = getEngine();
        if (!enabled) {
          if (engine.isReady()) {
            engine.setMultiPV(1);
            engine.stop();
          }
          setLines([]);
          setAnalyzing(false);
          return;
        }
        if (!engine.isReady()) return;
        setAnalyzing(true);
        const moves = gameStore.moves.map((m) => `${m.from}${m.to}${m.promotion ?? ''}`);
        engine.position('startpos', moves);
        const pending: Map<number, PvLine> = new Map();
        void engine
          .go({
            movetime: 1200,
            multipv: 3,
            onInfo: (info) => {
              const pv = infoToPv(info);
              if (pv) pending.set(pv.multipv, pv);
              setLines(
                Array.from(pending.values()).sort((a, b) => a.multipv - b.multipv),
              );
            },
          })
          .then((result) => {
            if (!result.superseded) setAnalyzing(false);
          })
          .catch(() => setAnalyzing(false));
      },
    ),
  );

  // 분석 모드 ON 시 보드 입력 잠금, OFF 시 (게임이 ongoing이면) 복구
  createEffect(
    on(
      () => props.enabled(),
      (enabled) => {
        if (enabled) {
          setInteractive(false);
        } else if (gameStore.ui.status.kind === 'ongoing') {
          setInteractive(true);
        }
      },
    ),
  );

  onCleanup(() => {
    const engine = getEngine();
    if (engine.isReady()) {
      engine.setMultiPV(1);
      engine.stop();
    }
    if (gameStore.ui.status.kind === 'ongoing') setInteractive(true);
  });

  const top = () => lines()[0];
  const barPct = () => {
    const t = top();
    if (!t) return 50;
    // Stockfish는 현재 차례 진영 관점 점수를 반환 → 백 관점으로 정규화
    const sign = gameStore.turn === 'b' ? -1 : 1;
    return evalToBarPct(
      t.scoreCp !== undefined ? t.scoreCp * sign : undefined,
      t.scoreMate !== undefined ? t.scoreMate * sign : undefined,
    );
  };
  const topLabel = () => {
    const t = top();
    if (!t) return '—';
    const sign = gameStore.turn === 'b' ? -1 : 1;
    return scoreLabel({
      ...t,
      scoreCp: t.scoreCp !== undefined ? t.scoreCp * sign : undefined,
      scoreMate: t.scoreMate !== undefined ? t.scoreMate * sign : undefined,
    });
  };

  return (
    <div class="flex flex-col gap-3 w-full max-w-[480px] border border-slate-700 rounded-lg p-3 bg-slate-900/60">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-300">분석</h3>
        <button
          type="button"
          onClick={() => props.onToggle(!props.enabled())}
          class={`px-2 py-1 rounded text-xs ${
            props.enabled()
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {props.enabled() ? '분석 ON' : '분석 OFF'}
        </button>
      </div>
      <Show when={props.enabled()}>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 w-12 tabular-nums">{topLabel()}</span>
          <div class="flex-1 h-3 rounded-full overflow-hidden bg-slate-700 relative">
            <div
              class="absolute top-0 bottom-0 left-0 bg-slate-100 transition-all duration-300"
              style={{ width: `${barPct()}%` }}
            />
          </div>
          <Show when={analyzing()}>
            <span class="text-xs text-amber-400 animate-pulse">…</span>
          </Show>
        </div>
        <div class="flex flex-col gap-1">
          <For each={lines()}>
            {(line) => {
              const sign = gameStore.turn === 'b' ? -1 : 1;
              const display: PvLine = {
                ...line,
                scoreCp: line.scoreCp !== undefined ? line.scoreCp * sign : undefined,
                scoreMate: line.scoreMate !== undefined ? line.scoreMate * sign : undefined,
              };
              return (
                <div class="flex items-baseline gap-2 text-xs">
                  <span class="text-amber-400 font-mono w-12 tabular-nums">
                    {scoreLabel(display)}
                  </span>
                  <span class="text-slate-500">d{line.depth ?? '?'}</span>
                  <span class="text-slate-200 font-mono truncate">
                    {line.pv.slice(0, 8).join(' ')}
                  </span>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
