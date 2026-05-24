import { useNavigate } from '@solidjs/router';
import { t } from '@/lib/i18n';

interface HeaderBarProps {
  onOpenSettings: () => void;
}

export function HeaderBar(props: HeaderBarProps) {
  const dict = () => t();
  const navigate = useNavigate();
  return (
    <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div class="flex items-center gap-2">
        <span class="text-2xl">♞</span>
        <span class="font-semibold text-slate-100">{dict().app.title}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          aria-label={dict().menu.achievements}
          onClick={() => navigate('/achievements')}
          class="w-9 h-9 rounded-md hover:bg-slate-800 transition-colors"
        >
          🏆
        </button>
        <button
          type="button"
          aria-label={dict().menu.stats}
          aria-disabled="true"
          tabindex={-1}
          class="w-9 h-9 rounded-md hover:bg-slate-800 transition-colors opacity-50 cursor-not-allowed"
          disabled
        >
          📊
        </button>
        <button
          type="button"
          aria-label={dict().menu.settings}
          onClick={props.onOpenSettings}
          class="w-9 h-9 rounded-md hover:bg-slate-800 transition-colors"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
