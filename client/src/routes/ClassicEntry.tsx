import { onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ModeCard } from '@/components/menu/ModeCard';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import { setMode } from '@/store/gameStore';

export default function ClassicEntry() {
  const navigate = useNavigate();
  const dict = () => t();

  onMount(() => setMode('classic'));

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
        <Button variant="ghost" onClick={() => navigate('/')}>
          ← {dict().classic.back}
        </Button>
        <span class="font-semibold">{dict().classic.title}</span>
      </header>
      <main class="flex-1 flex items-center justify-center px-6">
        <div class="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch">
          <ModeCard
            title={dict().classic.single}
            description={dict().classic.singleDesc}
            icon="🤖"
            accent="classic"
            onClick={() => navigate('/classic/single')}
          />
          <ModeCard
            title={dict().classic.local}
            description={dict().classic.localDesc}
            icon="👥"
            accent="classic"
            onClick={() => navigate('/classic/local')}
          />
        </div>
      </main>
    </div>
  );
}
