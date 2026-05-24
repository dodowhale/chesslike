/**
 * 시계 스냅샷 — 클래식 모드 한정. 모험 모드에서는 사용하지 않는다.
 * 컨트롤러가 매 tick마다 gameStore.ui.clock에 기록한다.
 */
export interface ClockSnapshot {
  whiteMs: number;
  blackMs: number;
  turn: 'w' | 'b';
  running: boolean;
  flagged?: 'w' | 'b';
  unlimited: boolean;
}
