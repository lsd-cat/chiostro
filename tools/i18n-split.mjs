// Writes one translation file per language under web/src/core/lang/, one key per line, each with a
// comment saying where the string shows (from the code and the markup) and, outside English, the
// English source. Run after a build: node tools/i18n-split.mjs. Re-running keeps the translations
// and refreshes the comments.
import {readFileSync, readdirSync, writeFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
const {LANGS, LANG_NAMES} = await import('../dist/core/i18n.js');

const AREA = {'ui/apps/home.ts': 'landing page', 'ui/apps/meet.ts': 'call', 'ui/apps/when.ts': 'plan', 'ui/apps/pad.ts': 'pad', 'ui/apps/share.ts': 'files page', 'ui/apps/form.ts': 'form',
  'ui/shell.ts': 'header, shared', 'ui/dom.ts': 'shared helpers', 'ui/widgets.ts': 'upload queue, widgets', 'ui/comments.ts': 'pad comments', 'ui/fedi.ts': 'fediverse cards', 'ui/qr.ts': 'QR', 'ui/main.ts': 'boot', 'ui/extensions.ts': 'call extensions'};
const area = f => AREA[f] ?? (f.startsWith('ui/ext/') ? 'call: ' + f.slice(7, -3) : f.startsWith('core/ext/') ? 'call: ' + f.slice(9, -3) : f.replace(/\.ts$/, ''));
const files = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
const uses = new Map();   // key -> Set of places
const add = (key, place) => { if (!uses.has(key)) uses.set(key, new Set()); uses.get(key).add(place); };
for (const p of files('web/src')) {
  const rel = p.slice('web/src/'.length), src = readFileSync(p, 'utf8');
  for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_]+)'/g)) add(m[1], area(rel));
  for (const m of src.matchAll(/\bt\([^()]*\?\s*'([a-zA-Z0-9_]+)'\s*:\s*'([a-zA-Z0-9_]+)'/g)) { add(m[1], area(rel)); add(m[2], area(rel)); }
  for (const m of src.matchAll(/data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_]+)"/g)) add(m[1], area(rel) + ' markup');   // extensions build their markup from template strings
  for (const m of src.matchAll(/['"`]([a-zA-Z0-9_]+)['"`]/g)) if (LANGS.en[m[1]] && !uses.get(m[1])?.has(area(rel)) && m[1].length > 3) add(m[1], area(rel));   // a key passed along by name (ternaries, toggle helpers)
}
const html = readFileSync('web/index.html', 'utf8');
for (const m of html.matchAll(/<template id="tpl-([a-z]+)">([\s\S]*?)<\/template>/g)) {
  for (const e of m[2].matchAll(/<([a-z0-9]+)([^>]*)data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_]+)"/g)) { const id = /id="([^"]+)"/.exec(e[2])?.[1]; add(e[3], `${m[1] === 'home' ? 'landing page' : m[1] === 'meet' ? 'call' : m[1] === 'when' ? 'plan' : m[1] === 'share' ? 'files page' : m[1]} markup: <${e[1]}${id ? ' #' + id : ''}>`); }
}
const outsideTemplates = html.replace(/<template[\s\S]*?<\/template>/g, '');
for (const e of outsideTemplates.matchAll(/<([a-z0-9]+)([^>]*)data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_]+)"/g)) { const id = /id="([^"]+)"/.exec(e[2])?.[1]; add(e[3], `header markup: <${e[1]}${id ? ' #' + id : ''}>`); }
for (const e of html.matchAll(/data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_]+)"/g)) if (!uses.has(e[1])) add(e[1], 'markup');   // whatever the template scan missed (nested templates)
const DYNAMIC = [[/^app_/, 'tool name: header navigation, landing cards, page titles'], [/^desc_/, 'landing card, under the tool name'], [/^(copied|viewCopied)$/, 'a copy button after copying'], [/^f(Text|Long|Number|Date|One|Many|Words|Scale)$/, 'form: question type, builder and presenting'], [/^(add|start|stop|edit|both|group|accept|poll|embed|pip|dismiss)$/, 'call extensions or a short button label (by name)']];
const where = key => { const s = [...(uses.get(key) ?? [])]; for (const [re, d] of DYNAMIC) if (re.test(key) && !s.length) s.push(d); return s.length ? s.join('; ') : 'not found in code or markup: check before removing'; };
const q = s => JSON.stringify(s);
for (const [code, dict] of Object.entries(LANGS)) {
  const lines = [`// ${LANG_NAMES[code]}. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows${code === 'en' ? '' : ' and give the English source'}.`,
    '// Regenerate the comments after a build with: node tools/i18n-split.mjs', '', 'const dict: Record<string, string> = {'];
  for (const key of Object.keys(LANGS.en)) lines.push(`  ${key}: ${q(dict[key] ?? '')},   // ${code === 'en' ? '' : q(LANGS.en[key]) + ' — '}${where(key)}`);
  lines.push('};', 'export default dict;', '');
  writeFileSync(`web/src/core/lang/${code}.ts`, lines.join('\n'));
}
console.log('written', Object.keys(LANGS).length, 'files,', Object.keys(LANGS.en).length, 'keys each;', [...uses.keys()].filter(k => LANGS.en[k]).length, 'keys located');
