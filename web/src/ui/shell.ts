// The page every app shares: language, deployment config, theme, the link secret, a header with
// navigation to the sibling apps of the same meeting, and `join()` to open this app's room with
// relay, roster, sync and store. Apps are modules under ui/apps/, mounted from a <template>.
import {loadConfig, THEME_VARS, type Config} from '../core/config.js';
import {t, pickLang, LANG_NAMES, RTL} from '../core/i18n.js';
import {session, newKey, type Session} from '../core/session.js';
import {ecdhKeypair, b64u, sha256hex, signKeypair, sign, verify, type SignKeys} from '../core/crypto.js';
import {Signaling} from '../core/signaling.js';
import {Roster} from '../core/roster.js';
import {Sync} from '../core/sync.js';
import {Store, storeKeys} from '../core/store.js';
import {Bus, type Core} from '../core/ext.js';
import {$, el, translate, copyLink} from './dom.js';
import {drawQr} from './qr.js';

export const config: Config = await loadConfig();
const seg = location.pathname.replace(/^\/|\/$/g, '').split('/')[0] || '';
export const app = config.apps.includes(seg) ? seg : 'home';   // /pad/: the pad; /: the landing page
export const params = new URLSearchParams(location.search);
export const embedded = params.has('embed');   // inside another tool's page: no header, report our height to the parent
const root = document.documentElement;

// --- language, theme ---
const lang = pickLang(localStorage.getItem('lang'), navigator.language);
root.lang = lang;
root.dir = RTL.has(lang) ? 'rtl' : 'ltr';
for (const sel of document.querySelectorAll<HTMLSelectElement>('select.lang')) {
  for (const [code, name] of Object.entries(LANG_NAMES)) sel.append(new Option(name, code, false, code === lang));
  sel.onchange = () => { localStorage.setItem('lang', sel.value); location.reload(); };
}
const isDark = () => root.dataset['theme'] ? root.dataset['theme'] === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
function applyTheme(cfg: Config, dark: boolean) {   // theme values are CSS custom properties set through the CSSOM, which the CSP allows
  const st = root.style;
  for (const v of THEME_VARS) st.removeProperty('--' + v);
  for (const [k, v] of Object.entries(dark ? cfg.theme.dark : cfg.theme.light)) st.setProperty('--' + k, v);
}
if (localStorage.getItem('theme')) root.dataset['theme'] = localStorage.getItem('theme')!;
applyTheme(config, isDark());
matchMedia('(prefers-color-scheme: dark)').onchange = () => applyTheme(config, isDark());
new MutationObserver(() => applyTheme(config, isDark())).observe(root, {attributes: true, attributeFilter: ['data-theme']});   // whoever flips data-theme gets that scheme's accent too
for (const b of document.querySelectorAll<HTMLButtonElement>('button.theme')) b.onclick = () => { root.dataset['theme'] = isDark() ? 'light' : 'dark'; localStorage.setItem('theme', root.dataset['theme']); applyTheme(config, isDark()); };

// --- the meeting's secret, and the way to its siblings ---
if (location.hash.length <= 1) history.replaceState(null, '', location.pathname + location.search + '#' + newKey());
let s: Session | null = null;
try { s = await session(location.hash.slice(1), app); } catch { /* reported after the strings are loaded */ }
// A meeting link opens the tool, then the address bar shows the tool link instead, so copying the
// address leaks this tool only. The meeting secret stays in this tab (sessionStorage) so the header
// keeps linking the other tools across navigation and reloads; the landing page keeps it in its URL.
if (s && app !== 'home') {
  if (s.meeting) { sessionStorage.setItem('meeting', s.meeting); history.replaceState(null, '', `${location.pathname}${location.search}#~${s.tool}${s.extra ? '.' + s.extra : ''}`); }
  else { const m = sessionStorage.getItem('meeting'); if (m) { try { const full = await session(m + (s.extra ? '.' + s.extra : ''), app); if (full.tool === s.tool) s = full; } catch { /* not this meeting */ } } }
}
export const sess = s as Session;   // null only on a malformed link; start() stops there
/** A sibling tool of this meeting, with the meeting secret: the header's links. Empty secret from a tool link. */
export const linkTo = (other: string, query = '') => `/${other === 'home' ? '' : other + '/'}${query}#${sess?.meeting ?? ''}`;
/** What Copy link and the QR hand out: this tool only. */
export const shareLink = () => location.origin + location.pathname + location.search + '#~' + sess.tool;
export const fromSibling = (origin: string) => origin === location.origin;

// --- header: title, status, tools (the app's), name, navigation ---
export const title = (text: string) => { $('title').textContent = text; document.title = text && text !== config.name ? `${text} · ${config.name}` : config.name; };
export const status = (text: string) => { $('hstatus').textContent = text; };
export const tools = $('tools');     // the app's own controls, left of the toolbar
export const actions = $('actions'); // right: the app's extra actions, then New and Copy link, the same on every page
export const nameOf = () => localStorage.getItem('name') || '';
/** This browser's memory of small facts (an answer sent, a name): read with one argument, write with two. */
export function memo(key: string, value?: unknown): unknown {
  if (value === undefined) { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  return value;
}
/** Show the toolbar's name field; `onChange` runs when the person edits it. */
export function askName(onChange?: (name: string) => void) {
  const input = $<HTMLInputElement>('name'), chip = $('namechip');
  $('namebox').hidden = false; input.value = nameOf(); chip.textContent = nameOf() || t('guest');
  input.onchange = () => { localStorage.setItem('name', input.value.trim().slice(0, 40)); chip.textContent = nameOf() || t('guest'); onChange?.(nameOf()); };
  $('namepop').addEventListener('toggle', e => { if ((e as ToggleEvent).newState === 'open') input.focus(); });
}

/** The button that copies a pad's or share's read-only link. */
export function viewLinkButton(link: () => string) { const b = el('button', t('viewLink')); b.id = 'viewlink'; copyLink(b, link, 'viewCopied'); return b; }

/** Called once by the app module: mounts its template, builds the header, translates the page, returns the root. */
export function start(): HTMLElement {
  const tpl = document.getElementById('tpl-' + app) as HTMLTemplateElement | null;
  const mount = $('app');
  if (!(config.apps.includes(app) || app === 'home') || !tpl) { mount.append(el('p', t('noApp'))); throw new Error('no such app'); }
  mount.append(tpl.content.cloneNode(true));
  $<HTMLAnchorElement>('homelink').href = sess?.meeting ? '/#' + sess.meeting : '/';
  if (!sess?.meeting) $('nav').hidden = true;   // a tool link: nothing else of the meeting to point to
  for (const other of config.apps) { const a = el('a', t('app_' + other)); a.href = linkTo(other); if (other === app) a.setAttribute('aria-current', 'page'); $('nav').append(a); }   // fixed order, current marked
  $<HTMLAnchorElement>('new').href = location.pathname;   // a fresh key for the same app
  copyLink($('copy'), shareLink);
  $('qrpop').addEventListener('toggle', e => { if ((e as ToggleEvent).newState === 'open') { drawQr($<HTMLCanvasElement>('qrcanvas'), shareLink()); $('qrtext').textContent = shareLink(); } });
  translate();
  title(config.name);
  if (config.logo) { const img = el('img'); img.src = config.logo; img.alt = ''; img.className = 'logo'; $('homelink').prepend(img); }
  $('loading').remove();
  if (embedded) {   // tell the embedding page our height: on load and when it changes (resize notices need a rendering tab, the timers do not)
    $('hdr').hidden = true; document.body.classList.add('embedded');
    const report = () => parent.postMessage({embedHeight: document.documentElement.scrollHeight}, '*');   // the parent checks our origin; nothing secret travels
    new ResizeObserver(report).observe(document.body);
    addEventListener('load', report); setTimeout(report, 1500); setTimeout(report, 4000);
  }
  if (!sess) { status(t('invalidKey')); throw new Error('bad key'); }
  return mount;
}

/** A room of this meeting: relay, roster (with our name), sync and store, not yet connected.
 *  `roomApp` names whose room: this app's by default, or a sibling's (the pad opens the share room for attachments). */
export async function join(name: string, roomApp = app, server = '', keys: {sig?: CryptoKey | null; storeRaw?: Uint8Array<ArrayBuffer>; roomId?: string} = {}): Promise<Core> {
  const origin = server || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  const sig = new Signaling(keys.sig === undefined ? await sess.key(`${roomApp}/signaling`) : keys.sig, roomApp, keys.roomId ?? await sess.roomId(roomApp), origin);
  const roster = new Roster(sig, await ecdhKeypair(), name || t('guest'));
  const core = {sig, roster, bus: new Bus(), store: new Store(sig, await storeKeys(keys.storeRaw ?? sess.raw, `${roomApp}/store`))} as Core;
  core.sync = new Sync(core);
  return core;
}

/** A room with two links. The meeting key edits; V = HKDF(key, "<app>/view") only reads, and the
 *  room and its store hang off V. Editors sign what they publish with a key pair kept in a head
 *  sealed under the meeting key (its public half under V), so a reader lists exactly what editors
 *  wrote and can forge nothing. `viewing`: this page holds V only (the ?view link). */
export type Signed = {core: Core; V: Uint8Array<ArrayBuffer>; viewing: boolean; keyed: boolean; sign?: (payload: string) => Promise<string>; verify?: (payload: string, sig: string) => Promise<boolean>; viewLink: string};
export async function joinSigned(name: string, roomApp = app, viewing = params.has('view')): Promise<Signed> {
  const V = viewing ? sess.raw : await sess.derive(`${roomApp}/view`);
  const roomId = await sha256hex(`${roomApp}:${b64u.enc(V)}`);
  const core = await join(name, roomApp, '', {sig: viewing ? null : undefined, storeRaw: V, roomId});
  const HEAD_PRIV = '1'.repeat(32), HEAD_PUB = '2'.repeat(32);
  let keys: SignKeys | null = null, pub: JsonWebKey | null = null;
  if (!viewing) {
    const head = new Store(core.sig, await storeKeys(sess.raw, `${roomApp}/head`));
    keys = (await head.get(HEAD_PRIV)) as SignKeys | null;
    if (!keys?.priv || !keys.pub) {
      const fresh = await signKeypair();
      let st = await head.put(HEAD_PRIV, fresh);
      for (let wait = 1; st === 429 && wait <= 4; wait++) { await new Promise(r => setTimeout(r, wait * 1000)); st = await head.put(HEAD_PRIV, fresh); }   // the address is in a rate window (a burst from the same network): wait it out
      if (st === 201) keys = fresh;
      else keys = st === 409 ? (await head.get(HEAD_PRIV)) as SignKeys | null : null;   // someone else created it meanwhile, or the store refused
      if (!keys?.priv) { status(t('createFailed', {status: st})); throw new Error('no editor key'); }
    }
    pub = keys.pub;
    // The public key readers verify with lives in the room, first come first served. It must be ours before
    // anyone gets a view link: published now if missing (a rate limit is retried), and if the slot holds
    // another key the pad is not ours to vouch for.
    const published = async () => JSON.stringify(((await core.store.get(HEAD_PUB)) as {pub?: JsonWebKey} | null)?.pub) === JSON.stringify(pub);
    for (let tries = 0; !(await published()); tries++) {
      const st = await core.store.put(HEAD_PUB, {pub});
      if (st === 201) break;
      if (st === 409) { if (await published()) break; status(t('keyTaken')); throw new Error('foreign key'); }
      if (tries >= 3) { status(t('createFailed', {status: st})); throw new Error('no public key'); }
      await new Promise(r => setTimeout(r, 1000 * (tries + 1)));
    }
  } else pub = ((await core.store.get(HEAD_PUB)) as {pub?: JsonWebKey} | null)?.pub ?? null;
  const k = keys, p = pub;
  // A reader without the key verifies nothing and so shows nothing: unsigned content is never shown as the editors'.
  const check = p ? (payload: string, sig: string) => verify(p, sig, payload) : viewing ? async () => false : undefined;
  return {core, V, viewing, keyed: !!p, ...(k && {sign: (payload: string) => sign(k.priv, payload)}), ...(check && {verify: check}), viewLink: `${location.origin}/${roomApp}/?view#~${b64u.enc(V)}`};
}
