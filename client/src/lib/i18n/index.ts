import { ko, type I18nDict } from './ko';
import { en } from './en';
import { settings } from '@/store/settingsStore';

const dicts: Record<'ko' | 'en', I18nDict> = { ko, en };

export function t(): I18nDict {
  return dicts[settings.locale] ?? ko;
}

export type { I18nDict };
