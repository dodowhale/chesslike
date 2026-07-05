import { For, Show, createMemo, onCleanup, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { MapNode, NodeType } from '@shared/adventure';
import { Button } from '@/components/ui/Button';
import { activeRun } from '@/store/adventureStore';
import { gameStore } from '@/store/gameStore';

const NODE_ICONS: Record<NodeType, string> = {
  battle: '⚔',
  elite: '☠',
  shop: '💰',
  event: '❓',
  rest: '🏕',
  boss: '👑',
};

const NODE_LABELS: Record<NodeType, string> = {
  battle: '전투',
  elite: '엘리트',
  shop: '상점',
  event: '이벤트',
  rest: '휴식',
  boss: '보스',
};

export default function AdventureMap() {
  const navigate = useNavigate();

  onMount(() => {
    if (!activeRun()) navigate('/adventure', { replace: true });
  });

  /** 행 구조: 1(첫 노드) → 3·3·3·3·3·3(중간 6행) → 1(보스). */
  const rows = createMemo<MapNode[][]>(() => {
    const run = gameStore.adventure;
    if (!run) return [];
    const out: MapNode[][] = [];
    let i = 0;
    const total = run.map.length;
    if (total === 0) return [];
    out.push([run.map[i++]!]);
    while (out.length < 7 && i + 3 <= total) {
      out.push([run.map[i]!, run.map[i + 1]!, run.map[i + 2]!]);
      i += 3;
    }
    if (i < total) {
      out.push([run.map[total - 1]!]);
    }
    return out;
  });

  const availableNextIds = createMemo<Set<string>>(() => {
    const c = activeRun();
    if (!c) return new Set();
    return new Set(c.availableNextNodes());
  });

  const currentNodeId = () => gameStore.adventure?.currentNodeId;

  function enterNode(node: MapNode) {
    const c = activeRun();
    if (!c) return;
    if (!availableNextIds().has(node.id) && node.id !== currentNodeId()) return;
    if (node.id !== currentNodeId()) c.advanceTo(node.id);
    routeToNode(node);
  }

  function routeToNode(node: MapNode) {
    switch (node.type) {
      case 'battle':
      case 'elite':
        navigate('/adventure/run/battle');
        break;
      case 'shop':
        navigate('/adventure/run/shop');
        break;
      case 'event':
        navigate('/adventure/run/event');
        break;
      case 'rest':
        navigate('/adventure/run/rest');
        break;
      case 'boss':
        navigate('/adventure/run/boss');
        break;
    }
  }

  return (
    <div class="min-h-screen flex flex-col relative overflow-hidden">
      <div
        class="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          "background-image": `url('/assets/adventure/backgrounds/act${gameStore.adventure?.act ?? 1}.png')`,
          "background-size": "cover",
          "background-position": "center",
          "image-rendering": "pixelated"
        }}
      />
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 z-10 bg-slate-950/85 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/adventure')}>
            ← 런 포기
          </Button>
          <span class="font-semibold">모험 · {gameStore.adventure?.act ?? 1}막</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-300">
          <span>💰 {gameStore.adventure?.gold ?? 0}</span>
          <span>⭐ {gameStore.adventure?.starShardsThisRun ?? 0}</span>
          <Button
            variant="ghost"
            onClick={() => navigate('/adventure/run/inventory')}
            class="text-xs"
          >
            인벤토리
          </Button>
        </div>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 z-10">
        <MapGraph
          rows={rows()}
          currentNodeId={currentNodeId()}
          availableIds={availableNextIds()}
          onEnter={enterNode}
        />
      </main>
    </div>
  );
}

interface MapGraphProps {
  rows: MapNode[][];
  currentNodeId: string | undefined;
  availableIds: Set<string>;
  onEnter: (node: MapNode) => void;
}

function MapGraph(props: MapGraphProps) {
  // 각 노드 DOM 참조로 SVG 좌표 계산
  let containerRef: HTMLDivElement | undefined;
  const nodeRefs = new Map<string, HTMLButtonElement>();
  let svgRef: SVGSVGElement | undefined;

  function redraw() {
    const container = containerRef;
    const svg = svgRef;
    if (!container || !svg) return;
    const bounds = container.getBoundingClientRect();
    // clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    svg.setAttribute('width', `${bounds.width}`);
    svg.setAttribute('height', `${bounds.height}`);

    for (let r = 0; r < props.rows.length - 1; r++) {
      const cur = props.rows[r]!;
      for (const node of cur) {
        for (const nextId of node.nextNodes) {
          const fromEl = nodeRefs.get(node.id);
          const toEl = nodeRefs.get(nextId);
          if (!fromEl || !toEl) continue;
          const fromR = fromEl.getBoundingClientRect();
          const toR = toEl.getBoundingClientRect();
          const x1 = fromR.left - bounds.left + fromR.width / 2;
          const y1 = fromR.top - bounds.top + fromR.height / 2;
          const x2 = toR.left - bounds.left + toR.width / 2;
          const y2 = toR.top - bounds.top + toR.height / 2;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(x1));
          line.setAttribute('y1', String(y1));
          line.setAttribute('x2', String(x2));
          line.setAttribute('y2', String(y2));
          const reachable =
            props.availableIds.has(nextId) || node.isCompleted;
          line.setAttribute('stroke', reachable ? '#a78bfa' : '#475569');
          line.setAttribute('stroke-width', reachable ? '2' : '1');
          line.setAttribute('stroke-dasharray', reachable ? '' : '4 4');
          svg.appendChild(line);
        }
      }
    }
  }

  onMount(() => {
    redraw();
    const ro = new ResizeObserver(() => redraw());
    if (containerRef) ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  return (
    <div ref={containerRef} class="relative">
      <svg
        ref={svgRef}
        class="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      />
      <div class="relative flex flex-col-reverse gap-6">
        <For each={props.rows}>
          {(row) => (
            <div class="flex items-center justify-around gap-3">
              <For each={row}>
                {(node) => (
                  <button
                    ref={(el) => {
                      nodeRefs.set(node.id, el);
                      queueMicrotask(redraw);
                    }}
                    type="button"
                    disabled={
                      !props.availableIds.has(node.id) &&
                      node.id !== props.currentNodeId
                    }
                    onClick={() => props.onEnter(node)}
                    class={cellClass(
                      node,
                      node.id === props.currentNodeId,
                      props.availableIds.has(node.id),
                    )}
                  >
                    <img
                      src={`/assets/adventure/nodes/${node.type}.png`}
                      class="w-10 h-10 object-contain"
                      style={{ "image-rendering": "pixelated" }}
                      alt={NODE_LABELS[node.type]}
                    />
                    <span class="text-[10px] uppercase tracking-wider">
                      {NODE_LABELS[node.type]}
                    </span>
                    <Show when={node.isCompleted}>
                      <span class="text-[10px] text-emerald-400">✓</span>
                    </Show>
                  </button>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

function cellClass(node: MapNode, isCurrent: boolean, isAvailable: boolean): string {
  const base =
    'relative z-10 flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 min-w-[80px] transition-all';
  if (isCurrent)
    return `${base} border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50`;
  if (isAvailable)
    return `${base} border-purple-400 bg-purple-500/10 text-purple-200 hover:border-purple-300 hover:bg-purple-500/20 cursor-pointer`;
  if (node.isCompleted)
    return `${base} border-slate-700 bg-slate-800/40 text-slate-500 opacity-60`;
  return `${base} border-slate-700 bg-slate-900 text-slate-400 opacity-50`;
}
