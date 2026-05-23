import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { setMode } from '@/store/gameStore';

export default function AdventureEntry() {
  const navigate = useNavigate();
  const dict = () => t();

  onMount(() => setMode('adventure'));

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← {dict().adventure.back}
        </Button>
        <span class="font-semibold">{dict().adventure.title}</span>
      </header>
      <main class="flex-1 flex items-center justify-center text-slate-400">
        {dict().adventure.inProgress}
      </main>
    </div>
  );
}
