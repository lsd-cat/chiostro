// DOM helpers shared by every UI. Nothing in core/ may import this.
import {t} from '../core/i18n.js';
import type {Node as MdNode} from '../core/md.js';
import type {Bus} from '../core/ext.js';
import type {Roster} from '../core/roster.js';

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

/** Apply translations to markup: data-i18n (text), data-i18n-aria (aria-label), data-i18n-ph (placeholder). */
export function translate(root: ParentNode = document) {
  for (const e of root.querySelectorAll<HTMLElement>('[data-i18n]')) e.textContent = t(e.dataset['i18n']!);
  for (const e of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) e.ariaLabel = t(e.dataset['i18nAria']!);
  for (const e of root.querySelectorAll<HTMLInputElement>('[data-i18n-ph]')) e.placeholder = t(e.dataset['i18nPh']!);
}

/** A markdown tree (core/md.ts) to elements: textContent and setAttribute only, nothing parsed as HTML. */
export const tree = (x: MdNode): Node => {
  if (typeof x === 'string') return document.createTextNode(x);
  const e = document.createElement(x.t);
  for (const [k, v] of Object.entries(x.a ?? {})) e.setAttribute(k, v);
  for (const c of x.c) e.append(tree(c));
  return e;
};

/** A 1280x720 canvas repainted every frame with the given tiles in a grid; `stop` ends it. */
export function compose(sources: () => (HTMLVideoElement | HTMLCanvasElement)[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  let raf = 0;
  const paint = () => {
    const srcs = sources(), cols = Math.ceil(Math.sqrt(srcs.length)) || 1, rows = Math.ceil(srcs.length / cols) || 1, w = canvas.width / cols, h = canvas.height / rows;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    srcs.forEach((s, i) => { try { ctx.drawImage(s, (i % cols) * w, Math.floor(i / cols) * h, w, h); } catch {} });
    raf = requestAnimationFrame(paint);
  };
  paint();
  return {canvas, stop: () => cancelAnimationFrame(raf)};
}

/** An icon from the sprite in index.html, decorative (the button's text or aria-label names it). */
export const icon = (name: string) => { const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use'); svg.setAttribute('class', 'i'); svg.setAttribute('aria-hidden', 'true'); u.setAttribute('href', '#i-' + name); svg.append(u); return svg; };

/** Load a stylesheet from the same origin (allowed by the CSP). */
export const css = (href: string) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l); };

/** Offer bytes as a download. */
export const download = (blob: Blob, name: string) => { const a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };

/** A button that copies the page link and says so. */
export const copyLink = (b: HTMLElement, link: () => string = () => location.href, done = 'copied') => { b.onclick = async () => { try { await navigator.clipboard.writeText(link()); } catch { prompt(t('copy'), link()); return; }   // no clipboard (plain http, a denied permission): hand the link over to copy by hand
  b.textContent = t(done); b.setAttribute('aria-live', 'polite'); }; };

/** Drag and drop plus a picker on one element; `onFiles` gets every file dropped or chosen. */
export function dropZone(zone: HTMLElement, input: HTMLInputElement, onFiles: (files: File[]) => void, pasteOn: EventTarget = document) {
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('over'); };
  zone.ondragleave = () => zone.classList.remove('over');
  zone.ondrop = e => { e.preventDefault(); zone.classList.remove('over'); onFiles([...(e.dataTransfer?.files ?? [])]); };
  input.onchange = () => { onFiles([...(input.files ?? [])]); input.value = ''; };
  pasteOn.addEventListener('paste', e => { const files = pastedFiles(e as ClipboardEvent); if (files.length) { e.preventDefault(); onFiles(files); } });
}
/** Files on the clipboard (a screenshot, a copied image); a nameless image gets a dated name. */
const pastedFiles = (e: ClipboardEvent): File[] => [...(e.clipboardData?.files ?? [])].map(f => !f.name || /^image\.\w+$/i.test(f.name) ? new File([f], `pasted-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${f.type.split('/')[1] || 'bin'}`, {type: f.type}) : f);

/** What a call extension UI gets: places to render into, the shared bus, and names. */
export type UiCtx = {stage: HTMLElement; bar: HTMLElement; settings: HTMLElement; main: HTMLElement; bus: Bus; roster: Roster; remoteAudio?: () => MediaStream | undefined};

/** iframe[data-app] from the markdown ("/form/#K"): load the tool chrome-less, wherever it lives, and follow its reported height. */
export function embedApps(root: HTMLElement, link: (app: string, hash: string, query: string) => string) {
  for (const f of root.querySelectorAll<HTMLIFrameElement>('iframe[data-app]')) {
    const m = /^\/([a-z]+)\/#(.*)$/.exec(f.dataset['app']!); if (!m) continue;
    f.src = link(m[1]!, '#' + m[2]!, '?embed'); f.className = 'embed';   // not lazy: an embed below the fold must still load and report its height
  }
}
export function listenEmbeds(fromSibling: (origin: string) => boolean) {
  addEventListener('message', e => {
    if (!fromSibling(e.origin) || typeof e.data?.embedHeight !== 'number') return;
    for (const f of document.querySelectorAll<HTMLIFrameElement>('iframe.embed')) if (f.contentWindow === e.source) f.style.height = Math.min(2000, Math.max(120, e.data.embedHeight + 2)) + 'px';
  });
}
