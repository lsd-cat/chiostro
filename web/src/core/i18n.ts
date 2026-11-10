// Translations and t(). The dictionaries are one file per language under lang/ (one key per line, a comment per key
// saying where it shows; tools/i18n-split.mjs refreshes the comments). The UI applies them to markup (ui/dom.ts translate()).
type Dict = Record<string, string>;
import en from './lang/en.js';
import it from './lang/it.js';
import fr from './lang/fr.js';
import es from './lang/es.js';
import zh from './lang/zh.js';
import ar from './lang/ar.js';

export const LANGS: Record<string, Dict> = {en, it, fr, es, zh, ar};
export const LANG_NAMES: Record<string, string> = {en: 'English', it: 'Italiano', fr: 'Français', es: 'Español', zh: '中文', ar: 'العربية'};
export const RTL = new Set(['ar']);

export let lang = 'en';

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = LANGS[lang]?.[key] ?? en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Pick the language: saved choice, else the browser's, else English. Returns the code. */
export function pickLang(saved: string | null, browser: string): string {
  const b = browser.slice(0, 2);
  lang = saved && LANGS[saved] ? saved : LANGS[b] ? b : 'en';
  return lang;
}
