// Comment threads on a pad, anchored to a range of its text. A thread is a sealed blob in the
// pad's room (slot 3333 + 28 hex), its replies are dotted slots after it, so everything is write-
// once and readers of the view link see and answer threads too. An anchor is the quoted text with
// a little context on each side: live edits move it with the ops (mapPos), a fresh load finds it
// again by its words, and a thread whose words are gone says so instead of pointing anywhere.
import {t} from '../core/i18n.js';
import {mapPos, type Op} from '../core/ot.js';
import type {Store, Entry} from '../core/store.js';
import {$, el} from './dom.js';

export type Post = {by: string; text: string; at: number; resolved?: boolean};
export type Thread = {slot: string; quote: string; before: string; after: string; posts: Post[]; pos: {from: number; to: number} | null; resolved: boolean};
const PREFIX = '3333', CTX = 24, MAX = 2000;
const isHead = (x: unknown): x is {quote: string; before: string; after: string; by: string; text: string} => { const h = x as Record<string, unknown>; return !!h && typeof h === 'object' && typeof h['quote'] === 'string' && typeof h['before'] === 'string' && typeof h['after'] === 'string' && typeof h['by'] === 'string' && (h['by'] as string).length <= 80 && (h['quote'] as string).length <= MAX && typeof h['text'] === 'string' && (h['text'] as string).length <= MAX; };
const isReply = (x: unknown): x is {by: string; text: string; resolved?: boolean} => { const r = x as Record<string, unknown>; return !!r && typeof r === 'object' && typeof r['by'] === 'string' && (r['by'] as string).length <= 80 && typeof r['text'] === 'string' && (r['text'] as string).length <= MAX && (r['resolved'] === undefined || typeof r['resolved'] === 'boolean'); };

/** `text()` is the live document; `me()` the name to sign with; `select(from, to)` shows a range in the editor (null when reading only). */
export function comments(store: Store, panel: HTMLElement, text: () => string, me: () => string, select: ((from: number, to: number) => void) | null, repaint: () => void) {
  const threads = new Map<string, Thread>(), cache = new Map<string, unknown>();
  const lang = document.documentElement.lang;
  const blob = async (slot: string) => { if (!cache.has(slot)) cache.set(slot, await store.get(slot)); return cache.get(slot); };
  /** Where a thread's words are now: with their context first, then the words alone. */
  const locate = (th: Thread) => {
    const doc = text(); let i = doc.indexOf(th.before + th.quote + th.after);
    if (i >= 0) i += th.before.length; else i = th.quote ? doc.indexOf(th.quote) : -1;
    th.pos = i >= 0 ? {from: i, to: i + th.quote.length} : null;
  };
  async function load() {
    const entries = (await store.list()).filter(e => e.slot.startsWith(PREFIX));
    const heads = entries.filter(e => !e.slot.includes('.')), replies = new Map<string, Entry[]>();
    for (const e of entries) if (e.slot.includes('.')) { const [h] = e.slot.split('.'); replies.set(h!, [...(replies.get(h!) ?? []), e]); }
    for (const e of heads) {
      const h = await blob(e.slot); if (!isHead(h)) continue;
      const th: Thread = threads.get(e.slot) ?? {slot: e.slot, quote: h.quote, before: h.before, after: h.after, posts: [], pos: null, resolved: false};
      const posts: Post[] = [{by: h.by, text: h.text, at: e.at}];   // built apart, then swapped in: two loads can overlap (own put, then the change notice)
      for (const r of (replies.get(e.slot) ?? []).sort((a, b) => +a.slot.split('.')[1]! - +b.slot.split('.')[1]!)) { const p = await blob(r.slot); if (isReply(p)) posts.push({by: p.by, text: p.text, at: r.at, resolved: p.resolved}); }
      th.posts = posts;
      th.resolved = [...th.posts].reverse().find(p => p.resolved !== undefined)?.resolved ?? false;
      if (!threads.has(e.slot) || !th.pos) locate(th);
      threads.set(e.slot, th);
    }
    render(); repaint();
  }
  /** Every op, local or remote, moves the anchors; a thread whose words were deleted is found again by them later. */
  function map(op: Op) {
    const doc = text(); let lost = false;   // the document after the op
    for (const th of threads.values()) if (th.pos) { const from = mapPos(th.pos.from, op), to = mapPos(th.pos.to, op); th.pos = to > from && doc.slice(from, to) === th.quote ? {from, to} : null; if (!th.pos) { locate(th); lost ||= !th.pos; } }   // a replace of the words themselves maps onto the new text: not the quote any more
    if (lost) render();
  }
  /** Which characters a thread covers, for the editor's layer. */
  function cover(len: number): (string | undefined)[] { const out: (string | undefined)[] = new Array(len); for (const th of threads.values()) if (th.pos && !th.resolved) for (let i = th.pos.from; i < Math.min(len, th.pos.to); i++) out[i] = th.slot; return out; }
  /** A new thread on a range of the live text. */
  async function add(from: number, to: number, body: string) {
    const doc = text(), quote = doc.slice(from, to); if (!quote.trim() || !body.trim()) return false;
    const head = {quote, before: doc.slice(Math.max(0, from - CTX), from), after: doc.slice(to, to + CTX), by: me(), text: body.trim().slice(0, MAX)};
    const slot = PREFIX + [...crypto.getRandomValues(new Uint8Array(14))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (await store.put(slot, head) !== 201) return false;
    await load(); return true;
  }
  async function reply(th: Thread, body: string, resolved?: boolean) {
    const post = {by: me(), text: body.trim().slice(0, MAX), ...(resolved !== undefined && {resolved})};
    for (let n = th.posts.length, tries = 0; tries < 5; n++, tries++) if (await store.put(`${th.slot}.${n}`, post) === 201) { await load(); return true; }   // 409: someone replied at the same time, take the next number
    return false;
  }
  function render() {
    const list = $('threadlist'), open = [...threads.values()].filter(th => !th.resolved).sort((a, b) => (a.pos?.from ?? 1e9) - (b.pos?.from ?? 1e9)), done = [...threads.values()].filter(th => th.resolved);
    list.replaceChildren(...open.map(card));
    $('threadsempty').hidden = open.length > 0;
    const resolvedBox = $('resolved'); resolvedBox.hidden = !done.length; resolvedBox.querySelector('summary')!.textContent = t('resolvedN', {n: done.length}); resolvedBox.querySelector('div')!.replaceChildren(...done.map(card));
    panel.dataset['count'] = String(open.length);
  }
  function card(th: Thread) {
    const d = el('article', undefined, 'thread'); d.dataset['slot'] = th.slot;
    const q = el('button', th.quote.length > 60 ? th.quote.slice(0, 60) + '…' : th.quote, 'quote'); q.type = 'button'; q.disabled = !select || !th.pos; q.title = th.pos ? '' : t('textChanged');
    if (select) q.onclick = () => { if (th.pos) select(th.pos.from, th.pos.to); };
    d.append(q);
    if (!th.pos) d.append(el('small', t('textChanged')));
    for (const p of th.posts) { const post = el('div', undefined, 'post'); post.append(el('b', p.by || t('guest')), el('small', ' · ' + new Date(p.at).toLocaleString(lang, {dateStyle: 'short', timeStyle: 'short'})), el('p', p.text)); if (p.resolved !== undefined) post.classList.add(p.resolved ? 'marks-resolved' : 'marks-reopened'); if (p.text || p.resolved === undefined) d.append(post); }
    const form = el('form', undefined, 'replyform'), input = el('input'), send = el('button', t('reply')), toggle = el('button', t(th.resolved ? 'reopen' : 'resolve'), 'link');
    input.maxLength = MAX; input.placeholder = t('reply'); input.ariaLabel = t('reply'); send.type = 'submit'; toggle.type = 'button';
    form.onsubmit = async e => { e.preventDefault(); if (input.value.trim()) { send.disabled = true; await reply(th, input.value); } };
    toggle.onclick = () => reply(th, '', !th.resolved);
    form.append(input, send, toggle); d.append(form);
    return d;
  }
  { const prev = store.onChange; store.onChange = e => { prev?.(e); if (e.slot.startsWith(PREFIX)) { cache.delete(e.slot); load(); } }; }
  load();
  return {add, map, cover, relocate: () => { for (const th of threads.values()) if (!th.pos) locate(th); }};
}
