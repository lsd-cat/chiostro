// Scheduling: create an event, answer once, see the group heatmap. The room's store holds the
// sealed event and one sealed answer per browser; the socket tells everyone when an answer lands.
import {pad} from '../../core/time.js';
import {t} from '../../core/i18n.js';
import {Answers} from '../../core/answers.js';
import {slots, table, tally, bestRanges, closesAt, isEvent, isPerson, type Event, type Person, type Cell, type Table} from '../../core/apps/when.js';
import {config, start, join, nameOf, title, status, sess, memo} from '../shell.js';
import {$, el, css, download} from '../dom.js';
import {tzPicker, dateLabel} from '../widgets.js';

css('/css/when.css');
start();
const EVENT_SLOT = '0'.repeat(32);   // the event description; answers get random slot names
const lang = document.documentElement.lang;
const core = await join(nameOf());
core.sig.connect();
const store = core.store;
const hourLabel = (m: number) => new Date(Date.UTC(1970, 0, 1) + m * 60000).toLocaleTimeString(lang, {hour: 'numeric', timeZone: 'UTC'});
const slotLabel = (min: number, tz: string) => new Date(min * 60000).toLocaleString(lang, {timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
const minutes = (m: number) => m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`;

const evData = await store.get(EVENT_SLOT);
if (isEvent(evData)) await showEvent(evData); else showCreate();

function showCreate() {
  $('create').hidden = false;
  // Calendar: click toggles a day; drag or shift-click selects a run of days.
  let picked = new Set<string>();
  let view = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const days = $('days');
  const render = () => {
    $('month').textContent = view.toLocaleDateString(lang, {month: 'long', year: 'numeric'});
    days.replaceChildren();
    for (let i = 0; i < 7; i++) { const h = el('small', new Date(2024, 0, 1 + i).toLocaleDateString(lang, {weekday: 'narrow'})); h.ariaHidden = 'true'; days.append(h); }   // 2024-01-01 is a Monday
    for (let i = (view.getDay() + 6) % 7; i > 0; i--) days.append(el('span'));
    const n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const key = `${view.getFullYear()}-${pad(view.getMonth() + 1)}-${pad(d)}`;
      const b = el('button', String(d)); b.type = 'button'; b.dataset['date'] = key; b.ariaLabel = dateLabel(key, {weekday: 'long', month: 'long', day: 'numeric'});
      days.append(b);
    }
    paint();
  };
  const paint = () => { for (const b of days.querySelectorAll<HTMLButtonElement>('button')) b.ariaPressed = String(picked.has(b.dataset['date']!)); };
  const keys = () => [...days.querySelectorAll<HTMLButtonElement>('button')].map(b => b.dataset['date']!);
  let last: string | null = null, drag: {from: string; on: boolean; base: Set<string>} | null = null;
  const apply = (from: string, to: string, on: boolean, base: Set<string>) => {
    picked = new Set(base);
    const k = keys(), [i, j] = [k.indexOf(from), k.indexOf(to)].sort((a, b) => a - b) as [number, number];
    for (const key of k.slice(i, j + 1)) if (on) picked.add(key); else picked.delete(key);
    paint();
  };
  const begin = (key: string, shift: boolean) => {
    const from = shift && last ? last : key;
    drag = {from, on: shift && last ? picked.has(last) : !picked.has(key), base: new Set(picked)};
    apply(from, key, drag.on, drag.base);
    last = key;
  };
  days.onpointerdown = e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return; e.preventDefault(); begin(b.dataset['date']!, e.shiftKey); };
  days.onpointermove = e => { const b = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLButtonElement>('#days button'); if (drag && b) apply(drag.from, b.dataset['date']!, drag.on, drag.base); };
  days.onclick = e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (b && e.detail === 0) { begin(b.dataset['date']!, e.shiftKey); drag = null; } };   // keyboard
  window.addEventListener('pointerup', () => { drag = null; });
  $('prev').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); };
  $('next').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); };
  render();
  for (const [id, def] of [['start', 9], ['end', 17]] as const) for (let h = 0; h <= 24; h++) $<HTMLSelectElement>(id).append(new Option(hourLabel(h * 60), String(h), false, h === def));
  for (const m of [15, 30, 45, 60, 90, 120, 180, 240]) $<HTMLSelectElement>('len').append(new Option(minutes(m), String(m), false, m === 60));
  const tz = tzPicker($('ctz'), () => {});
  $('go').onclick = async () => {
    const by = $<HTMLInputElement>('by').value;
    const ev: Event = {name: $<HTMLInputElement>('ename').value.trim(), dates: [...picked].sort(), start: +$<HTMLSelectElement>('start').value, end: +$<HTMLSelectElement>('end').value, tz: tz(),
      len: +$<HTMLSelectElement>('len').value, ...(by && {by})};
    if (!ev.dates.length) return void ($('err').textContent = t('noDates'));
    if (ev.start === ev.end) return void ($('err').textContent = t('sameTimes'));
    const st = await store.put(EVENT_SLOT, ev);
    if (st >= 300) return void ($('err').textContent = t('createFailed', {status: st}));
    location.reload();
  };
}

async function showEvent(ev: Event) {
  const all = slots(ev);
  const closes = closesAt(ev), closed = Date.now() > closes;
  const answers = new Answers<Person>(store, (x): x is Person => isPerson(x, all.length), closes);
  let people: Person[] = await answers.all(EVENT_SLOT);   // late answers do not count
  let who = tally(people, all.length);

  $('event').hidden = false;
  title(ev.name || t('untitledEvent'));
  if (ev.by) status(closed ? t('closedSince', {date: dateLabel(ev.by, {dateStyle: 'long'})}) : t('answerBy', {date: dateLabel(ev.by, {dateStyle: 'long'})}));
  const meetKey = config.apps.includes('meet') ? await sess.toolKey('meet') : null;   // the call's own link, only from a meeting link
  const callLink = meetKey ? `${location.origin}/meet/#~${meetKey}` : '';
  const tabYou = $<HTMLInputElement>('tab-you'), tabGroup = $<HTMLInputElement>('tab-group');
  const showTab = () => { $('you').hidden = !tabYou.checked; $('group').hidden = tabYou.checked; };
  tabYou.onchange = tabGroup.onchange = showTab;
  const editor = $('editor'), heat = $('heat');

  // Your answer: one per browser, final once sent (the server refuses a second write to a slot and there is no delete).
  const sent = memo('when:' + core.sig.roomId) as {name: string; avail: string} | null;
  const mine = new Uint8Array(all.length);
  if (sent) { [...sent.avail].forEach((c, i) => { mine[i] = c === '1' ? 1 : 0; }); $('sent').textContent = t('sentAs', {name: sent.name}); }
  const locked = !!sent || closed;
  if (locked) { $('answer').hidden = true; tabGroup.checked = true; }
  showTab();
  let drag: {x0: number; y0: number; x1: number; y1: number; on: boolean} | null = null, lastCell: HTMLElement | null = null;
  const inRect = (c: HTMLElement) => !!drag && +c.dataset['x']! >= Math.min(drag.x0, drag.x1) && +c.dataset['x']! <= Math.max(drag.x0, drag.x1) && +c.dataset['y']! >= Math.min(drag.y0, drag.y1) && +c.dataset['y']! <= Math.max(drag.y0, drag.y1);
  const paint = () => { for (const c of editor.querySelectorAll<HTMLElement>('.cell')) c.ariaPressed = String(inRect(c) ? drag!.on : !!mine[+c.dataset['i']!]); };
  const commit = () => { if (!drag) return; for (const c of editor.querySelectorAll<HTMLElement>('.cell')) if (inRect(c)) mine[+c.dataset['i']!] = drag.on ? 1 : 0; drag = null; paint(); };
  const begin = (c: HTMLElement, shift: boolean) => {   // shift: rectangle from the last cell, like the calendar
    const from = shift && lastCell ? lastCell : c;
    drag = {x0: +from.dataset['x']!, y0: +from.dataset['y']!, x1: +c.dataset['x']!, y1: +c.dataset['y']!, on: shift && lastCell ? lastCell.ariaPressed === 'true' : c.ariaPressed !== 'true'};
    lastCell = c; paint();
  };
  editor.onpointerdown = e => { const c = (e.target as HTMLElement).closest<HTMLElement>('.cell'); if (!c || locked) return; e.preventDefault(); begin(c, e.shiftKey); };
  editor.onpointermove = e => { const c = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('#editor .cell'); if (drag && c) { drag.x1 = +c.dataset['x']!; drag.y1 = +c.dataset['y']!; paint(); } };
  editor.onclick = e => { const c = (e.target as HTMLElement).closest<HTMLElement>('.cell'); if (c && e.detail === 0 && !locked) { begin(c, e.shiftKey); commit(); } };   // keyboard
  window.addEventListener('pointerup', commit);
  $<HTMLFormElement>('answer').onsubmit = async e => {
    e.preventDefault();
    const name = $<HTMLInputElement>('aname').value.trim(); if (!name) return;
    const answer: Person = {name, avail: [...mine].join('')};
    const st = await answers.submit(answer);
    if (st >= 300) return void ($('senderr').textContent = t('sendFailed', {status: st}));
    memo('when:' + core.sig.roomId, answer);
    memo('name', name);
    location.reload();
  };

  // Group: heat per slot, names on hover, best times as text with a calendar file each
  const group = () => {
    who = tally(people, all.length);
    $('grouplabel').textContent = t('groupTab', {n: people.length});
    $('legendmax').textContent = t('available', {n: people.length, total: people.length});
    $('legendmin').textContent = t('available', {n: 0, total: people.length});
    $('who').textContent = people.length ? t('hoverHint') : t('noAnswersShare');
    $('people').replaceChildren(...people.map(p => el('li', p.name)));
  };
  group();
  store.onChange = async () => { people = await answers.all(EVENT_SLOT); group(); draw(); };   // someone answered: redraw live
  $<HTMLInputElement>('aname').value = nameOf();

  const draw = () => {
    const tz = vtz();
    const tb = table(all, tz);
    grid(editor, tb, c => { const b = el('button'); b.type = 'button'; b.ariaLabel = slotLabel(c.slot, tz); b.ariaPressed = String(!!mine[c.i]); b.dataset['i'] = String(c.i); b.disabled = locked; return b; });
    grid(heat, tb, c => { const d = el('div'); const names = who[c.i]!; d.style.setProperty('--p', String(people.length ? names.length / people.length : 0));
      d.title = `${slotLabel(c.slot, tz)}: ${names.join(', ')}`;
      d.onpointerenter = () => { $('who').textContent = `${t('available', {n: names.length, total: people.length})} · ${slotLabel(c.slot, tz)}` + (names.length ? ` · ${names.join(', ')}` : ''); };
      return d; });
    const best = $('best'); best.replaceChildren();
    // Each overlap becomes one invite of the planned length (default 1 h) from the start of the overlap, or the overlap itself if shorter.
    const len = ev.len ?? 60, max = Math.max(0, ...who.map(w => w.length));
    if (max) for (const [from, to, names] of bestRanges(all, who, max).slice(0, 8)) {
      const until = Math.min(to, from + len);
      const li = el('li', `${slotLabel(from, tz)} – ${new Date(to * 60000).toLocaleTimeString(lang, {timeZone: tz, hour: 'numeric', minute: '2-digit'})} · ${t('available', {n: names.length, total: people.length})} `);
      const a = el('button', t('addToCalendar', {len: minutes(until - from)})); a.className = 'link';
      a.onclick = () => download(new Blob([ics(ev.name || t('untitledEvent'), from, until, callLink)], {type: 'text/calendar'}), `${(ev.name || 'event').replace(/[^\w-]+/g, '_')}.ics`);
      li.append(a); best.append(li);
    }
  };
  const vtz = tzPicker($('vtz'), draw);
  draw();
}

/** One calendar event in UTC. The call link is the location, URL and description, so every calendar app shows it. */
function ics(summary: string, fromMin: number, toMin: number, link: string): string {
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//when//EN', 'BEGIN:VEVENT', `UID:${crypto.randomUUID()}`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(fromMin * 60000)}`, `DTEND:${stamp(toMin * 60000)}`,
    `SUMMARY:${esc(summary)}`, ...(link ? [`LOCATION:${esc(link)}`, `URL:${link}`, `DESCRIPTION:${esc(link)}`] : []), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/** The crab.fit grid: an hour-label column, then a column per date made of one cell per quarter hour. */
function grid(target: HTMLElement, tb: Table, cell: (c: NonNullable<Cell>) => HTMLElement) {
  target.replaceChildren();
  const labels = el('div', undefined, 'labels'); labels.ariaHidden = 'true';
  for (const m of tb.rows) { const d = el('div', undefined, 'slot'); if (m != null && m % 60 === 0) d.append(el('span', hourLabel(m))); labels.append(d); }
  target.append(labels);
  tb.cols.forEach((col, x) => {
    if (!col) return void target.append(el('div', undefined, 'spacer'));
    const times = el('div', undefined, 'times');
    if (!tb.cols[x - 1]) times.classList.add('first');
    if (!tb.cols[x + 1]) times.classList.add('last');
    col.cells.forEach((c, y) => {
      if (y === col.cells.length - 1) return;   // end cap row: label only
      const e = c ? cell(c) : el('div');
      e.classList.add('slot', c ? 'cell' : 'gap');
      const m = tb.rows[y]! % 60;
      if (m === 30) e.classList.add('half'); else if (m !== 0) e.classList.add('q');
      e.dataset['x'] = String(x); e.dataset['y'] = String(y);
      times.append(e);
    });
    const column = el('div', undefined, 'col');
    const head = el('div', undefined, 'head'); head.ariaHidden = 'true'; head.append(el('small', dateLabel(col.date, {month: 'short', day: 'numeric'})), el('b', dateLabel(col.date, {weekday: 'short'})));
    column.append(head, times);
    target.append(column);
  });
}
