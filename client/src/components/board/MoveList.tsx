import { For, Show, createMemo } from 'solid-js';
import { gameStore, getPgn, rewindTo } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';

interface MoveRow {
  index: number;
  number: number;
  white?: { san: string; index: number };
  black?: { san: string; index: number };
}

interface MoveListProps {
  onJump?: (index: number) => void;
  pgnHeaders?: () => Record<string, string>;
}

function pairRows(sans: string[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    const white = sans[i];
    const black = sans[i + 1];
    rows.push({
      index: rows.length,
      number: Math.floor(i / 2) + 1,
      white: white ? { san: white, index: i + 1 } : undefined,
      black: black ? { san: black, index: i + 2 } : undefined,
    });
  }
  return rows;
}

export function MoveList(props: MoveListProps) {
  const rows = createMemo(() => pairRows(gameStore.moves.map((m) => m.san)));

  function jump(index: number) {
    rewindTo(index);
    props.onJump?.(index);
  }

  function download() {
    const pgn = getPgn(props.pgnHeaders?.() ?? {});
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `chesslike-${timestamp}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div class="flex flex-col gap-2 w-full max-w-[560px]">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-300">기보</h3>
        <Button variant="ghost" onClick={download} class="text-xs">
          PGN 다운로드
        </Button>
      </div>
      <div class="max-h-48 overflow-y-auto border border-slate-800 rounded-md">
        <Show
          when={rows().length > 0}
          fallback={
            <div class="px-3 py-4 text-xs text-slate-500 text-center">아직 무브 없음</div>
          }
        >
          <table class="w-full text-sm font-mono">
            <tbody>
              <For each={rows()}>
                {(row) => (
                  <tr class="border-b border-slate-800 last:border-0">
                    <td class="px-3 py-1.5 text-slate-500 text-xs w-10">{row.number}.</td>
                    <td class="px-2 py-1.5">
                      <Show when={row.white}>
                        {(w) => (
                          <button
                            type="button"
                            onClick={() => jump(w().index)}
                            class="hover:text-amber-400 transition-colors"
                          >
                            {w().san}
                          </button>
                        )}
                      </Show>
                    </td>
                    <td class="px-2 py-1.5">
                      <Show when={row.black}>
                        {(b) => (
                          <button
                            type="button"
                            onClick={() => jump(b().index)}
                            class="hover:text-amber-400 transition-colors"
                          >
                            {b().san}
                          </button>
                        )}
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  );
}
