import { For, Show, createResource, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { setAdventureRun, setMode } from '@/store/gameStore';
import {
  CHARACTER_POOL,
  applyMetaToCharacters,
} from '@/lib/adventure/data/characters';
import { AdventureRunController } from '@/lib/controllers/AdventureSceneController';
import { setActiveRun } from '@/store/adventureStore';
import { clearPersistedRun, loadPersistedRun } from '@/lib/adventure/runPersist';
import { ensureMetaLoaded, metaSignal } from '@/store/metaStore';

export default function AdventureEntry() {
  const navigate = useNavigate();
  const dict = () => t();

  // 진행 중인 런이 있는지 확인 (ADVENTURE.md §9 자동 이어하기)
  const [persisted, { refetch }] = createResource(() => loadPersistedRun());
  const characters = () =>
    applyMetaToCharacters(CHARACTER_POOL, metaSignal()?.unlockedCharacters ?? []);

  onMount(() => {
    setMode('adventure');
    setAdventureRun(undefined);
    setActiveRun(undefined);
    void ensureMetaLoaded();
  });

  function resumeRun() {
    const run = persisted();
    if (!run) return;
    const ctrl = AdventureRunController.restore(run, metaSignal());
    setActiveRun(ctrl);
    navigate('/adventure/run/map');
  }

  async function discardRun() {
    await clearPersistedRun();
    void refetch();
  }

  function startRun(characterId: string) {
    const character = characters().find((c) => c.id === characterId);
    if (!character || !character.isUnlocked) return;
    const controller = new AdventureRunController({
      character,
      meta: metaSignal(),
    });
    setActiveRun(controller);
    navigate('/adventure/run/map');
  }

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← {dict().adventure.back}
        </Button>
        <span class="font-semibold">{dict().adventure.title}</span>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        <Show when={persisted()}>
          {(run) => (
            <section class="p-4 border-2 border-amber-500/50 bg-amber-500/10 rounded-lg flex items-center justify-between gap-3">
              <div>
                <h3 class="font-semibold text-amber-200">진행 중인 런</h3>
                <p class="text-xs text-slate-300 mt-1">
                  {run().act}막 · 완료 노드{' '}
                  {run().map.filter((n) => n.isCompleted).length} / {run().map.length} · 별의 조각{' '}
                  {run().starShardsThisRun}
                </p>
              </div>
              <div class="flex gap-2">
                <Button onClick={resumeRun}>이어하기</Button>
                <Button variant="secondary" onClick={() => void discardRun()}>
                  폐기
                </Button>
              </div>
            </section>
          )}
        </Show>
        <section>
          <h2 class="text-2xl font-bold text-amber-400 mb-2">캐릭터 선택</h2>
          <p class="text-sm text-slate-400">
            한 번의 런으로 1막 보스 클리어를 목표로 합니다. 별의 조각으로 다음 런이
            점점 강화됩니다.
          </p>
        </section>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <For each={characters()}>
            {(character) => (
              <button
                type="button"
                disabled={!character.isUnlocked}
                onClick={() => startRun(character.id)}
                class="text-left flex flex-col gap-2 p-4 rounded-lg border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/20 to-fuchsia-700/10 hover:border-purple-400 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div class="flex items-center gap-2">
                  <span class="text-3xl">♟</span>
                  <span class="text-xl font-bold text-slate-100">{character.name}</span>
                  {!character.isUnlocked && (
                    <span class="text-xs text-slate-400">잠김 (메타 진행에서 해금)</span>
                  )}
                </div>
                <p class="text-sm text-slate-300">{character.description}</p>
              </button>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
