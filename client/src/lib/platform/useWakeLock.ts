import { onCleanup, onMount } from 'solid-js';

/**
 * 게임 화면 동안 화면 자동 잠금을 막는다.
 * - WakeLock API 미지원 브라우저(iOS Safari 일부 등)는 noop.
 * - visibility 복귀 시 자동 재요청.
 * - 컴포넌트 unmount 시 해제.
 */
export function useWakeLock(): void {
  let sentinel: WakeLockSentinel | null = null;
  let cancelled = false;

  async function request() {
    if (!('wakeLock' in navigator)) return;
    try {
      const s = await navigator.wakeLock.request('screen');
      if (cancelled) {
        void s.release();
        return;
      }
      sentinel = s;
      s.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      /* 무시 — 권한 거부 또는 미지원 */
    }
  }

  function onVisibility() {
    if (cancelled) return;
    if (document.visibilityState === 'visible' && !sentinel) void request();
  }

  onMount(() => {
    void request();
    document.addEventListener('visibilitychange', onVisibility);
  });

  onCleanup(() => {
    cancelled = true;
    document.removeEventListener('visibilitychange', onVisibility);
    if (sentinel) {
      void sentinel.release();
      sentinel = null;
    }
  });
}
