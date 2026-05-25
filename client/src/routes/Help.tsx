import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default function HelpRoute() {
  const navigate = useNavigate();
  const dict = () => t();

  return (
    <div class="min-h-screen flex flex-col">
      <header class="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← {dict().help.back}
          </Button>
          <span class="font-semibold">❓ {dict().help.title}</span>
        </div>
      </header>
      <main class="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        <Section
          heading={dict().help.classicHeading}
          body={dict().help.classicBody}
        />
        <Section
          heading={dict().help.adventureHeading}
          body={dict().help.adventureBody}
        />
        <Section
          heading={dict().help.controlsHeading}
          body={dict().help.controlsBody}
        />
        <Section
          heading={dict().help.accessibilityHeading}
          body={dict().help.accessibilityBody}
        />
      </main>
    </div>
  );
}

function Section(props: { heading: string; body: string }) {
  return (
    <section class="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-slate-100">{props.heading}</h2>
      <p class="text-sm text-slate-300 leading-relaxed">{props.body}</p>
    </section>
  );
}
