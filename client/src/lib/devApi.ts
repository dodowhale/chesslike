/**
 * dev-only `window.__chesslike` 디버그 API.
 *
 * 빌드: `import.meta.env.DEV` 가드. 프로덕션 번들에서는 본 모듈을 import하지 않으므로
 * 실수로 노출될 가능성을 차단한다. (`main.tsx`는 DEV 분기에서 dynamic import로 호출)
 *
 * 사용 예 (브라우저 콘솔):
 *   __chesslike.bus.emit('cmd:reset', {});
 *   await __chesslike.adventure.giveItem('crown-of-eternity');
 *   await __chesslike.adventure.addGold(100);
 *
 * 본 사이클은 안전한 read + 자주 쓰는 mutate 헬퍼만 노출. 추가 디버그 패널 UI는 후속.
 */
import * as gameStore from '@/store/gameStore';
import { eventBus } from '@/lib/phaser/bridge/eventBus';
import { activeRun } from '@/store/adventureStore';
import { getItemById } from '@/lib/adventure/data/items';
import { loadRunStats, saveRunStats } from '@/lib/storage/runStatsRepo';

export interface ChesslikeDevApi {
  /** gameStore 모듈 전체 (state, setters, helpers). */
  game: typeof gameStore;
  /** Phaser ↔ SolidJS eventBus. */
  bus: typeof eventBus;
  /** 모험 모드 디버그 헬퍼. */
  adventure: {
    /** 현재 활성 런 컨트롤러 (없으면 undefined). */
    current(): ReturnType<typeof activeRun>;
    /** 인벤토리에 아이템 강제 추가. id가 존재하지 않으면 false. */
    giveItem(itemId: string): boolean;
    /** 현재 런의 골드 변경 (음수도 가능). */
    addGold(amount: number): boolean;
  };
  /** 누적 통계 직접 조회/덮어쓰기 (dev only). */
  stats: {
    load: typeof loadRunStats;
    save: typeof saveRunStats;
  };
}

export function installDevApi(): void {
  const api: ChesslikeDevApi = {
    game: gameStore,
    bus: eventBus,
    adventure: {
      current: () => activeRun(),
      giveItem(itemId: string): boolean {
        const c = activeRun();
        if (!c) return false;
        const item = getItemById(itemId);
        if (!item) return false;
        const run = c.state();
        run.inventory.push(item);
        gameStore.snapshotAdventureRun(run);
        return true;
      },
      addGold(amount: number): boolean {
        const c = activeRun();
        if (!c) return false;
        const run = c.state();
        run.gold = Math.max(0, run.gold + amount);
        gameStore.snapshotAdventureRun(run);
        return true;
      },
    },
    stats: { load: loadRunStats, save: saveRunStats },
  };
  (window as unknown as { __chesslike: ChesslikeDevApi }).__chesslike = api;
}

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  interface Window {
    __chesslike?: ChesslikeDevApi;
  }
}
