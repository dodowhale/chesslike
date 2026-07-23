import { describe, test, expect } from 'bun:test';
import { createClockManager, formatClock } from './ClockManager';

describe('ClockManager', () => {
  test('should initialize preset bullet clock correctly', () => {
    const clock = createClockManager({ kind: 'preset', preset: 'bullet' });
    const s = clock.state();
    expect(s.whiteMs).toBe(60_000);
    expect(s.blackMs).toBe(60_000);
    expect(s.turn).toBe('w');
    expect(s.running).toBe(false);
    expect(s.unlimited).toBe(false);
    expect(s.flagged).toBeUndefined();
  });

  test('should handle unlimited clock correctly', () => {
    const clock = createClockManager({ kind: 'unlimited' });
    const s = clock.state();
    expect(s.unlimited).toBe(true);
  });

  test('should format clock display properly', () => {
    expect(formatClock(60_000)).toBe('1:00');
    expect(formatClock(182_000)).toBe('3:02');
    expect(formatClock(3665_000)).toBe('1:01:05');
    expect(formatClock(Number.MAX_SAFE_INTEGER)).toBe('∞');
  });

  test('should switch turns and add increment on move', () => {
    const clock = createClockManager({ kind: 'preset', preset: 'blitz' }); // 3m + 2s
    clock.start();
    clock.onMove(); // White moves
    const s = clock.state();
    expect(s.turn).toBe('b');
    // White received +2000ms increment
    expect(s.whiteMs).toBeGreaterThanOrEqual(180_000 + 2000 - 100);
  });

  test('should flag on manual flag call or timeout', () => {
    const clock = createClockManager({ kind: 'preset', preset: 'bullet' });
    clock.flag();
    expect(clock.state().flagged).toBe('w');
    expect(clock.state().running).toBe(false);
  });
});
