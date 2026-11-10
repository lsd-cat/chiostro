// Small reusable pieces: a time-zone line, a progress meter. Nothing here knows an app.
import {t} from '../core/i18n.js';
import {el} from './dom.js';

const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const lang = () => document.documentElement.lang;
/** A calendar date (YYYY-MM-DD) in the page's language, unaffected by the viewer's zone. */
/** A size for people: KB below a megabyte, MB with one decimal above. */
export const bytesLabel = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
export const dateLabel = (date: string, opts: Intl.DateTimeFormatOptions) => new Date(date + 'T00:00:00Z').toLocaleDateString(lang(), {...opts, timeZone: 'UTC'});
/** "Time zone: X (detected) [Change]"; a select appears on request. Returns a getter. */
export function tzPicker(box: HTMLElement, onChange: () => void): () => string {
  let cur = myTz;
  const tzs = Intl.supportedValuesOf('timeZone');
  const text = el('span'); text.append(t('timezone') + ': ', el('b', cur.replace(/_/g, ' ')), ' ' + t('detected'));
  const change = el('button', t('change')); change.type = 'button';
  const sel = el('select'); sel.ariaLabel = t('timezone'); sel.hidden = true;
  for (const z of tzs.includes(cur) ? tzs : [cur, ...tzs]) sel.append(new Option(z.replace(/_/g, ' '), z, false, z === cur));
  change.onclick = () => { text.hidden = change.hidden = true; sel.hidden = false; sel.focus(); };
  sel.onchange = () => { cur = sel.value; onChange(); };
  box.append(text, change, sel);
  return () => cur;
}

/** A labelled <progress> that formats bytes. */
export function meter(label: string) {
  const wrap = el('div', undefined, 'meter'), bar = el('progress'), text = el('small');
  bar.max = 1; bar.ariaLabel = label; wrap.append(el('span', label), bar, text);
  return {el: wrap, set(done: number, total: number) { bar.value = total ? done / total : 0; text.textContent = `${bytesLabel(done)} / ${bytesLabel(total)}`; }};
}

/** A queue of uploads shown as a list: each file with its size, a bar while it runs, "queued"
 *  before, done rows leave after a moment, failures stay with their reason. Uploads run one at a
 *  time so a burst of files does not fight for the connection. `run` does the upload and reports progress. */
export function uploadQueue(list: HTMLElement) {
  let chain: Promise<unknown> = Promise.resolve();
  const sync = () => { list.hidden = !list.children.length; };
  return {
    add<T>(file: {name: string; size: number}, run: (onProgress: (done: number, total: number) => void) => Promise<T>): Promise<T> {
      const m = meter(file.name), state = el('small', t('queued'), 'state'); m.el.append(state); m.set(0, file.size); list.append(m.el); sync();
      const job = chain.then(async () => {
        state.textContent = t('uploadingShort');
        try { const r = await run(m.set); state.textContent = t('done'); m.el.classList.add('done'); setTimeout(() => { m.el.remove(); sync(); }, 2500); return r; }
        catch (e) { state.textContent = t('failed', {err: (e as Error).message}); m.el.classList.add('failed'); throw e; }
      });
      chain = job.catch(() => {});
      return job;
    },
  };
}
