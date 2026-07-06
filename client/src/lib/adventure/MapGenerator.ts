import type { Act, MapNode, NodeType } from '@shared/adventure';

/**
 * ARCHITECTURE §4.3 / ADVENTURE.md §3 정의에 따른 노드 맵 생성기.
 *
 * - 행(row)이 8개. 첫 노드(row 0)는 Battle 고정.
 * - 마지막 직전 행(row 6)은 Rest 보장.
 * - 마지막 행(row 7)은 Boss.
 * - 같은 행 같은 종류 연속 금지.
 * - 가중치: Battle 60% / Elite 10% / Shop 10% / Event 15% / Rest 5%.
 *
 * 각 행은 1~3개의 노드를 가진다(slot). 인접한 행의 노드끼리 연결되어 그래프 형성.
 */

interface WeightedNode {
  type: NodeType;
  weight: number;
}

const STANDARD_WEIGHTS: WeightedNode[] = [
  { type: 'battle', weight: 60 },
  { type: 'elite', weight: 10 },
  { type: 'shop', weight: 10 },
  { type: 'event', weight: 15 },
  { type: 'rest', weight: 5 },
];

function pickWeighted(rng: () => number, exclude: NodeType[] = []): NodeType {
  const filtered = STANDARD_WEIGHTS.filter((n) => !exclude.includes(n.type));
  const total = filtered.reduce((acc, n) => acc + n.weight, 0);
  let roll = rng() * total;
  for (const n of filtered) {
    roll -= n.weight;
    if (roll <= 0) return n.type;
  }
  return filtered[filtered.length - 1]!.type;
}

function defaultRng(): () => number {
  return Math.random;
}

export interface GenerateActOptions {
  act: Act;
  rng?: () => number;
  rows?: number;
  slotsPerRow?: number;
}

export interface GeneratedMap {
  act: Act;
  nodes: MapNode[];
  rowsBySlot: number;
  rows: number;
  /** 시작 노드(들) — 진입 가능한 row 0의 노드 ID. */
  entryNodeIds: string[];
}

export function generateAct(opts: GenerateActOptions): GeneratedMap {
  const act = opts.act;
  const rng = opts.rng ?? defaultRng();
  const rows = opts.rows ?? 8;
  const slotsPerRow = opts.slotsPerRow ?? 3;

  const grid: MapNode[][] = [];
  let idCounter = 0;
  const makeId = () => `a${act}-n${idCounter++}`;

  for (let r = 0; r < rows; r++) {
    const row: MapNode[] = [];
    const slots = r === 0 || r === rows - 1 ? 1 : slotsPerRow;
    const prevTypesInRow: NodeType[] = [];
    for (let s = 0; s < slots; s++) {
      let type: NodeType;
      if (r === rows - 1) {
        type = 'boss';
      } else if (r === 0) {
        type = 'battle';
      } else if (r === rows - 2) {
        type = 'rest';
      } else {
        type = pickWeighted(rng, prevTypesInRow);
      }
      prevTypesInRow.push(type);
      row.push({
        id: makeId(),
        type,
        act,
        isCompleted: false,
        nextNodes: [],
      });
    }
    grid.push(row);
  }

  // 인접 행 연결: 각 노드는 다음 행의 하나 이상의 노드로 연결
  for (let r = 0; r < rows - 1; r++) {
    const cur = grid[r]!;
    const next = grid[r + 1]!;
    for (let i = 0; i < cur.length; i++) {
      const node = cur[i]!;
      // 인덱스 i 기준 ±1 범위의 다음 행 노드를 연결
      let lo = Math.max(0, i - 1);
      let hi = Math.min(next.length - 1, i + 1);
      
      if (lo > hi) {
        lo = next.length - 1;
        hi = next.length - 1;
      }

      const connections = new Set<string>();
      // 적어도 하나는 연결 (정렬된 자연 후보)
      for (let j = lo; j <= hi; j++) {
        connections.add(next[j]!.id);
      }
      node.nextNodes = Array.from(connections);
    }
  }

  const nodes = grid.flat();
  const entryNodeIds = grid[0]!.map((n) => n.id);

  return {
    act,
    nodes,
    rowsBySlot: slotsPerRow,
    rows,
    entryNodeIds,
  };
}

/** 노드의 행 인덱스 (0..rows-1)를 반환. */
export function nodeRow(node: MapNode, map: GeneratedMap): number {
  const pos = map.nodes.indexOf(node);
  if (pos < 0) return -1;
  let idx = 0;
  for (let r = 0; r < map.rows; r++) {
    const slots = r === 0 || r === map.rows - 1 ? 1 : map.rowsBySlot;
    if (pos >= idx && pos < idx + slots) return r;
    idx += slots;
  }
  return map.rows - 1;
}
