// Scheduling app in headless Chrome: create an event, two people answer, heatmap and write-once hold.
// Needs OpenResty running (openresty -p openresty -c nginx.conf) and Chrome; no npm deps.
import {createHash, randomBytes} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {launch, sleep, ROOT, toolKey} from './tab.mjs';
const {Tab, profile, fail} = await launch(9223);
const BASE = ROOT + 'when/';

process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const eventReady = `!document.getElementById('event').hidden && document.querySelectorAll('#editor .cell').length > 0 && location.href`;
const pressed = `document.querySelectorAll('#editor .cell[aria-pressed="true"]').length`;
const cell = (x, y) => `document.querySelector('#editor .cell[data-x="${x}"][data-y="${y}"]')`;

const M = randomBytes(16).toString('base64url');
const a = await Tab.open(BASE + '#' + M);
await a.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20`);
// two consecutive days, 9–17 in the browser zone (the defaults), name
// drag from the 1st to the 3rd day, then shift-click the 4th: four days; click the 4th again: three
await a.eval(`(() => { const d = [...document.querySelectorAll('#days button')]; const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra}));
  const r = d[2].getBoundingClientRect(); ev(d[0], 'pointerdown'); ev(document.getElementById('days'), 'pointermove', {clientX: r.x + 2, clientY: r.y + 2}); ev(window, 'pointerup');
  ev(d[3], 'pointerdown', {shiftKey: true}); ev(window, 'pointerup'); })()`);
if (await a.eval(`document.querySelectorAll('#days button[aria-pressed="true"]').length`) !== 4) fail('drag + shift-click should pick four days');
await a.eval(`(() => { const d = [...document.querySelectorAll('#days button')]; const ev = (el, type) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1})); ev(d[3], 'pointerdown'); ev(window, 'pointerup'); })()`);
if (await a.eval(`document.querySelectorAll('#days button[aria-pressed="true"]').length`) !== 3) fail('clicking a picked day should unpick it');
await a.eval(`document.getElementById('ename').value = 'Team lunch'; document.getElementById('by').value = '2099-01-01'; document.getElementById('len').value = '30'; document.getElementById('go').click(); 1`);
const url = await a.until(eventReady); console.log('event', url);
if (!url.includes('#')) fail('no key in the URL');
console.log('columns', await a.eval(`document.querySelectorAll('#editor .col').length`));
if (await a.eval(`document.querySelectorAll('#editor .col').length`) !== 3) fail('expected three date columns');
console.log('header', await a.eval(`document.getElementById('hstatus').textContent + ' | nav: ' + [...document.querySelectorAll('#nav a')].map(a => a.getAttribute('href')).join(' ')`));
if (!await a.eval(`[...document.querySelectorAll('#nav a')].some(a => a.getAttribute('href') === '/meet/#${M}')`)) fail('no call link with the same key');
// Alice drags a 2 x 4 rectangle: pointerdown on (0,0), move onto (1,3), release
await a.eval(`(() => { const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra}));
  const from = ${cell(0, 0)}, to = ${cell(1, 3)}, r = to.getBoundingClientRect();
  ev(from, 'pointerdown'); ev(document.getElementById('editor'), 'pointermove', {clientX: r.x + r.width / 2, clientY: r.y + r.height / 2}); ev(window, 'pointerup'); })()`);
console.log('A pressed', await a.eval(pressed));
if (await a.eval(pressed) !== 8) fail('drag selection should mark 8 slots');
await a.eval(`document.getElementById('aname').value = 'Alice'; document.getElementById('answer').requestSubmit(); 1`);
console.log('A sent', await a.until(`document.getElementById('sent').textContent.includes('Alice') && document.getElementById('answer').hidden && document.getElementById('sent').textContent`));
if (await a.eval(`document.querySelectorAll('#editor .cell[aria-pressed="true"]').length`) !== 8) fail('own answer should be shown read-only after sending');
console.log('A best', await a.eval(`document.getElementById('best').textContent`));
if (await a.eval(`document.querySelectorAll('#best li').length`) !== 2) fail('expected one best range per day');
// the calendar file is a real download (a blob URL; the page's CSP rightly refuses to fetch it)
await a.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await a.eval(`document.querySelector('#best button').click(); 1`);
let icsFile; for (let i = 0; i < 40 && !icsFile; i++) { icsFile = readdirSync(profile).find(f => f.endsWith('.ics')); await sleep(250); }
if (!icsFile) fail('no .ics downloaded');
const icsText = readFileSync(join(profile, icsFile), 'utf8'); console.log('ics', icsFile, icsText.length, 'bytes');
const [, st, en] = icsText.match(/DTSTART:\d{8}T(\d{4})\d{2}Z[^]*DTEND:\d{8}T(\d{4})\d{2}Z/);   // 1 h overlap, 30 min planned
if ((+en.slice(0, 2) * 60 + +en.slice(2)) - (+st.slice(0, 2) * 60 + +st.slice(2)) !== 30) fail('invite should be the planned 30 min, got ' + st + '-' + en);
if (!/BEGIN:VEVENT[^]*DTSTART:\d{8}T\d{6}Z[^]*SUMMARY:Team lunch[^]*LOCATION:http:\/\/127\.0\.0\.1:8080\/meet\/#[^]*URL:http:\/\/127\.0\.0\.1:8080\/meet\/#/.test(icsText)) fail('bad ics: ' + icsText);
console.log('A heat', await a.eval(`document.querySelectorAll('#heat .cell').length + ' cells, ' + [...document.querySelectorAll('#heat .cell')].filter(c => c.style.getPropertyValue('--p') === '1').length + ' full'`));

// Bob: another browser (same profile, so forget Alice's local record), answers one slot by keyboard
const b = await Tab.open(BASE.replace(/when\/$/, ''));   // the landing page, same origin: forget Alice's local record there
await b.until(`document.getElementById('toolgrid') && 'yes'`);
await b.eval(`localStorage.clear(); location.href = ${JSON.stringify(url)}; 1`);   // a different path: a real navigation
await b.until(eventReady);
if (await b.eval(`document.getElementById('answer').hidden`)) fail('Bob should be able to answer');
console.log('B sees', await b.eval(`document.getElementById('people').textContent`));
await b.eval(`${cell(0, 0)}.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0})); 1`);
if (await b.eval(pressed) !== 1) fail('keyboard toggle should mark one slot');
await b.eval(`document.getElementById('aname').value = 'Bob'; document.getElementById('answer').requestSubmit(); 1`);
await b.until(`document.getElementById('sent').textContent.includes('Bob') && 'yes'`);
const heat = await b.eval(`JSON.stringify({people: document.getElementById('people').textContent, full: [...document.querySelectorAll('#heat .cell')].filter(c => c.style.getPropertyValue('--p') === '1').length, half: [...document.querySelectorAll('#heat .cell')].filter(c => c.style.getPropertyValue('--p') === '0.5').length})`);
console.log('B heat', heat);
if (heat !== '{"people":"AliceBob","full":1,"half":7}') fail('heatmap should show 1 slot with both, 7 with Alice only');
// a second write to any existing slot is refused by the server, no matter who sends it
const id = createHash('sha256').update('when:' + await toolKey(url.split('#')[1], 'when')).digest('hex');
const again = await fetch(`${ROOT}blob/when/${id}/${'0'.repeat(32)}`, {method: 'PUT', body: 'x'});
console.log('rewrite event blob', again.status);
if (again.status !== 409) fail('store must refuse overwriting');
// a blob not sealed with the link key is ignored by clients
await fetch(`${ROOT}blob/when/${id}/${'f'.repeat(32)}`, {method: 'PUT', body: 'garbage'});
await b.call('Page.reload'); await b.until(eventReady);
if (await b.eval(`document.getElementById('people').textContent`) !== 'AliceBob') fail('junk blob leaked into the people list');
for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
