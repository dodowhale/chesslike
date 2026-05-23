import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';
import {
  settings,
  updateAudio,
  updateSettings,
  updateAccessibility,
  updateTheme,
} from '@/store/settingsStore';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const dict = () => t();

  return (
    <Modal open={props.open} onClose={props.onClose} title={dict().settings.title}>
      <div class="flex flex-col gap-6">
        <section>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().settings.audio}
          </h3>
          <label class="flex flex-col gap-2 mb-3">
            <span class="text-sm text-slate-200">{dict().settings.bgm}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.audio.bgmVolume}
              onInput={(e) =>
                updateAudio({ bgmVolume: Number(e.currentTarget.value) })
              }
              class="accent-amber-500"
            />
            <span class="text-xs text-slate-400 tabular-nums">
              {Math.round(settings.audio.bgmVolume * 100)}%
            </span>
          </label>
          <label class="flex flex-col gap-2 mb-3">
            <span class="text-sm text-slate-200">{dict().settings.sfx}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.audio.sfxVolume}
              onInput={(e) =>
                updateAudio({ sfxVolume: Number(e.currentTarget.value) })
              }
              class="accent-amber-500"
            />
            <span class="text-xs text-slate-400 tabular-nums">
              {Math.round(settings.audio.sfxVolume * 100)}%
            </span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.audio.muted}
              onChange={(e) => updateAudio({ muted: e.currentTarget.checked })}
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">{dict().settings.muted}</span>
          </label>
        </section>

        <section>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().settings.locale}
          </h3>
          <div class="flex gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="locale"
                value="ko"
                checked={settings.locale === 'ko'}
                onChange={() => updateSettings({ locale: 'ko' })}
                class="accent-amber-500"
              />
              <span class="text-sm text-slate-200">한국어</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer ml-4">
              <input
                type="radio"
                name="locale"
                value="en"
                checked={settings.locale === 'en'}
                onChange={() => updateSettings({ locale: 'en' })}
                class="accent-amber-500"
              />
              <span class="text-sm text-slate-200">English</span>
            </label>
          </div>
        </section>

        <section>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().settings.theme}
          </h3>
          <label class="flex flex-col gap-2 mb-2">
            <span class="text-sm text-slate-200">{dict().settings.boardSkin}</span>
            <select
              value={settings.theme.boardSkin}
              onChange={(e) => updateTheme({ boardSkin: e.currentTarget.value })}
              class="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="default">Default</option>
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
            </select>
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-sm text-slate-200">{dict().settings.pieceSkin}</span>
            <select
              value={settings.theme.pieceSkin}
              onChange={(e) => updateTheme({ pieceSkin: e.currentTarget.value })}
              class="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="default">Default</option>
              <option value="pixel">Pixel</option>
            </select>
          </label>
        </section>

        <section>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().settings.accessibility}
          </h3>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.accessibility.reducedMotion}
              onChange={(e) =>
                updateAccessibility({ reducedMotion: e.currentTarget.checked })
              }
              class="accent-amber-500"
            />
            <span class="text-sm text-slate-200">
              {dict().settings.reducedMotion}
            </span>
          </label>
        </section>

        <section>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            {dict().settings.notation}
          </h3>
          <div class="flex gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="notation"
                value="san"
                checked={settings.notation === 'san'}
                onChange={() => updateSettings({ notation: 'san' })}
                class="accent-amber-500"
              />
              <span class="text-sm text-slate-200">
                {dict().settings.notationSan}
              </span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer ml-4">
              <input
                type="radio"
                name="notation"
                value="san+kr"
                checked={settings.notation === 'san+kr'}
                onChange={() => updateSettings({ notation: 'san+kr' })}
                class="accent-amber-500"
              />
              <span class="text-sm text-slate-200">
                {dict().settings.notationSanKr}
              </span>
            </label>
          </div>
        </section>

        <div class="flex justify-end pt-2">
          <Button variant="secondary" onClick={props.onClose}>
            {dict().settings.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
