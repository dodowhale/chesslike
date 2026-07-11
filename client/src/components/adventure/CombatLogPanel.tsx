import { For, createEffect } from 'solid-js';
import { gameStore } from '@/store/gameStore';

export function CombatLogPanel() {
  let scrollContainer: HTMLDivElement | undefined;

  createEffect(() => {
    const logs = gameStore.actionLogs;
    if (scrollContainer && logs.length > 0) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });

  return (
    <div class="w-full max-w-[480px] bg-slate-950/75 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5 shadow-inner">
      <div class="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1">
        <span class="text-xs font-semibold text-slate-400">📜 전투 로그</span>
        <span class="text-[10px] text-slate-500 font-mono">실시간 전투 기록</span>
      </div>
      <div 
        ref={scrollContainer}
        class="h-32 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800"
      >
        <For each={gameStore.actionLogs}>
          {(log) => (
            <div class="text-[11px] font-mono text-slate-300 py-0.5 border-b border-slate-900/30 break-all leading-normal">
              {log}
            </div>
          )}
        </For>
        {gameStore.actionLogs.length === 0 && (
          <div class="text-[11px] text-slate-500 text-center py-8">
            전투 기록이 없습니다. 이동 또는 스킬을 시도하십시오.
          </div>
        )}
      </div>
    </div>
  );
}
