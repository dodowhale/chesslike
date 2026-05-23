import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { setClassicConfig, setMode } from '@/store/gameStore';

export default function ClassicLocalPlay() {
  const navigate = useNavigate();
  const dict = () => t();

  onMount(() => {
    setMode('classic');
    setClassicConfig({ submode: 'local' });
  });

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/classic')}>
          ← {dict().classic.back}
        </Button>
        <span class="font-semibold">
          {dict().classic.title} · {dict().classic.local}
        </span>
      </header>
      <main class="flex-1 flex items-center justify-center text-slate-400">
        {dict().classic.inProgress}
      </main>
    </div>
  );
}
