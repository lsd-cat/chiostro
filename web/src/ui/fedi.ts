// Fediverse cards in rendered markdown, for any tool with a room store: a snapshot of the
// object's public JSON, sealed in the room under a slot that starts with the URL's hash (newest
// wins). Editors take and refresh snapshots; everyone renders them; readers never contact the instance.
import {t} from '../core/i18n.js';
import {recognise, toCard, isCard, type Card} from '../core/fedi.js';
import {stamp, type Store} from '../core/store.js';
import {sha256hex} from '../core/crypto.js';
import {el} from './dom.js';

const SNAP_AGE = 10 * 60 * 1000;
/** Returns the resolver to call on a rendered root; `repaint` re-renders after a refresh. */
export function fediCards(store: Store, viewing: boolean, repaint: () => void) {
  const lang = document.documentElement.lang;
  const snapshots = new Map<string, {card: Card; at: number} | null>();   // url -> newest snapshot this session saw
  const refreshing = new Set<string>();
  const prefix = async (url: string) => (await sha256hex(url)).slice(0, 24);
  async function latest(url: string): Promise<{card: Card; at: number} | null> {
    const p = await prefix(url);
    for (const e of (await store.list()).filter(e => e.slot.startsWith(p) && !e.slot.includes('.')).reverse()) { const v = (await store.get(e.slot)) as {card?: unknown} | null; if (v && isCard(v.card) && v.card.url === url) return {card: v.card, at: e.at}; }
    return null;
  }
  async function take(url: string): Promise<boolean> {
    const src = recognise(url); if (!src) return false;
    try {
      const res = await fetch(src.api, {headers: {Accept: src.platform === 'mobilizon' ? 'application/activity+json' : 'application/json'}});
      const card = res.ok ? toCard(src, await res.json()) : null;
      if (!card) return false;
      const have = snapshots.get(url);
      if (have && JSON.stringify(have.card) === JSON.stringify(card)) { snapshots.set(url, {card, at: Date.now()}); return true; }   // unchanged: nothing new to store
      return (await store.put((await prefix(url)) + stamp(), {card})) === 201;
    } catch { return false; }
  }
  function card(c: Card, at: number, url: string) {
    const d = el('article', undefined, `card fedi-card ${c.kind}`);
    const head = el('div', undefined, 'fedi-head');
    head.append(el('span', t(c.kind === 'post' ? 'fediPost' : c.kind === 'video' ? 'fediVideo' : c.kind === 'profile' ? 'fediProfile' : 'fediEvent'), 'badge-soft'), el('small', new URL(url).host));
    const h = el('h3'); const a = el('a', c.title || url); a.href = url; a.target = '_blank'; a.rel = 'noopener'; h.append(a);
    d.append(head, h);
    if (c.by) d.append(el('small', c.by));
    if (c.kind === 'event' && c.at) d.append(el('p', `${new Date(c.at).toLocaleString(lang, {dateStyle: 'full', timeStyle: 'short'})}${c.end ? ' – ' + new Date(c.end).toLocaleString(lang, {dateStyle: 'short', timeStyle: 'short'}) : ''}${c.place ? ' · ' + c.place : ''}`, 'fedi-when'));
    if (c.text) d.append(el('p', c.text.length > 600 ? c.text.slice(0, 600) + '…' : c.text, 'fedi-text'));
    const foot = el('div', undefined, 'fedi-foot');
    const open = el('a', t('open'), 'button'); open.href = url; open.target = '_blank'; open.rel = 'noopener';
    foot.append(open, el('small', t('snapAt', {when: new Date(at).toLocaleString(lang, {dateStyle: 'short', timeStyle: 'short'})})));
    if (!viewing) { const r = el('button', t('refresh')); r.className = 'link'; r.onclick = async () => { r.disabled = true; if (await take(url)) { snapshots.delete(url); repaint(); } else r.disabled = false; }; foot.append(r); }
    d.append(foot);
    return d;
  }
  store.onChange = (prev => e => { prev?.(e); if (!e.slot.includes('.')) snapshots.clear(); })(store.onChange);
  return async function resolve(root: HTMLElement) {
    for (const box of root.querySelectorAll<HTMLElement>('.fedi[data-fedi]')) {
      const url = box.dataset['fedi']!;
      let snap = snapshots.has(url) ? snapshots.get(url)! : await latest(url);
      if (!viewing && (!snap || Date.now() - snap.at > SNAP_AGE) && !refreshing.has(url)) {   // editors keep snapshots fresh
        refreshing.add(url);
        if (await take(url)) snap = await latest(url); else if (!snap) { box.append(el('small', t('snapFail'))); refreshing.delete(url); snapshots.set(url, null); continue; }
        refreshing.delete(url);
      }
      snapshots.set(url, snap);
      if (!snap) { box.append(el('small', t('noSnap'))); continue; }
      box.replaceChildren(card(snap.card, snap.at, url));
    }
  };
}
