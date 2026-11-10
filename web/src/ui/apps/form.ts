// Forms, Framaforms-style: a builder, one write-once answer per browser, results for the owner.
// Two links: the public one answers; the owner's link carries a private key (after a dot) and
// answers are sealed to its public half, so neither the server nor other respondents read them.
// A form can instead publish its results to everyone with the link: that is a classic poll.
import {t} from '../../core/i18n.js';
import {b64u, sealTo, openWith} from '../../core/crypto.js';
import {boxKeypair} from '../../core/crypto.js';
import {randomSlot, stamp} from '../../core/store.js';
import {deadline} from '../../core/answers.js';
import {start, join, title, status, sess, embedded, memo} from '../shell.js';
import {$, el, css, download, copyLink} from '../dom.js';
import {dateLabel} from '../widgets.js';
import {drawQr} from '../qr.js';

type Field = {label: string; type: 'text' | 'long' | 'number' | 'date' | 'one' | 'many' | 'words' | 'scale'; options?: string[]; required?: boolean};
type Form = {title: string; fields: Field[]; open: boolean; pub?: string; by?: string; tz: string};
type Answer = (string | number | string[] | null)[];
const TYPES: Field['type'][] = ['text', 'long', 'number', 'date', 'one', 'many', 'words', 'scale'];
// Presenting (Menti-style): the presenter's current question and whether results are shown, the newest state slot wins.
type State = {q: number; reveal: boolean};
const STATE = '1'.repeat(24);
const isState = (x: unknown): x is State => { const st = x as State; return !!st && typeof st === 'object' && Number.isInteger(st.q) && st.q >= 0 && typeof st.reveal === 'boolean'; };
const isForm = (x: unknown): x is Form => { const f = x as Form; return !!f && typeof f === 'object' && typeof f.title === 'string' && f.title.length <= 200 && Array.isArray(f.fields) && f.fields.length >= 1 && f.fields.length <= 50
  && f.fields.every(q => q && typeof q.label === 'string' && q.label.length <= 300 && TYPES.includes(q.type) && (q.options === undefined || (Array.isArray(q.options) && q.options.every(o => typeof o === 'string' && o.length <= 200))) && (q.required === undefined || typeof q.required === 'boolean'))
  && typeof f.open === 'boolean' && (f.open || typeof f.pub === 'string') && typeof f.tz === 'string' && (f.by === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(f.by))); };
const isAnswer = (form: Form) => (x: unknown): x is Answer => Array.isArray(x) && x.length === form.fields.length && x.every((v, i) => { const q = form.fields[i]!;
  return v === null || (q.type === 'many' ? Array.isArray(v) && v.every(o => typeof o === 'string' && q.options?.includes(o)) : q.type === 'number' ? typeof v === 'number' && Number.isFinite(v) : q.type === 'scale' ? Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 : typeof v === 'string' && v.length <= (q.type === 'words' ? 60 : 5000) && (q.type !== 'one' || q.options?.includes(v))); });

css('/css/form.css');
start();
const lang = document.documentElement.lang;
const DEF = '0'.repeat(32);
const core = await join('');
core.sig.connect();
const store = core.store;
const def = await store.get(DEF);
if (isForm(def)) await showForm(def); else showBuilder();

// --- builder ---
function showBuilder() {
  $('build').hidden = false;
  title(t('app_form'));
  const list = $('fields');
  const addField = (f: Partial<Field> = {}) => {
    const row = el('fieldset', undefined, 'field');
    const label = el('input'); label.maxLength = 300; label.value = f.label ?? ''; label.ariaLabel = t('question'); label.placeholder = t('question');
    const type = el('select'); type.ariaLabel = t('type');
    for (const ty of TYPES) type.append(new Option(t('f' + ty[0]!.toUpperCase() + ty.slice(1)), ty, false, ty === (f.type ?? 'text')));
    const opts = el('textarea'); opts.rows = 3; opts.ariaLabel = t('options'); opts.placeholder = t('options'); opts.value = (f.options ?? []).join('\n');
    const req = el('label', undefined, 'check'), reqIn = el('input'); reqIn.type = 'checkbox'; reqIn.checked = !!f.required; req.append(reqIn, el('span', t('required')));
    const rm = el('button', t('remove')), up = el('button', '↑'), down = el('button', '↓'); up.ariaLabel = t('up'); down.ariaLabel = t('down');
    for (const b of [rm, up, down]) b.type = 'button';
    rm.onclick = () => row.remove(); up.onclick = () => row.previousElementSibling?.before(row); down.onclick = () => row.nextElementSibling?.after(row);
    const showOpts = () => { opts.hidden = !(type.value === 'one' || type.value === 'many'); };
    type.onchange = showOpts; showOpts();
    const foot = el('div', undefined, 'foot'); foot.append(req, up, down, rm);
    row.append(label, type, opts, foot);
    list.append(row);
  };
  addField({type: 'one', options: []});
  $('addfield').onclick = () => addField();
  $('go').onclick = async () => {
    const fields: Field[] = [...list.querySelectorAll<HTMLElement>('.field')].map(r => {
      const [label, type, opts, req] = [r.querySelector('input')!, r.querySelector('select')!, r.querySelector('textarea')!, r.querySelector<HTMLInputElement>('input[type=checkbox]')!];
      const f: Field = {label: label.value.trim(), type: type.value as Field['type'], required: req.checked};
      if (f.type === 'one' || f.type === 'many') f.options = opts.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 50);
      return f;
    }).filter(f => f.label && (!f.options || f.options.length >= 2));
    const titleText = $<HTMLInputElement>('ftitle').value.trim(), by = $<HTMLInputElement>('by').value;
    if (!titleText || !fields.length) return void ($('err').textContent = t('needFields'));
    const open = $<HTMLInputElement>('openres').checked;
    const form: Form = {title: titleText, fields, open, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(by && {by})};
    let d = '';
    if (!open) { const kp = await boxKeypair(); form.pub = b64u.enc(kp.pub); d = kp.d; }
    const st = await store.put(DEF, form);
    if (st >= 300) return void ($('err').textContent = t('createFailed', {status: st}));
    location.hash = location.hash.slice(1).split('.')[0] + (d ? '.' + d : '');   // the owner's link: the same secret plus the private key
    location.reload();
  };
}

// --- answering and results ---
async function showForm(form: Form) {
  title(form.title);
  const owner = !form.open && !!sess.extra;
  const closes = deadline(form.by, form.tz);
  const closed = Date.now() > closes;
  if (form.by) status(closed ? t('closedSince', {date: dateLabel(form.by, {dateStyle: 'long'})}) : t('answerBy', {date: dateLabel(form.by, {dateStyle: 'long'})}));
  $('fill').hidden = false;
  const publicLink = location.origin + location.pathname + '#~' + sess.tool;   // a tool link: the form, not the meeting
  if (owner && !embedded) {
    $('share').hidden = false;
    for (const [id, btn, link] of [['publiclink', 'copypublic', publicLink], ['ownerlink', 'copyowner', location.href]] as const) {
      $(id).textContent = link; $(id).title = link;
      copyLink($(btn), () => link);
    }
  }

  // presenting: a state slot says which question is up and whether results are revealed
  const latestState = async (): Promise<State | null> => { const e = (await store.list()).filter(x => x.slot.startsWith(STATE)).sort((x, y) => (x.slot < y.slot ? 1 : -1))[0]; const v = e ? await store.get(e.slot) : null; return isState(v) && v.q < form.fields.length ? v : null; };
  let state = await latestState();
  const live = !!state;
  // the questions (in a presented form, only the current one; the others are disabled so they do not validate)
  const sent = memo('form:' + core.sig.roomId + (state ? ':' + state.q : ''));
  const qs = $('questions');
  form.fields.forEach((q, i) => {
    const wrap = el(q.type === 'one' || q.type === 'many' || q.type === 'scale' ? 'fieldset' : 'label', undefined, 'q');
    const cap = el(wrap.tagName === 'FIELDSET' ? 'legend' : 'span', q.label + (q.required ? ' *' : ''));
    wrap.append(cap);
    if (q.type === 'one' || q.type === 'many') for (const o of q.options ?? []) { const l = el('label', undefined, 'check'), input = el('input'); input.type = q.type === 'one' ? 'radio' : 'checkbox'; input.name = 'q' + i; input.value = o; input.required = q.type === 'one' && !!q.required; l.append(input, el('span', o)); wrap.append(l); }
    else if (q.type === 'scale') for (let v = 1; v <= 5; v++) { const l = el('label', undefined, 'check scale'), input = el('input'); input.type = 'radio'; input.name = 'q' + i; input.value = String(v); input.required = !!q.required; l.append(input, el('span', String(v))); wrap.append(l); }
    else if (q.type === 'long') { const ta = el('textarea'); ta.rows = 4; ta.name = 'q' + i; ta.required = !!q.required; ta.maxLength = 5000; wrap.append(ta); }
    else { const input = el('input'); input.type = q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'; input.name = 'q' + i; input.required = !!q.required; input.maxLength = q.type === 'words' ? 60 : 1000; wrap.append(input); }
    if (state && i !== state.q) { wrap.hidden = true; for (const x of wrap.querySelectorAll<HTMLInputElement>('input, textarea')) x.disabled = true; }
    qs.append(wrap);
  });
  if (state) status(t('questionOf', {n: state.q + 1, total: form.fields.length}));
  $('answer').hidden = !!sent || closed;
  if (sent) $('sent').textContent = t('thanks');
  $<HTMLFormElement>('answer').onsubmit = async e => {
    e.preventDefault();
    const answer: Answer = form.fields.map((q, i) => {
      const els = [...qs.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="q${i}"]`)];
      if (q.type === 'many') return els.filter(x => (x as HTMLInputElement).checked).map(x => x.value);
      if (q.type === 'one') return els.find(x => (x as HTMLInputElement).checked)?.value ?? null;
      if (q.type === 'scale') { const v = els.find(x => (x as HTMLInputElement).checked)?.value; return v ? Number(v) : null; }
      const v = els[0]!.value.trim(); return v === '' ? null : q.type === 'number' ? Number(v) : v;
    });
    const bytes = new TextEncoder().encode(JSON.stringify(answer));
    const st = form.open ? await store.put(randomSlot(), answer) : await store.putChunk(randomSlot(), await sealTo(b64u.dec(form.pub!), bytes));
    if (st >= 300) return void ($('senderr').textContent = t('sendFailed', {status: st}));
    memo('form:' + core.sig.roomId + (state ? ':' + state.q : ''), true);
    location.reload();
  };
  // the audience follows the presenter: a new state reloads the page onto the current question
  let presenting = false;
  const follow = async () => { const next = await latestState(); if (!presenting && JSON.stringify(next) !== JSON.stringify(state)) location.reload(); };

  // the results: everyone for an open form, the owner's link otherwise; in a presented form, when the presenter reveals them
  if (!(form.open || owner)) { $('locked').hidden = false; store.onChange = follow; return; }
  if (live && !state!.reveal && !owner) { $('waiting').hidden = false; store.onChange = follow; return; }
  $('results').hidden = false;
  const valid = isAnswer(form);
  const load = async (): Promise<(Answer & {at: number})[]> => {
    const entries = (await store.list()).filter(e => e.slot !== DEF && !e.slot.startsWith(STATE) && !e.slot.includes('.') && e.at <= closes);
    const got = await Promise.all(entries.map(async e => {
      let v: unknown = null;
      if (form.open) v = await store.get(e.slot);
      else { const inner = await store.getChunk(e.slot); if (inner) try { v = JSON.parse(new TextDecoder().decode(await openWith(sess.extra, b64u.dec(form.pub!), inner))); } catch { v = null; } }
      return valid(v) ? Object.assign(v, {at: e.at}) : null;
    }));
    return got.filter((a): a is Answer & {at: number} => !!a);
  };
  const cell = (v: Answer[number]) => v === null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  let answers: (Answer & {at: number})[] = [];
  const draw = async () => {
    answers = await load();
    $('rcount').textContent = t('nAnswers', {n: answers.length});
    const table = $('table') as HTMLTableElement; table.replaceChildren();
    const head = table.createTHead().insertRow(); head.append(el('th', t('answered')), ...form.fields.map(q => el('th', q.label)));
    const body = table.createTBody();
    for (const a of answers) { const r = body.insertRow(); r.append(el('td', new Date(a.at).toLocaleString(lang, {dateStyle: 'short', timeStyle: 'short'})), ...form.fields.map((_q, i) => el('td', cell(a[i]!)))); }
    const tallies = $('tallies'); tallies.replaceChildren();
    form.fields.forEach((q, i) => {
      if (!q.options) return;
      const box = el('div', undefined, 'tally'); box.append(el('b', q.label));
      for (const o of q.options) { const n = answers.filter(a => Array.isArray(a[i]) ? (a[i] as string[]).includes(o) : a[i] === o).length; const row = el('div'), bar = el('progress'); bar.max = Math.max(1, answers.length); bar.value = n; bar.ariaLabel = `${o}: ${n}`; row.append(el('span', `${o} `), el('b', String(n)), bar); box.append(row); }
      tallies.append(box);
    });
    $('empty').hidden = answers.length > 0;
    $('csv').onclick = () => {
      const esc = (v: string) => `"${v.replace(/^([=+\-@\t\r])/, "'$1").replace(/"/g, '""')}"`;   // a leading = + - @ would run as a formula in a spreadsheet
      const rows = [[t('answered'), ...form.fields.map(q => q.label)], ...answers.map(a => [new Date(a.at).toISOString(), ...form.fields.map((_q, i) => cell(a[i]!))])];
      download(new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')], {type: 'text/csv'}), `${form.title.replace(/[^\w-]+/g, '_')}.csv`);
    };
  };
  store.onChange = async () => { await follow(); await draw(); if (presenting) drawSlide(); };
  await draw();

  // --- presenting: one question at a time, big, live, with the join QR; arrows move, R reveals ---
  const view = $('fpresent'), viz = $('fpviz');
  let q = state?.q ?? 0, reveal = state?.reveal ?? false;
  const publish = async () => { state = {q, reveal}; await store.put(STATE + stamp(), state); drawSlide(); };
  const words = (i: number) => {   // the word cloud: frequency of words across the answers to question i
    const count = new Map<string, number>();
    for (const a of answers) for (const w of String(a[i] ?? '').toLowerCase().split(/[^\p{L}\p{N}'-]+/u)) if (w.length > 2) count.set(w, (count.get(w) ?? 0) + 1);
    return [...count].sort((x, y) => y[1] - x[1]).slice(0, 40);
  };
  function drawSlide() {
    const f = form.fields[q]!, vals = answers.map(a => a[q]).filter(v => v !== null && v !== undefined && v !== '');
    $('fpqtitle').textContent = f.label;
    $('fpcount').textContent = `${t('questionOf', {n: q + 1, total: form.fields.length})} · ${t('nAnswers', {n: vals.length})}`;
    $('fpreveal').textContent = t(reveal ? 'hideResults' : 'reveal'); $('fpreveal').ariaPressed = String(reveal);
    viz.replaceChildren();
    if (!reveal) { viz.append(el('p', t('resultsHidden'), 'muted')); return; }
    if (f.options) for (const o of f.options) {   // bars that grow with each answer
      const n = vals.filter(v => Array.isArray(v) ? v.includes(o) : v === o).length, row = el('div', undefined, 'fpbar'), fill = el('div', undefined, 'fill');
      fill.style.setProperty('--w', (vals.length ? n / vals.length * 100 : 0) + '%'); row.append(el('span', o), fill, el('b', String(n))); viz.append(row);
    } else if (f.type === 'scale' || f.type === 'number') {
      const nums = vals.map(Number), avg = nums.length ? nums.reduce((x, y) => x + y, 0) / nums.length : 0;
      viz.append(el('p', t('average', {n: avg.toFixed(1)}), 'fpavg'));
      if (f.type === 'scale') for (let v = 1; v <= 5; v++) { const n = nums.filter(x => x === v).length, row = el('div', undefined, 'fpbar'), fill = el('div', undefined, 'fill'); fill.style.setProperty('--w', (nums.length ? n / nums.length * 100 : 0) + '%'); row.append(el('span', String(v)), fill, el('b', String(n))); viz.append(row); }
    } else {   // words, text, long, date: a cloud sized by frequency
      const cloud = el('div', undefined, 'cloud'), top = words(q), max = top[0]?.[1] ?? 1;
      for (const [w, n] of top) { const sp = el('span', w); sp.style.setProperty('--s', String(1 + 2 * (n - 1) / Math.max(1, max - 1))); sp.title = String(n); cloud.append(sp); }
      viz.append(cloud);
    }
  }
  $('present').hidden = false;
  $('present').onclick = async () => {
    presenting = true; view.hidden = false; drawQr($<HTMLCanvasElement>('fpqr'), publicLink, 6); $('fplink').textContent = publicLink.replace(/^https?:\/\//, '');
    drawSlide(); view.focus();   // labelled and focused before the state is stored, so the view is never shown half ready
    await publish(); view.requestFullscreen?.().catch(() => {});
  };
  const exit = () => { presenting = false; view.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); $('present').focus(); };
  $('fpexit').onclick = exit;
  $('fpprev').onclick = () => { if (q > 0) { q--; publish(); } };
  $('fpnext').onclick = () => { if (q < form.fields.length - 1) { q++; publish(); } };
  $('fpreveal').onclick = () => { reveal = !reveal; publish(); };
  view.onkeydown = e => { if (e.key === 'ArrowRight' || e.key === ' ') $('fpnext').click(); else if (e.key === 'ArrowLeft') $('fpprev').click(); else if (e.key === 'r' || e.key === 'R') $('fpreveal').click(); else if (e.key === 'Escape') exit(); else return; e.preventDefault(); };
}
