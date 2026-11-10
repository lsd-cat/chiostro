// Time across the planet: an organiser in Tokyo creates an event over the night Europe switches
// to summer time; someone in Los Angeles answers in their own local hours; a viewer in Rome sees
// the same instants on the right local lines; the calendar file carries UTC; and a browser whose
// clock is three days slow cannot sneak an answer past a deadline, because the server's time
// decides. Each tab gets its own time zone through the browser's emulation.
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT} from './tab.mjs';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
const {Tab, profile, fail} = await launch(9309, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const eventReady = `!document.getElementById('event').hidden && document.querySelectorAll('.grid .cell').length > 0 && 'yes'`;
const inZone = async (zone, url) => { const t = await Tab.open('about:blank'); await t.call('Emulation.setTimezoneOverride', {timezoneId: zone}); await t.goto(url); return t; };
const M = randomBytes(16).toString('base64url');

// Tokyo picks 28 and 29 March 2026 (Europe moves its clocks on the 29th), 9 to 18 Tokyo time
const tokyo = await inZone('Asia/Tokyo', ROOT + 'when/#' + M);
await tokyo.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20 && 'yes'`);
await tokyo.eval(`(() => { document.getElementById('month').textContent; const want = ['2026-03-28', '2026-03-29']; let guard = 0;
  const pick = () => { const b = [...document.querySelectorAll('#days button')].filter(x => want.includes(x.dataset.date)); if (b.length === 2) { for (const x of b) { x.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 1})); window.dispatchEvent(new PointerEvent('pointerup')); } return true; } return false; };
  while (!pick() && guard++ < 24) document.getElementById('prev').click(); })(); 1`);
if (await tokyo.eval(`document.querySelectorAll('#days button[aria-pressed="true"]').length`) !== 2) fail('could not pick the two March days');
await tokyo.eval(`document.getElementById('ename').value = 'Planet'; document.getElementById('start').value = '9'; document.getElementById('end').value = '18'; document.getElementById('len').value = '60'; document.getElementById('go').click(); 1`);
const url = await tokyo.until(`${eventReady} && location.href`);
const labelsTokyo = await tokyo.eval(`[...document.querySelectorAll('#editor .labels span')].map(s => s.textContent)`);
console.log('Tokyo sees', labelsTokyo[0], '…', labelsTokyo.at(-1), 'columns', await tokyo.eval(`[...document.querySelectorAll('#editor .col .head')].map(h => h.textContent).join(', ')`));

// Los Angeles opens the same event: the same instants are the previous local day and evening hours
const la = await inZone('America/Los_Angeles', url); await la.until(eventReady);
const laView = JSON.parse(await la.eval(`JSON.stringify({labels: [...document.querySelectorAll('#editor .labels span')].map(s => s.textContent), heads: [...document.querySelectorAll('#editor .col .head')].map(h => h.textContent), cells: document.querySelectorAll('#editor .cell').length})`));
console.log('LA sees', laView.labels[0], '…', laView.labels.at(-1), 'columns', laView.heads.join(', '));
if (laView.labels[0] === labelsTokyo[0] || laView.cells !== await tokyo.eval(`document.querySelectorAll('#editor .cell').length`)) fail('LA must see the same slots on its own hours');
// LA marks the first four slots of the first column: 9:00 to 10:00 Tokyo on the 28th, which is 17:00 to 18:00 the 27th in LA
// slots are numbered in time order, the same everywhere: the first four are 9:00 to 10:00 Tokyo on the 28th, wherever they sit on LA's grid
await la.eval(`(() => { const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra})); const c = i => document.querySelector('#editor .cell[data-i="' + i + '"]'); const to = c(3).getBoundingClientRect(); ev(c(0), 'pointerdown'); ev(document.getElementById('editor'), 'pointermove', {clientX: to.x + 2, clientY: to.y + 2}); ev(window, 'pointerup'); })(); 1`);
const laPicked = await la.eval(`[...document.querySelectorAll('#editor .cell[aria-pressed="true"]')].map(c => c.dataset.i)`);
const laLabel = await la.eval(`document.querySelector('#editor .cell[aria-pressed="true"]').getAttribute('aria-label')`);
await la.eval(`document.getElementById('aname').value = 'Lee'; document.getElementById('answer').requestSubmit(); 1`);
await la.until(`document.getElementById('sent').textContent.includes('Lee') && 'yes'`);
console.log('LA answered', laPicked.length, 'slots, first:', laLabel);

// Tokyo and Rome see Lee's hour on their own lines: the same slot indexes, labelled locally
await tokyo.eval(`document.getElementById('tab-group').click(); 1`);
const tokyoHeat = await tokyo.until(`(c => c.length === 4 && JSON.stringify(c.map(x => [x.dataset.i, x.title])))([...document.querySelectorAll('#heat .cell')].filter(x => +getComputedStyle(x).getPropertyValue('--p') > 0))`, 20000);
const rome = await inZone('Europe/Rome', url); await rome.until(eventReady);
await rome.eval(`document.getElementById('tab-group').click(); 1`);
const romeHeat = await rome.until(`(c => c.length === 4 && JSON.stringify(c.map(x => [x.dataset.i, x.title])))([...document.querySelectorAll('#heat .cell')].filter(x => +getComputedStyle(x).getPropertyValue('--p') > 0))`, 20000);
const [tk, rm] = [JSON.parse(tokyoHeat), JSON.parse(romeHeat)];
if (tk.length !== laPicked.length || rm.length !== laPicked.length || !tk.every(x => /Lee/.test(x[1])) || !rm.every(x => /Lee/.test(x[1]))) fail('every zone must light the same four slots for Lee: ' + tokyoHeat + ' vs ' + romeHeat);
if (!/9:00/.test(tk[0][1]) || !/1:00/.test(rm[0][1])) fail('Tokyo should read 9:00 and Rome 1:00 for the same instant: ' + tk[0][1] + ' / ' + rm[0][1]);
console.log('same instant:', 'LA', laLabel, '| Tokyo', tk[0][1], '| Rome', rm[0][1]);

// the calendar file: the best hour as UTC, independent of who downloads it (Rome downloads)
await rome.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await rome.until(`document.querySelectorAll('#best button').length > 0 && 'yes'`);
await rome.eval(`document.querySelector('#best button').click(); 1`);
let ics; for (let i = 0; i < 40 && !ics; i++) { ics = readdirSync(profile).find(f => f.endsWith('.ics')); await sleep(250); }
const icsText = readFileSync(join(profile, ics), 'utf8');
const dt = /DTSTART:(\d{8}T\d{6})Z/.exec(icsText);
if (!dt || dt[1] !== '20260328T000000') fail('the invite should start at 00:00 UTC (9:00 Tokyo): ' + dt?.[1]);
console.log('ics starts', dt[1], 'UTC');

// a slow clock cannot beat a deadline: the organiser sets yesterday, a client three days behind still sees the form and submits, the server's time excludes it
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const org = await inZone('Europe/Rome', ROOT + 'when/#' + randomBytes(16).toString('base64url'));
await org.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20 && 'yes'`);
await org.eval(`(() => { const d = document.querySelectorAll('#days button'); d[0].dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 1})); window.dispatchEvent(new PointerEvent('pointerup')); document.getElementById('ename').value = 'Deadline'; document.getElementById('by').value = '${yesterday}'; document.getElementById('go').click(); })(); 1`);
const url2 = await org.until(`${eventReady} && location.href`);
const slow = await Tab.open('about:blank');
await slow.call('Page.addScriptToEvaluateOnNewDocument', {source: `(() => { const skew = 3 * 864e5; const D = Date; const now = () => D.now() - skew; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [now()])); } static now() { return now(); } }; })()`});
await slow.eval(`localStorage.clear(); 1`).catch(() => {}); await slow.goto(url2); await slow.until(eventReady);
if (await slow.eval(`document.getElementById('answer').hidden`)) fail('a client three days behind should still see the answer form');
await slow.eval(`(() => { const c = document.querySelector('#editor .cell'); c.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 1})); window.dispatchEvent(new PointerEvent('pointerup')); document.getElementById('aname').value = 'Late'; document.getElementById('answer').requestSubmit(); })(); 1`);
await slow.until(`document.getElementById('sent').textContent.includes('Late') && 'yes'`);
await org.eval(`document.getElementById('tab-group').click(); 1`); await sleep(1500);
const counted = await org.eval(`document.querySelectorAll('#people li').length`);
if (counted !== 0) fail('an answer stamped by the server after the deadline must not count, got ' + counted);
console.log('late answer with a slow clock: sent, not counted');

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
