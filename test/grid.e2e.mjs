// The planner's grid with many options: 14 days, 8 to 21, so 14 columns and 52 quarter-hour rows.
// Readable: every hour has a visible label at its own height, headers stay put while scrolling,
// cells are never squeezed below a usable size, nothing overflows the card. Selectable: a dragged
// rectangle selects exactly the cells it covers, Shift extends, the keyboard toggles one cell,
// and the sent answer comes back as a heat map whose levels are visibly distinct. Also on a phone.
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT} from './tab.mjs';
const {Tab, fail} = await launch(9289, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const M = randomBytes(16).toString('base64url');
const a = await Tab.open(ROOT + 'when/#' + M);
await a.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20 && 'yes'`);
await a.eval(`(() => { const d = [...document.querySelectorAll('#days button')]; const ev = (el, type) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1})); for (let i = 0; i < 14; i++) { ev(d[i], 'pointerdown'); ev(window, 'pointerup'); }
  document.getElementById('ename').value = 'Two weeks'; document.getElementById('start').value = '8'; document.getElementById('end').value = '21'; document.getElementById('go').click(); })()`);
const url = await a.until(`!document.getElementById('event').hidden && document.querySelectorAll('#editor .cell').length > 0 && location.href`);

const measure = `(() => { const g = document.getElementById('editor'), cells = [...g.querySelectorAll('.cell')], r = c => c.getBoundingClientRect();
  const labels = [...g.querySelectorAll('.labels span')].map(s => ({text: s.textContent, top: Math.round(r(s).top + r(s).height / 2), h: r(s).height, w: r(s).width}));   // the label's middle sits on the hour line
  const tops = labels.map(l => l.top), distinct = new Set(tops).size === tops.length, gap = Math.min(...tops.slice(1).map((t, i) => t - tops[i]));
  const hourLines = [...g.querySelectorAll('.cell')].filter(c => !c.classList.contains('q') && !c.classList.contains('half')).map(c => Math.round(r(c).top)).concat(Math.round(r(cells[cells.length - 1]).bottom));   // plus the closing line, which has a label too
  const aligned = labels.every(l => hourLines.some(y => Math.abs(y - l.top) <= 1));
  const heads = [...g.querySelectorAll('.col .head')].map(h => h.textContent);
  return JSON.stringify({cols: g.querySelectorAll('.col').length, cells: cells.length, cellW: Math.round(r(cells[0]).width), cellH: Math.round(r(cells[0]).height), labels: labels.length, labelsDistinct: distinct, labelGap: gap, labelsOnHourLines: aligned, labelVisible: labels.every(l => l.h > 0 && l.w > 0), heads: heads.slice(0, 3), scrollsX: g.scrollWidth > g.clientWidth, cardOverflow: document.getElementById('event').scrollWidth - document.getElementById('event').clientWidth}); })()`;
const readable = (name, m) => {
  if (m.cols !== 14 || m.cells !== 14 * 52) fail(`${name}: expected 14 columns of 52 cells, got ${JSON.stringify(m)}`);
  if (m.labels !== 14 || !m.labelsDistinct || !m.labelVisible || !m.labelsOnHourLines) fail(`${name}: hour labels should be 14, visible, distinct and on the hour lines: ${JSON.stringify(m)}`);
  if (m.labelGap < 30) fail(`${name}: hour labels too close (${m.labelGap}px)`);
  if (m.cellW < 40 || m.cellH < 10) fail(`${name}: cells squeezed to ${m.cellW}x${m.cellH}`);
  if (m.cardOverflow > 0) fail(`${name}: the grid overflows the card by ${m.cardOverflow}px`);
  console.log(name, 'readable:', JSON.stringify(m));
};
readable('desktop', JSON.parse(await a.eval(measure)));

// headers and the time column stay put while the grid scrolls
await a.eval(`(() => { const g = document.getElementById('editor'); g.scrollTop = 200; g.scrollLeft = 300; })(); 1`); await sleep(200);
const stuck = JSON.parse(await a.eval(`(() => { const g = document.getElementById('editor'), gr = g.getBoundingClientRect(), h = g.querySelector('.col .head').getBoundingClientRect(), l = g.querySelector('.labels').getBoundingClientRect(); return JSON.stringify({headTop: Math.round(h.top - gr.top), labelsLeft: Math.round(l.left - gr.left), scrolled: [g.scrollTop, g.scrollLeft]}); })()`));
if (stuck.headTop > 1 || stuck.labelsLeft > 1 || stuck.scrolled[0] === 0) fail('headers and labels should stay visible while scrolling: ' + JSON.stringify(stuck));
console.log('sticky', JSON.stringify(stuck));
await a.eval(`document.getElementById('editor').scrollTo(0, 0); 1`);

// a dragged rectangle over columns 2..5 and rows 8..15 selects exactly 4 x 8 cells
const cell = (x, y) => `document.querySelector('#editor .cell[data-x="${x}"][data-y="${y}"]')`;
await a.eval(`(() => { const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra})); const from = ${cell(2, 8)}, to = ${cell(5, 15)}, r = to.getBoundingClientRect(); ev(from, 'pointerdown'); ev(document.getElementById('editor'), 'pointermove', {clientX: r.x + 2, clientY: r.y + 2}); ev(window, 'pointerup'); })()`);
const pressed = `[...document.querySelectorAll('#editor .cell[aria-pressed="true"]')].map(c => c.dataset.x + ',' + c.dataset.y)`;
let sel = await a.eval(pressed);
if (sel.length !== 32 || !sel.every(s => { const [x, y] = s.split(',').map(Number); return x >= 2 && x <= 5 && y >= 8 && y <= 15; })) fail('drag should select the 4x8 rectangle, got ' + sel.length + ': ' + sel.slice(0, 6));
// Shift-click extends the rectangle from the last cell; a plain click on a selected cell clears it
await a.eval(`(() => { const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra})); ev(${cell(7, 15)}, 'pointerdown', {shiftKey: true}); ev(window, 'pointerup'); })()`);
sel = await a.eval(pressed);
if (sel.length !== 32 + 16) fail('shift-click should extend by two columns of eight, got ' + sel.length);
await a.eval(`(() => { const ev = (el, type) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1})); ev(${cell(2, 8)}, 'pointerdown'); ev(window, 'pointerup'); })()`);
if ((await a.eval(pressed)).length !== 47) fail('clicking a selected cell should clear just that cell');
// keyboard: a cell is a button with a name; Space toggles it
const named = await a.eval(`(c => c.tagName === 'BUTTON' && c.getAttribute('aria-label'))(${cell(0, 0)})`);
if (!named) fail('cells must be buttons with an accessible name');
await a.eval(`${cell(0, 0)}.focus(); ${cell(0, 0)}.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0})); 1`);
if ((await a.eval(pressed)).length !== 48) fail('keyboard activation should toggle the focused cell');
console.log('selection: drag 32, shift +16, click -1, keyboard +1 → ' + (await a.eval(pressed)).length);

// send as Alice; two more people with different coverage make three heat levels
await a.eval(`document.getElementById('aname').value = 'Alice'; document.getElementById('answer').requestSubmit(); 1`);
await a.until(`document.getElementById('sent').textContent.includes('Alice') && 'yes'`);
for (const [name, x1] of [['Bob', 4], ['Chen', 3]]) {
  const t = await Tab.open(ROOT); await t.until(`document.getElementById('toolgrid') && 'yes'`);
  await t.eval(`localStorage.clear(); location.href = ${JSON.stringify(url)}; 1`);
  await t.until(`!document.getElementById('event').hidden && document.querySelectorAll('#editor .cell').length > 0 && 'yes'`);
  await t.eval(`(() => { const ev = (el, type, extra = {}) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1, ...extra})); const from = ${cell(2, 8)}, to = ${cell(x1, 15)}, r = to.getBoundingClientRect(); ev(from, 'pointerdown'); ev(document.getElementById('editor'), 'pointermove', {clientX: r.x + 2, clientY: r.y + 2}); ev(window, 'pointerup'); document.getElementById('aname').value = '${name}'; document.getElementById('answer').requestSubmit(); })()`);
  await t.until(`document.getElementById('sent').textContent.includes('${name}') && 'yes'`);
  await t.close();
}
await a.eval(`document.getElementById('tab-group').click(); 1`);
await a.until(`document.querySelectorAll('#people li').length === 3 && 'yes'`, 20000);
const levels = JSON.parse(await a.eval(`(() => { const bg = c => getComputedStyle(c).backgroundColor; const px = c => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = c => { const [r, g, b] = px(c).map(v => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const at = (x, y) => document.querySelector('#heat .cell[data-x="' + x + '"][data-y="' + y + '"]');
  return JSON.stringify({none: lum(bg(at(0, 5))), one: lum(bg(at(7, 10))), two: lum(bg(at(4, 10))), three: lum(bg(at(3, 10))), title: at(3, 10).title}); })()`));
const steps = [levels.none, levels.one, levels.two, levels.three];
const monotone = steps.every((v, i) => i === 0 || Math.abs(v - steps[i - 1]) > 0.04) && (steps.every((v, i) => i === 0 || v < steps[i - 1]) || steps.every((v, i) => i === 0 || v > steps[i - 1]));
if (!monotone) fail('heat levels should step visibly and in one direction: ' + JSON.stringify(levels));
if (!/Alice, Bob, Chen/.test(levels.title)) fail('the fullest cell should name all three: ' + levels.title);
console.log('heat levels', JSON.stringify(levels));

// a phone: narrower columns, still above 40px, still scrolling inside the card with the labels stuck
await a.call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true}); await sleep(600);
await a.eval(`document.getElementById('tab-you').click(); 1`); await sleep(300);
const phone = JSON.parse(await a.eval(measure));
if (phone.cellW < 40 || phone.cellH < 10 || !phone.scrollsX || phone.cardOverflow > 0 || !phone.labelVisible) fail('phone grid: ' + JSON.stringify(phone));
console.log('phone', JSON.stringify({cellW: phone.cellW, cellH: phone.cellH, scrollsX: phone.scrollsX, overflow: phone.cardOverflow}));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
