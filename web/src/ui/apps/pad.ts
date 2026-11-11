// Pad: markdown (or, once converted, LaTeX) textarea with a coloured layer behind it, live preview,
// slides, presence and other editors' carets, history, attachments, comments. Collaboration and
// persistence are core/doc.ts on this pad's room; attachments and comment threads live in the same room.
import {t} from '../../core/i18n.js';
import {Doc, text as textAlgebra} from '../../core/doc.js';
import {Files} from '../../core/files.js';
import {diff, apply, mapPos, annotate, type Op} from '../../core/ot.js';
import {hex, b64u, sha256hex, verify} from '../../core/crypto.js';
import {Store, storeKeys} from '../../core/store.js';
import {Signaling} from '../../core/signaling.js';
import {render, slides, frontMatter, title as mdTitle, type Node as MdNode} from '../../core/md.js';
import {theme as themeVars} from '../../core/config.js';
import {toTeX, type Attachment} from '../../core/tex.js';
import {classes} from '../../core/highlight.js';
import {comments} from '../comments.js';
import {start, joinSigned, viewLinkButton, askName, nameOf, title, status, tools, actions, params, linkTo, fromSibling, sess, config} from '../shell.js';
import {fediCards} from '../fedi.js';
import {$, el, css, tree, download, embedApps, listenEmbeds, icon, dropZone} from '../dom.js';
import {uploadQueue, bytesLabel} from '../widgets.js';

css('/css/pad.css');
start();
const embedLink = (app: string, hash: string, query: string) => linkTo(app, query).replace(/#.*$/, hash);   // the embedded tool, with the key the markdown names
listenEmbeds(fromSibling);
const lang = document.documentElement.lang;
// Two links: the edit link carries the pad secret E; the view link carries V = HKDF(E), from which E
// cannot be computed. Live edits are sealed under E, checkpoints under V and signed with a key only
// editors can read (the head, sealed under E), so a viewer can read every version and forge none.
const viewing = params.has('view');
if (viewing) document.body.classList.add('viewing'); else askName(() => location.reload());

// --- header tools ---
const main = $('padmain');
const views = el('div', undefined, 'segmented'); views.setAttribute('role', 'radiogroup'); views.ariaLabel = t('viewMode');
for (const v of ['edit', 'both', 'view', 'slides'] as const) {
  const l = el('label'), r = el('input'); r.type = 'radio'; r.name = 'view'; r.value = v; r.checked = v === 'both';
  l.append(r, el('span', t(v))); views.append(l);
  r.onchange = () => { const go = () => { main.dataset['view'] = v; paint(); }; const tr = document.hidden ? null : document.startViewTransition?.(go); if (tr) tr.ready.catch(() => {}); else go(); if (v === 'edit' || v === 'both') editor.focus(); };   // a hidden tab cannot animate: just switch
}
const present = el('button'); present.id = 'present'; present.append(icon('play'), el('span', t('present'))); present.ariaLabel = t('presentLabel');
const attach = el('button'), fileInput = el('input'); attach.append(icon('clip'), el('span', t('attach'))); attach.id = 'attach'; fileInput.id = 'attachfile'; fileInput.multiple = true; fileInput.type = 'file'; fileInput.hidden = true; fileInput.ariaLabel = t('attach');
const hist = el('select'); hist.id = 'history'; hist.ariaLabel = t('historyLabel'); hist.append(new Option(t('history'), ''));
const colors = el('button'); colors.append(icon('palette'), el('span', t('colors'))); colors.id = 'colors'; colors.ariaPressed = 'false';   // off until asked: a one-author pad should not be a wall of tint
colors.onclick = () => { colors.ariaPressed = String(colors.ariaPressed !== 'true'); marks.classList.toggle('authors', colors.ariaPressed === 'true'); };
const dl = el('button'); dl.append(icon('download'), el('span', t('downloadMd'))); dl.id = 'download';
const pdf = el('button'); pdf.append(icon('print'), el('span', t('pdf'))); pdf.id = 'pdf'; pdf.title = t('pdfLabel'); pdf.ariaLabel = t('pdfLabel');
const texBtn = el('button'); texBtn.append(icon('doc'), el('span', 'LaTeX')); texBtn.id = 'totex'; texBtn.title = t('toTex'); texBtn.ariaLabel = t('toTex');
const filesBtn = el('button'); filesBtn.append(icon('clip'), el('span', t('filesPanel'))); filesBtn.id = 'filesb'; filesBtn.ariaPressed = 'false';
const commentsBtn = el('button'); commentsBtn.append(icon('chat'), el('span', t('comments'))); commentsBtn.id = 'commentsb'; commentsBtn.ariaPressed = 'false';
// one side panel at a time: files or comments
const side = (which: 'files' | 'comments' | '') => { main.dataset['side'] = which; if (!which) delete main.dataset['side']; $('padfiles').hidden = which !== 'files'; $('padcomments').hidden = which !== 'comments'; filesBtn.ariaPressed = String(which === 'files'); commentsBtn.ariaPressed = String(which === 'comments'); };
filesBtn.onclick = () => side(filesBtn.ariaPressed === 'true' ? '' : 'files');
commentsBtn.onclick = () => side(commentsBtn.ariaPressed === 'true' ? '' : 'comments');
if (!viewing) { tools.append(views, present, attach, fileInput, hist, colors, texBtn, filesBtn, commentsBtn); actions.prepend(dl, pdf); } else { main.dataset['view'] = 'view'; tools.append(filesBtn, commentsBtn); actions.prepend(pdf); }

// --- editor and preview ---
const editor = $<HTMLTextAreaElement>('editor'), preview = $('preview'), marks = $('marks');
const editwrap = $('editwrap');   // the layer always shows the text, coloured by syntax; author tints are a class on it
// Authorship, like Etherpad: one author per character, following every op, and a layer behind the
// textarea that highlights runs in the author's colour (a hue from the name, the same on every screen).
let authors: string[] = [];   // per character: "<name>\u001f<browser id>", so two Guests still get two colours
const AUTHOR = localStorage.getItem('author') || hex(crypto.getRandomValues(new Uint8Array(4)));
localStorage.setItem('author', AUTHOR);
const me = () => `${nameOf() || t('guest')}\u001f${AUTHOR}`;
const authorOf = new Map<number, string>();   // peer id -> author key, announced on join
const hue = (key: string) => { let h = 0; for (const ch of key) h = (h * 31 + ch.codePointAt(0)!) >>> 0; return h % 360; };
// other editors' carets and selections: announced on every move, mapped through the ops in between
const cursors = new Map<number, {from: number; to: number}>();
const peerHue = (id: number) => hue(authorOf.get(id) ?? core.roster.nameOf(id));
const caretEl = (id: number) => { const c = el('span', undefined, 'caret'); c.dataset['who'] = core.roster.nameOf(id); c.style.setProperty('--hue', String(peerHue(id))); return c; };
let painted = new Map<string, HTMLElement[]>();   // the layer's lines from the last paint, by what they show: a keystroke rebuilds one line, the rest are reused
const paintMarks = () => {
  const text = shown + '\n', cls = classes(shown, isTex(shown) ? 'tex' : 'md'), cm = threads?.cover(shown.length) ?? [];   // the extra newline keeps the layer as tall as the textarea
  const sel: (number | undefined)[] = [], carets = new Map<number, number[]>();   // per character: whose selection; per position: whose carets
  for (const [id, r] of cursors) { for (let i = r.from; i < r.to; i++) sel[i] = id; carets.set(r.to, [...(carets.get(r.to) ?? []), id]); }
  const lines: HTMLElement[] = [], next = new Map<string, HTMLElement[]>(), names = new Set<string>();
  for (let i = 0; i < text.length;) {
    const end = text.indexOf('\n', i) + 1;   // this line, newline included
    const runs: [number, number, string, string, string | undefined, number | undefined][] = [];
    for (let p = i; p < end;) {
      const who = authors[p] ?? '', c = cls[p] ?? '', k = cm[p], s = sel[p]; let q = p + 1;
      while (q < end && (authors[q] ?? '') === who && (cls[q] ?? '') === c && cm[q] === k && sel[q] === s && !carets.has(q)) q++;
      runs.push([p, q, who, c, k, s]); if (who) names.add(who.split('\u001f')[0]!); p = q;
    }
    const key = text.slice(i, end) + '\u0000' + runs.map(([p, q, who, c, k, s]) => `${q - p}:${who}:${c}:${k ?? ''}:${s ?? ''}`).join(',') + '\u0000' + runs.map(([p]) => (carets.get(p) ?? []).join('/')).join(',');
    let line = painted.get(key)?.pop();
    if (!line) {
      line = el('div', undefined, 'ln');
      for (const [p, q, who, c, k, s] of runs) {
        for (const id of carets.get(p) ?? []) line.append(caretEl(id));
        const span = el('span', text.slice(p, q), [c ? 'tk-' + c : '', k ? 'cm' : '', s !== undefined ? 'rsel' : ''].join(' ').trim() || undefined);
        if (who) { span.style.setProperty('--hue', String(hue(who))); span.dataset['who'] = who.split('\u001f')[0]!; } if (k) span.dataset['thread'] = k; if (s !== undefined) span.style.setProperty('--sel', String(peerHue(s)));
        line.append(span);
      }
    }
    next.set(key, [...(next.get(key) ?? []), line]); lines.push(line); i = end;
  }
  painted = next;
  const old = [...marks.children];   // a snapshot: the live collection is walked from the start on every index after a change
  if (old.length === lines.length) { for (let n = 0; n < lines.length; n++) if (old[n] !== lines[n]) marks.replaceChild(lines[n]!, old[n]!); }   // the usual keystroke: one line swapped
  else marks.replaceChildren(...lines);
  marks.ariaLabel = names.size ? t('wroteBy', {names: [...names].join(', ')}) : null;
};
editor.onscroll = () => { marks.scrollTop = editor.scrollTop; marks.scrollLeft = editor.scrollLeft; };
editor.placeholder = t('placeholder');
// The page already has its h1 (the title in the header), so the document's own headings sit one level down: # is h2.
const demote = (x: MdNode): MdNode => typeof x === 'string' ? x : {...x, t: /^h[1-5]$/.test(x.t) ? 'h' + (+x.t[1]! + 1) : x.t, c: x.c.map(demote)};
let shown = '';   // what the editor currently holds, to diff against
let threads: ReturnType<typeof comments> | undefined;   // set once the room is joined; the layer and the ops consult it
const MAX_INSERT = 48 * 1024;   // characters per op; sealed and base64'd it stays well under the relay's frame cap
let previewTimer = 0;
const paint = (text = shown) => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const view = main.dataset['view'];
    main.dataset['mode'] = isTex(text) ? 'tex' : 'md'; present.hidden = isTex(text);
    if (isTex(text)) { if (view === 'slides') main.dataset['view'] = 'both'; contents(null); title(/\\title\{([^}]*)\}/.exec(text)?.[1] || t('untitledPad')); texPreview(text); return; }
    const {vars, body} = frontMatter(text);   // "---\naccent: #c00\n---" at the top themes the rendered page
    const parts = view === 'slides' ? slides(text).map(s => { const d = el('section', undefined, 'slide'); for (const b of render(s)) d.append(tree(demote(b))); return d; }) : render(body).map(b => tree(demote(b)));
    preview.replaceChildren(...parts);
    const target = viewing ? document.documentElement : preview;   // the whole page when it is the document, else just the preview
    for (const v of ['bg', 'panel', 'panel-2', 'fg', 'muted', 'border', 'accent', 'accent-fg', 'accent-hover', 'radius', 'radius-panel', 'font', 'h1-weight']) target.style.removeProperty('--' + v);
    for (const [k, v] of Object.entries(themeVars(vars))) target.style.setProperty('--' + k, v);
    resolveFiles(preview); embedApps(preview, embedLink); resolveFedi(preview);
    contents(view === 'view' || !!viewing ? preview : null);
    title(mdTitle(body) || t('untitledPad'));
  }, 120) as unknown as number;
};

// A table of contents from the headings, beside the rendered document (view mode and the read-only page);
// clicking scrolls instead of changing the hash, which is the key. The visible section is marked.
let sections: IntersectionObserver | undefined;
function contents(root: HTMLElement | null) {
  const toc = $('toc'), hs = root ? [...root.querySelectorAll<HTMLElement>('h2, h3, h4')].filter(h => !h.closest('.fedi-card')) : [];   // card titles are not sections
  sections?.disconnect(); toc.hidden = hs.length < 2;
  if (toc.hidden) return;
  const ul = el('ul');
  hs.forEach((h, i) => { h.id = 's-' + i; const a = el('a', h.textContent || ''); a.href = '#s-' + i; a.onclick = e => { e.preventDefault(); h.scrollIntoView({block: 'start'}); }; const li = el('li', undefined, 'l' + (+h.tagName[1]! - 1)); li.append(a); ul.append(li); });
  toc.replaceChildren(ul);
  sections = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { for (const a of toc.querySelectorAll('a')) a.removeAttribute('aria-current'); toc.querySelector(`a[href="#${e.target.id}"]`)?.setAttribute('aria-current', 'true'); } }, {root: preview, rootMargin: '0px 0px -70% 0px'});
  for (const h of hs) sections.observe(h);
}

// --- the shared document, and the meeting's files for attachments ---
const signed = await joinSigned(nameOf(), 'pad', viewing), core = signed.core;
if (!viewing) pdf.after(viewLinkButton(() => signed.viewLink));   // only once the room's key is ours to vouch for
const doc = new Doc(core, core.store, textAlgebra, '');
doc.sign = signed.sign; doc.verify = signed.verify;
doc.extra = () => { const runs: [string, number][] = []; for (const a of authors) { const last = runs[runs.length - 1]; if (last && last[0] === a) last[1]++; else runs.push([a, 1]); } return runs; };
doc.onExtra = x => { authors = []; if (Array.isArray(x)) for (const r of x as [string, number][]) if (Array.isArray(r) && typeof r[0] === 'string' && Number.isInteger(r[1])) for (let k = 0; k < r[1]; k++) authors.push(r[0]); authors.length = doc.state.length; };   // painted once the editor shows the text
await doc.load();
const files = new Files(core.store);   // attachments live in the pad's own room, readable with the view link
if (!viewing) files.deleteKey = async id => hex(await sess.derive(`pad/delete/${id}`, 32));   // editors can remove; the token never leaves the browser until a removal

// ---------- LaTeX: the engine, a compiled preview, the PDF export, includes ----------
// tstex, pdfTeX in TypeScript, runs in a worker; its TeX Live files come from `config.texmf`. A pad whose text
// starts with \documentclass is a LaTeX pad: the preview is the compiled PDF and the PDF button downloads it.
// A markdown pad is converted on the fly for its export. Attachments reach TeX under their id and their name;
// \input{pad:<tool link>} pulls another pad in (converted when it is markdown).
const isTex = (s: string) => /^\s*\\documentclass/.test(s);
type Tstex = {createTeX(o: {texmf: string; cache: 'persistent'}): {prefetch(names: string[]): Promise<void>; compile(o: {files: Record<string, string | Uint8Array>; main: string; runs: 'auto'; onProgress: (p: {type: string}) => void}): Promise<{ok: boolean; pdf: Uint8Array | null; log: string}>}};
const TSTEX = '/vendor/tstex/index.js';
let tex: ReturnType<Tstex['createTeX']> | null = null;
async function compileTex(source: string, extra: Record<string, Uint8Array>, note: (s: string) => void): Promise<{ok: boolean; pdf: Uint8Array | null; log: string}> {
  if (!tex) {
    tex = ((await import(TSTEX)) as Tstex).createTeX({texmf: config.texmf, cache: 'persistent'});
    // After the first engine start, pull the whole minimal set (fonts, base classes, the common packages, ~8 MB) into the
    // engine's persistent cache in parallel, so later documents compile without a fetch per file.
    fetch('/texmf-prefetch.json').then(r => r.json()).then((names: string[]) => tex!.prefetch(names)).catch(() => {});
  }
  let fetched = 0;
  return tex.compile({files: {'main.tex': source, ...extra}, main: 'main.tex', runs: 'auto', onProgress: p => { if (p.type === 'fetch') note(t('typesetting', {n: ++fetched})); }});
}
/** An image TeX cannot read (WebP, GIF, SVG, ...) drawn to a canvas and re-encoded as PNG. */
const asPng = async (b: Blob): Promise<Blob | null> => { try { const bmp = await createImageBitmap(b); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d')!.drawImage(bmp, 0, 0); return await new Promise<Blob | null>(r => c.toBlob(r, 'image/png')); } catch { return null; } };
const toBytes = async (name: string, b: Blob): Promise<Attachment | null> => { const blob = /^image\/(png|jpeg)$|^application\/pdf$/.test(b.type) || !b.type.startsWith('image/') ? b : await asPng(b); return blob ? {name, type: blob.type, bytes: new Uint8Array(await blob.arrayBuffer())} : null; };
/** What a document refers to: attachments (by id, and by name for a LaTeX pad), hot-linked images whose host allows reads, and other pads. */
async function gather(text: string): Promise<{att: Map<string, Attachment>; extra: Record<string, Uint8Array>; text: string}> {
  const att = new Map<string, Attachment>(), extra: Record<string, Uint8Array> = {};
  for (const f of await files.list()) {
    if (!text.includes(f.id) && !text.includes(f.name)) continue;
    const b = await fileBlob(f.id), a = b && await toBytes(f.name, b); if (!a) continue;
    att.set(f.id, a); extra[f.name] = a.bytes; extra[`${f.id}.${a.type === 'image/png' ? 'png' : a.type === 'image/jpeg' ? 'jpg' : f.name.split('.').pop() || 'bin'}`] = a.bytes;
  }
  for (const src of new Set([...text.matchAll(/!\[[^\]]*\]\((https:[^)\s]+)\)/g)].map(m => m[1]!))) { try { const res = await fetch(src, {mode: 'cors'}); const a = res.ok && await toBytes(src.split('/').pop() || 'image', await res.blob()); if (a) att.set(src, a); } catch { /* no CORS: a link in the PDF */ } }
  for (const m of [...text.matchAll(/\\input\{pad:(~?[\w.-]+)\}/g)]) {   // another pad, read with the key in its link; markdown is converted to a body
    const other = await readPad(m[1]!.replace(/^~/, ''));
    const name = `pad-${(await sha256hex(m[1]!)).slice(0, 8)}.tex`;
    if (other !== null) { const body = isTex(other) ? other : toTeX(other, () => null, false, true).source; extra[name] = new TextEncoder().encode(body); }
    else extra[name] = new TextEncoder().encode('\\textbf{[pad not found]}');
    text = text.replace(m[0], `\\input{${name}}`);
  }
  return {att, extra, text};
}
/** The latest signed checkpoint of another pad, from its tool secret: the view key, its room, the editors' public key. */
async function readPad(tool: string): Promise<string | null> {
  try {
    const T = b64u.dec(tool); if (T.length !== 16) return null;
    const V = new Uint8Array(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('pad/view')}, await crypto.subtle.importKey('raw', T, 'HKDF', false, ['deriveBits']), 128));
    const store = new Store(new Signaling(null, 'pad', await sha256hex(`pad:${b64u.enc(V)}`), ''), await storeKeys(V, 'pad/store'));
    const pub = ((await store.get('2'.repeat(32))) as {pub?: JsonWebKey} | null)?.pub; if (!pub) return null;
    for (const e of (await store.list()).filter(x => x.slot.startsWith('0000') && !x.slot.includes('.')).reverse()) {
      const c = (await store.get(e.slot)) as {state?: string; x?: unknown; sig?: string} | null;
      if (c && typeof c.state === 'string' && typeof c.sig === 'string' && await verify(pub, c.sig, JSON.stringify({state: c.state, x: c.x}))) return c.state;
    }
  } catch { /* not a pad we can read */ }
  return null;
}
let lastPdfUrl = '', texTimer = 0, texBusy = false, texWanted = '';
/** The compiled PDF in the preview, a little after the last edit; one build at a time. */
let refresh = () => {};   // the live header status (set below for readers and editors); compiling and exporting show their own, then hand back
function texPreview(text: string) {
  texWanted = text; clearTimeout(texTimer);
  texTimer = setTimeout(async () => {
    if (texBusy) return; texBusy = true;
    const source = texWanted;
    try {
      status(t('compiling'));
      const g = await gather(source);
      const r = await compileTex(g.text, g.extra, status);
      if (r.ok && r.pdf) {
        if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
        lastPdfUrl = URL.createObjectURL(new Blob([r.pdf as BlobPart], {type: 'application/pdf'}));
        const f = el('iframe', undefined, 'pdfview'); f.src = lastPdfUrl; f.title = t('previewLabel'); preview.replaceChildren(f); refresh();
      } else { preview.replaceChildren(el('pre', r.log.split('\n').filter(l => /^!|^l\.\d+/.test(l)).slice(0, 12).join('\n') || r.log.slice(-800), 'texlog')); status(t('texError', {err: r.log.split('\n').find(l => l.startsWith('!'))?.slice(2, 80) ?? ''})); }
    } catch (e) { status(t('texError', {err: (e as Error).message})); }
    finally { texBusy = false; if (texWanted !== source) texPreview(texWanted); }
  }, 1500) as unknown as number;
}
// the PDF button: the document (or the slides) typeset here, downloaded; the print dialog if that fails
pdf.onclick = async () => {
  pdf.disabled = true;
  try {
    const md = editor.value, asSlides = main.dataset['view'] === 'slides';
    status(t('typesetting', {n: 0}));
    const g = await gather(md);
    const doc = isTex(md) ? {source: g.text, files: {}} : toTeX(md, id => g.att.get(id) ?? null, asSlides);
    const r = await compileTex(doc.source, {...g.extra, ...doc.files}, status);
    if (!r.ok || !r.pdf) throw new Error(r.log.split('\n').find(l => l.startsWith('!')) ?? 'no pdf');
    const name = isTex(md) ? /\\title\{([^}]*)\}/.exec(md)?.[1] : mdTitle(md);
    download(new Blob([r.pdf as BlobPart], {type: 'application/pdf'}), `${(name || 'pad').replace(/[^\w-]+/g, '_')}.pdf`);
    refresh();
  } catch (e) { console.warn('typesetting failed, printing instead:', (e as Error).message); status(t('pdfFallback')); window.print(); }
  finally { pdf.disabled = false; }
};
// one way: the markdown becomes its LaTeX source, attachments keep their ids as file names
texBtn.onclick = async () => {
  if (isTex(editor.value) || !confirm(t('toTexConfirm'))) return;
  const meta = new Map((await files.list()).map(f => [f.id, {name: f.name, type: f.type, bytes: new Uint8Array(0)} as Attachment]));
  editor.value = toTeX(editor.value, id => meta.get(id) ?? null, main.dataset['view'] === 'slides').source;
  editor.setSelectionRange(0, 0); editor.oninput!(new Event('input'));
};

/** The text that refers to an attachment: a markdown embed or link, or in a LaTeX pad a figure, an \input or the name. */
function refFor(f: {id: string; name: string; type: string}): string {
  if (!isTex(editor.value)) return (/^(image|video|audio)\//.test(f.type) ? '!' : '') + `[${f.name.replace(/[\[\]]/g, '')}](file:${f.id})`;   // media embeds, the rest links
  const ext = f.type === 'image/png' ? 'png' : f.type === 'image/jpeg' ? 'jpg' : f.type === 'application/pdf' ? 'pdf' : null;
  return ext ? `\\includegraphics[width=\\linewidth]{${f.id}.${ext}}` : /\.tex$/i.test(f.name) ? `\\input{${f.name}}` : f.name;
}
// ---------- the files sidebar: this pad's attachments, insertable at the caret ----------
async function renderFiles() {
  const list = $('padfilelist'), all = await files.list(); list.replaceChildren();
  for (const f of all) {
    const li = el('li'), row = el('div', undefined, 'row'); li.append(el('b', f.name), el('small', `${bytesLabel(f.size)} · ${f.by ?? ''}`), row);
    if (!viewing) {
      const ins = el('button', t('insert')); ins.onclick = () => {
        const ref = refFor(f);
        const p = editor.selectionStart; editor.value = editor.value.slice(0, p) + ref + editor.value.slice(editor.selectionEnd); editor.setSelectionRange(p + ref.length, p + ref.length); editor.oninput!(new Event('input')); editor.focus();
      }; row.append(ins);
    }
    const dl2 = el('button', t('downloadFile')); dl2.onclick = async () => { const b = await fileBlob(f.id); if (b) download(b, f.name); }; row.append(dl2);
    if (!viewing) {   // remove for everyone, and take its references out of the text
      const rm = el('button', t('removeFile'), 'link'); row.append(rm);
      rm.onclick = async () => {
        if (!confirm(t('removeFileAsk', {name: f.name}))) return;
        rm.disabled = true; const st = await files.remove(f.id); if (st !== 204) { rm.disabled = false; status(t('removeFailed', {status: st})); return; }
        const stripped = editor.value.replace(new RegExp(`!?\\[[^\\]]*\\]\\(file:${f.id}\\)`, 'g'), '');
        if (stripped !== editor.value) { editor.value = stripped; editor.oninput!(new Event('input')); }
      };
    }
    list.append(li);
  }
}
{ const prev = files.onChange; files.onChange = () => { prev?.(); renderFiles(); }; }
renderFiles();

// ---------- comments: threads on a range of the text, in the side panel ----------
threads = comments(core.store, $('padcomments'), () => shown, () => nameOf() || t('guest'), viewing ? null : (from, to) => { editor.focus(); editor.setSelectionRange(from, to); }, () => { paintMarks(); $('commentsb').dataset['count'] = $('padcomments').dataset['count'] ?? '0'; });
const commentOn = $<HTMLButtonElement>('commenton'), commentForm = $<HTMLFormElement>('commentform'), commentText = $<HTMLTextAreaElement>('commenttext');
let commentRange: [number, number] | null = null;
const trackSelection = () => { commentOn.disabled = editor.selectionStart === editor.selectionEnd; };
if (viewing) commentOn.hidden = true; else { trackSelection(); document.addEventListener('selectionchange', () => { if (document.activeElement === editor) trackSelection(); }); }
commentOn.onclick = () => { commentRange = [editor.selectionStart, editor.selectionEnd]; commentForm.hidden = false; commentText.focus(); };
$('commentcancel').onclick = () => { commentForm.hidden = true; commentText.value = ''; };
commentForm.onsubmit = async e => { e.preventDefault(); if (commentRange && await threads.add(commentRange[0], commentRange[1], commentText.value)) { commentForm.hidden = true; commentText.value = ''; } };
const blobs = new Map<string, Promise<(Blob & {name: string; url: string}) | null>>();   // decrypted once per page, released with it
addEventListener('pagehide', () => { for (const p of blobs.values()) p.then(b => b && URL.revokeObjectURL(b.url)); });
const fileBlob = (id: string) => { let p = blobs.get(id); if (!p) { p = files.download(id).then(b => b && Object.assign(b, {url: URL.createObjectURL(b)})); blobs.set(id, p); } return p; };
/** ![x](file:id) becomes an image, a video or an audio player by the file's type, else a download link; [x](file:id) downloads. */
async function resolveFiles(root: HTMLElement) {
  for (const img of root.querySelectorAll<HTMLImageElement>('img[data-file]')) {
    const b = await fileBlob(img.dataset['file']!);
    if (!b) { img.alt += ' (missing)'; continue; }
    if (b.type.startsWith('image/')) img.src = b.url;
    else if (b.type.startsWith('video/') || b.type.startsWith('audio/')) { const m = el(b.type.startsWith('video/') ? 'video' : 'audio'); m.controls = true; m.preload = 'metadata'; m.src = b.url; if (m instanceof HTMLVideoElement) m.onloadedmetadata = () => m.style.setProperty('--ar', String(m.videoWidth / m.videoHeight)); /* the player's box follows the clip's shape */ m.ariaLabel = img.alt || b.name; img.replaceWith(m); }
    else { const a = el('a', img.alt || b.name); a.href = b.url; a.download = b.name; img.replaceWith(a); }
  }
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[data-file]')) a.onclick = async e => { e.preventDefault(); const b = await fileBlob(a.dataset['file']!); if (b) download(b, b.name); };
}
const resolveFedi = fediCards(core.store, viewing, () => paint());   // ![x](https://instance/...) become snapshot cards
{ const prev = core.store.onChange; core.store.onChange = async e => { prev?.(e); if (!e.slot.includes('.')) { if (viewing && await doc.load()) shown = editor.value = doc.state; paint(); } }; }   // chained: the files library listens on the same store   // a new snapshot or checkpoint from anyone

shown = editor.value = doc.state;
if (authors.length !== shown.length) authors = Array(shown.length).fill('');
paintMarks(); paint();
const mapCursors = (op: Op) => { for (const [id, r] of cursors) cursors.set(id, {from: mapPos(r.from, op), to: mapPos(r.to, op)}); };
const opEnd = (op: Op) => { let p = 0, end = 0; for (const x of op) { if (typeof x === 'string') { p += x.length; end = p; } else if (x > 0) p += x; else end = p; } return end; };   // where the caret sits after an edit: past the last insert, or at the deletion
let cursorTimer = 0, cursorSent = '';
const sendCursor = () => { if (cursorTimer) return; cursorTimer = setTimeout(() => { cursorTimer = 0; const m = `${editor.selectionStart} ${editor.selectionEnd}`; if (m !== cursorSent) { cursorSent = m; core.sig.send('*', {t: 'cursor', from: editor.selectionStart, to: editor.selectionEnd}); } }, 80) as unknown as number; };
core.sig.on('cursor', (from, m) => {
  const n = (x: unknown) => Math.max(0, Math.min(shown.length, Math.floor(Number(x))));
  if (typeof m['from'] === 'number' && typeof m['to'] === 'number') { const a = n(m['from']), b = n(m['to']); cursors.set(from, {from: Math.min(a, b), to: Math.max(a, b)}); } else cursors.delete(from);
  paintMarks();
});
const prevJoinC = core.roster.onJoin, prevLeave = core.roster.onLeave;
core.roster.onJoin = (id, i) => { prevJoinC?.(id, i); if (!viewing) sendCursorTo(id); };
core.roster.onLeave = id => { prevLeave?.(id); if (cursors.delete(id)) paintMarks(); };
const sendCursorTo = (id: number) => { if (document.activeElement === editor) core.sig.send(id, {t: 'cursor', from: editor.selectionStart, to: editor.selectionEnd}); };
if (viewing) {
  refresh = () => status(signed.keyed ? t('readOnly') : t('noHead')); refresh();
  core.sig.connect();
}
if (!viewing) {   // everything below is the editor
doc.onRemote = (op: Op, from?: number) => {   // apply to the textarea, keep the caret where the text it points at went
  const s = mapPos(editor.selectionStart, op), e = mapPos(editor.selectionEnd, op);
  shown = editor.value = apply(shown, op); threads?.map(op); mapCursors(op);
  if (from !== undefined) { const p = opEnd(op); cursors.set(from, {from: p, to: p}); }   // the author's caret is where the edit ended; a message could overtake the op, so it is not sent
  authors = annotate(authors, op, from === undefined ? '' : authorOf.get(from) ?? core.roster.nameOf(from));
  editor.setSelectionRange(s, e); sendCursor();
  paintMarks(); paint();
};
// The meeting secret must not end up in the text (readers of the pad would hold the whole meeting):
// a pasted meeting link to one of our tools is swapped for that tool's own link.
const toolLinks = sess.meeting ? new Map(await Promise.all(config.apps.map(async a => [a, await sess.toolKey(a)] as const))) : null;
const safeLinks = (text: string) => toolLinks ? text.replace(new RegExp(`/(${config.apps.join('|')})/(\\?[^#\\s)]*)?#${sess.meeting}(?![\\w-])`, 'g'), (_, a: string, q = '') => `/${a}/${q}#~${toolLinks.get(a)}`) : text;
editor.oninput = () => { const safe = safeLinks(editor.value); if (safe !== editor.value) { const p = safeLinks(editor.value.slice(0, editor.selectionStart)).length; editor.value = safe; editor.setSelectionRange(p, p); }   // the caret keeps its place in the rewritten text
  // A big paste is sent as several inserts: one op must fit a relay frame (256 KB sealed), or the socket would be dropped.
  for (const target = editor.value;;) {
    const op = diff(shown, target), ins = op.find((x): x is string => typeof x === 'string');
    if (!ins || ins.length <= MAX_INSERT) { shown = target; authors = annotate(authors, op, me()); doc.edit(op); threads?.map(op); mapCursors(op); break; }
    const at = typeof op[0] === 'number' && op[0] > 0 ? op[0] : 0, del = -(op.find((x): x is number => typeof x === 'number' && x < 0) ?? 0);
    const partial = shown.slice(0, at) + ins.slice(0, MAX_INSERT) + shown.slice(at + del), step = diff(shown, partial);
    shown = partial; authors = annotate(authors, step, me()); doc.edit(step); threads?.map(step); mapCursors(step);
  }
  cursorSent = `${editor.selectionStart} ${editor.selectionEnd}`;   // the op carries the caret: the selectionchange that follows has nothing to add
  refresh(); paintMarks(); paint(); };
document.addEventListener('selectionchange', () => { if (document.activeElement === editor) sendCursor(); });
editor.addEventListener('focus', () => { cursorSent = ''; sendCursor(); });   // a caret stays where it was while its owner is elsewhere (another tab, the comments panel) and goes when they leave
// who is who: every peer announces its author key to the room and to each newcomer
core.sig.on('author', (from, m) => { authorOf.set(from, String(m.key).slice(0, 60)); });
const prevJoin = core.roster.onJoin; core.roster.onJoin = (id, i) => { prevJoin?.(id, i); core.sig.send(id, {t: 'author', key: me()}); };
refresh = () => {
  editor.readOnly = !doc.ready || histSlot !== null || doc.storeDown;   // a store that cannot keep the text pauses editing, so nothing typed is lost
  const names = [...doc.peers].map(p => core.roster.nameOf(p)).concat(t('you'));
  const save = doc.storeDown ? t('storeDown') : !doc.ready ? t('syncing') : doc.saved === 'saving' ? t('saving') : doc.saved === 'failed' ? t('saveFailed') : doc.saved === 'saved' ? t('saved') : '';
  status(t('online', {n: names.length, names: names.join(', ')}) + (save ? ` · ${save}` : ''));
};
doc.onStatus = refresh;
core.roster.onName = refresh;
core.roster.start();
core.sig.connect();
refresh();
addEventListener('pagehide', () => doc.save());

// --- attachments: upload to the share room, insert a reference at the caret ---
attach.onclick = () => fileInput.click();
const queue = uploadQueue($('uploads'));
// the button, a paste into the editor (a screenshot, a copied image) and a drop on it all attach
dropZone(editor, fileInput, picked => {
  if (histSlot) return;   // not into an old version
  for (const f of picked) queue.add(f, p => files.upload(f, nameOf(), p)).then(id => {
    const ref = refFor({id, name: f.name, type: f.type});
    const p = editor.selectionStart;
    editor.value = editor.value.slice(0, p) + ref + editor.value.slice(editor.selectionEnd);
    editor.setSelectionRange(p + ref.length, p + ref.length);
    editor.oninput!(new Event('input'));
    refresh();
  }, () => {});
}, editor);

// --- history: every checkpoint, read-only, restorable as one edit ---
let histSlot: string | null = null;   // the checkpoint on screen, when looking at history
hist.onfocus = async () => {
  const entries = await doc.checkpoints();
  hist.replaceChildren(new Option(t('history'), ''), ...entries.reverse().map(e => new Option(new Date(e.at).toLocaleString(lang, {dateStyle: 'medium', timeStyle: 'short'}), e.slot)));
};
hist.onchange = async () => {
  const slot = hist.value; if (!slot) return;
  const text = await doc.checkpoint(slot); if (text === null) return;
  histSlot = slot;
  $('histbar').hidden = false; $('histwhen').textContent = t('viewing', {when: hist.selectedOptions[0]!.text});
  editor.value = text; editwrap.classList.add('plain'); refresh(); paint(text);   // an old version: the textarea shows it plainly, the layer (live text) steps aside
};
const leaveHistory = () => { histSlot = null; hist.value = ''; $('histbar').hidden = true; editor.value = shown; editwrap.classList.remove('plain'); refresh(); paint(); };
$('histback').onclick = leaveHistory;
$('histrestore').onclick = () => { const old = editor.value; leaveHistory(); editor.value = old; editor.oninput!(new Event('input')); };

// --- slides, presented one at a time ---
let at = 0;
const stage = $('present-view');
const showSlide = () => {
  const all = slides(shown); at = Math.max(0, Math.min(at, all.length - 1));
  const s = $('slide'); s.replaceChildren(...render(all[at] ?? '').map(b => tree(demote(b)))); resolveFiles(s); embedApps(s, embedLink); resolveFedi(s);
  $('slidenav').textContent = t('slideOf', {n: at + 1, total: all.length});
};
present.onclick = () => { stage.hidden = false; at = 0; showSlide(); stage.requestFullscreen?.().catch(() => {}); stage.focus(); };
const exit = () => { stage.hidden = true; if (document.fullscreenElement) document.exitFullscreen(); editor.focus(); };
$('exit').onclick = exit;
stage.onclick = e => { if ((e.target as HTMLElement).closest('button')) return; at++; showSlide(); };
stage.onkeydown = e => {
  if (e.key === 'Escape') exit();
  else if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { at++; showSlide(); }
  else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { at--; showSlide(); }
  else return;
  e.preventDefault();
};
document.onfullscreenchange = () => { if (!document.fullscreenElement && !stage.hidden) exit(); };

dl.onclick = () => download(new Blob([shown], {type: 'text/markdown'}), `${(mdTitle(shown) || 'pad').replace(/[^\w-]+/g, '_')}.md`);
}
// PDF: typeset with tstex (core/tex.ts) when the TeX bundle is served, else the browser prints the rendered document (css/pad.css print rules); slides print one landscape page per slide
let pageRule = -1;
function preparePrint(slidesMode = main.dataset['view'] === 'slides') {
  document.body.classList.toggle('print-slides', slidesMode);
  const sheet = [...document.styleSheets].find(s => s.href?.endsWith('/css/pad.css'))!;
  if (pageRule >= 0) sheet.deleteRule(pageRule);
  pageRule = sheet.insertRule(`@page { size: A4 ${slidesMode ? 'landscape' : 'portrait'}; margin: ${slidesMode ? '10mm' : '18mm'}; }`, sheet.cssRules.length);   // CSSOM, allowed by the CSP
}
addEventListener('beforeprint', () => preparePrint());   // the button, Ctrl+P and a headless print all pass here
addEventListener('afterprint', () => document.body.classList.remove('print-slides'));
if (!viewing) {
}
