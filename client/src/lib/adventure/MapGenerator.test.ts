import { describe, expect, it } from 'bun:test';
import { generateAct, nodeRow } from './MapGenerator';
import type { NodeType } from '@shared/adventure';

describe('MapGenerator', () => {
  // 간단한 결정론적 pseudo-RNG (테스트용)
  const createMockRng = (values: number[]) => {
    let index = 0;
    return () => {
      const val = values[index] ?? 0;
      index = (index + 1) % values.length;
      return val;
    };
  };

  it('should generate a map with correct dimensions and node types', () => {
    const map = generateAct({ act: 1, rows: 8, slotsPerRow: 3 });

    expect(map.act).toBe(1);
    expect(map.rows).toBe(8);
    expect(map.rowsBySlot).toBe(3);

    // 노드 개수 검증:
    // row 0: 1개
    // row 1..6 (6개 행): 각 3개씩 = 18개
    // row 7: 1개
    // 총 20개 노드
    expect(map.nodes.length).toBe(20);
    expect(map.entryNodeIds.length).toBe(1);
    expect(map.entryNodeIds[0]).toBe(map.nodes[0]?.id);

    // 노드별 타입 및 위치 검증
    map.nodes.forEach((node) => {
      const row = nodeRow(node, map);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(8);

      if (row === 0) {
        expect(node.type).toBe('battle');
      } else if (row === 7) {
        expect(node.type).toBe('boss');
      } else if (row === 6) {
        expect(node.type).toBe('rest');
      } else {
        // 중간 노드 타입들
        expect(['battle', 'elite', 'shop', 'event', 'rest']).toContain(node.type);
      }
    });
  });

  it('should generate connections strictly to the next row', () => {
    const map = generateAct({ act: 1, rows: 8, slotsPerRow: 3 });

    map.nodes.forEach((node) => {
      const row = nodeRow(node, map);
      
      if (row === 7) {
        // 보스는 마지막 노드이므로 연결이 없어야 함
        expect(node.nextNodes.length).toBe(0);
      } else {
        expect(node.nextNodes.length).toBeGreaterThan(0);
        
        // 연결된 모든 노드가 다음 행(row + 1)에 위치하는지 검증
        node.nextNodes.forEach((nextNodeId) => {
          const nextNode = map.nodes.find((n) => n.id === nextNodeId);
          expect(nextNode).toBeDefined();
          const nextRow = nodeRow(nextNode!, map);
          expect(nextRow).toBe(row + 1);
        });
      }
    });
  });

  it('should prevent consecutive duplicate node types in the same row when possible', () => {
    // 특정 값이 반복되도록 목 RNG 주입
    // pickWeighted에서 중복 배제 로직이 적용되는지 검증
    const rng = createMockRng([0.1, 0.1, 0.1, 0.1]);
    const map = generateAct({ act: 2, rows: 5, slotsPerRow: 3, rng });

    // 각 행마다 같은 타입이 중복되지 않는지 검증 (row 0, row 3(Rest), row 4는 제외)
    // row 1, 2 (각 3개씩)
    for (let r = 1; r < 3; r++) {
      const rowNodes = map.nodes.filter((node) => nodeRow(node, map) === r);
      expect(rowNodes.length).toBe(3);
      
      const type1 = rowNodes[0]?.type;
      const type2 = rowNodes[1]?.type;
      const type3 = rowNodes[2]?.type;

      // 인접한 노드끼리 타입이 달라야 함
      expect(type1).not.toBe(type2);
      expect(type2).not.toBe(type3);
    }
  });
});
