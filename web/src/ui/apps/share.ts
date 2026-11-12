// Files of a meeting: drop or pick, chunked and encrypted in the browser, listed for everyone
// with the link, downloaded and decrypted on request. Images get a preview.
import {t} from '../../core/i18n.js';
import {Files, type FileEntry} from '../../core/files.js';
import {start, joinSigned, viewLinkButton, nameOf, title, status, actions, sess} from '../shell.js';
import {hex} from '../../core/crypto.js';
import {$, el, css, download, dropZone} from '../dom.js';
import {meter, uploadQueue, bytesLabel} from '../widgets.js';

css('/css/share.css');
start();
const lang = document.documentElement.lang;
// Two links, like the pad: the meeting link uploads, a derived view link only reads.
const signed = await joinSigned(nameOf(), 'share'), core = signed.core, viewing = signed.viewing;
core.sig.connect();
const files = new Files(core.store);
files.sign = signed.sign; files.verify = signed.verify;
if (viewing) document.querySelector('[data-i18n="shareSubtitle"]')!.textContent = t('shareSubtitleView');   // the view link is already the read-only one
if (!viewing) files.deleteKey = async id => hex(await sess.derive(`share/delete/${id}`, 32));
if (!viewing) {
  actions.prepend(viewLinkButton(() => signed.viewLink));
} else { document.body.classList.add('viewing'); $('drop').hidden = true; }


async function list() {
  const all = await files.list();
  $('empty').hidden = all.length > 0;
  if (viewing && !signed.keyed) { status(t('noHeadFiles')); return; }   // nothing can be verified yet, so nothing is listed: say why
  status((viewing ? t('readOnly') + ' · ' : '') + (all.length ? t('nFiles', {n: all.length, size: bytesLabel(all.reduce((s, f) => s + f.size, 0))}) : ''));
  $('files').replaceChildren(...all.map(row));
}
function row(f: FileEntry) {
  const li = el('li');
  const name = el('b', f.name), meta = el('small', ` ${bytesLabel(f.size)} · ${new Date(f.at).toLocaleString(lang, {dateStyle: 'medium', timeStyle: 'short'})}${f.by ? ' · ' + t('by', {who: f.by}) : ''}`);
  const dl = el('button', t('downloadFile'));
  dl.onclick = async () => { const m = meter(t('downloading', {name: f.name})); li.append(m.el); const b = await files.download(f.id, m.set); m.el.remove(); if (b) download(b, b.name); };
  li.append(name, meta, dl);
  if (/^(image|video|audio)\//.test(f.type) && f.size < 200 * 1024 * 1024) {   // decrypted into memory, so not for huge files
    const pv = el('button', t('preview')); li.append(pv);
    pv.onclick = async () => {
      pv.disabled = true; const b = await files.download(f.id); if (!b) return;
      const url = URL.createObjectURL(b); addEventListener('pagehide', () => URL.revokeObjectURL(url), {once: true});
      if (f.type.startsWith('image/')) { const img = el('img'); img.src = url; img.alt = f.name; li.append(img); }
      else { const m = el(f.type.startsWith('video/') ? 'video' : 'audio'); m.controls = true; m.src = url; m.ariaLabel = f.name; li.append(m); }
    };
  }
  // last in the row: download, preview, remove
  if (!viewing) { const rm = el('button', t('removeFile'), 'link'); li.append(rm); rm.onclick = async () => { if (!confirm(t('removeFileAsk', {name: f.name}))) return; rm.disabled = true; const st = await files.remove(f.id); if (st !== 204) { rm.disabled = false; status(t('removeFailed', {status: st})); } }; }
  return li;
}
files.onChange = list;
const queue = uploadQueue($('uploads'));
$<HTMLInputElement>('file').disabled = viewing;   // enabled only once the room is joined, so a file picked early is not dropped on the floor
dropZone($('drop'), $<HTMLInputElement>('file'), picked => { if (viewing) return; for (const f of picked) queue.add(f, p => files.upload(f, nameOf(), p)).then(list, () => {}); });   // picked, dropped or pasted anywhere on the page
$('drop').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $<HTMLInputElement>('file').click(); } };
title(t('app_share'));
await list();
