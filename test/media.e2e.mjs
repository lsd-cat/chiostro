// Media in a pad fits the column: a landscape clip fills the width, a portrait clip is capped by
// the window height and centred, a wide image fills the width, a tall image is capped too, and
// nothing overflows, on the editor's preview, on the read-only page and at phone width. The clips
// and images are made in the browser (canvas + MediaRecorder) so their sizes are known.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, profile, fail} = await launch(9283);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

// fixtures, made by a page of ours (same origin, so the CSP applies to the recorder too)
const maker = await Tab.open(ROOT); await maker.until(`document.getElementById('toolgrid') && 'yes'`);
const clip = (w, h) => `(async () => { const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h}; const x = c.getContext('2d');
  const stream = c.captureStream(10), rec = new MediaRecorder(stream, {mimeType: 'video/webm'}), parts = [];
  rec.ondataavailable = e => parts.push(e.data); const done = new Promise(r => { rec.onstop = r; }); rec.start(50);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#c00' : '#06c'; x.fillRect(0, 0, c.width, c.height); await new Promise(r => setTimeout(r, 60)); }
  rec.stop(); await done; const b = new Blob(parts, {type: 'video/webm'}); const buf = await b.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf))); })()`;
const image = (w, h) => `(() => { const c = document.createElement('canvas'); c.width = ${w}; c.height = ${h}; const x = c.getContext('2d'); x.fillStyle = '#393'; x.fillRect(0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1]; })()`;
for (const [name, expr] of [['wide.webm', clip(640, 360)], ['tall.webm', clip(360, 640)], ['wide.png', image(2000, 300)], ['tall.png', image(300, 2400)]]) writeFileSync(join(profile, name), Buffer.from(await maker.eval(expr), 'base64'));
await maker.close();

// a pad with the four attachments
const pad = await Tab.open(ROOT + 'pad/'); const url = await pad.until(`!document.getElementById('editor').readOnly && location.href`);
await pad.eval(`(() => { const e = document.getElementById('editor'); e.value = '# Media\\n\\n'; e.setSelectionRange(e.value.length, e.value.length); e.dispatchEvent(new Event('input')); })(); 1`);
await pad.setFiles('#attachfile', ['wide.webm', 'tall.webm', 'wide.png', 'tall.png'].map(n => join(profile, n)));
console.log('attached', await pad.until(`(document.getElementById('editor').value.match(/file:/g) || []).length === 4 && 'four refs'`, 60000));
await pad.eval(`[...document.querySelectorAll('#tools .segmented input')][2].click(); 1`);   // view mode: the document alone
await pad.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);

// what fits: measured boxes against the column and the window
const boxes = `(() => { const col = document.getElementById('preview'); const cw = col.clientWidth - parseFloat(getComputedStyle(col).paddingLeft) - parseFloat(getComputedStyle(col).paddingRight);
  const vh = innerHeight, out = {column: Math.round(cw), overflow: col.scrollWidth - col.clientWidth};
  for (const m of col.querySelectorAll('video, img')) { const r = m.getBoundingClientRect(); const name = m.tagName.toLowerCase() + ':' + (m.videoWidth || m.naturalWidth) + 'x' + (m.videoHeight || m.naturalHeight);
    out[name] = {w: Math.round(r.width), h: Math.round(r.height), centred: Math.abs((r.left + r.right) / 2 - (col.getBoundingClientRect().left + col.clientLeft + col.clientWidth / 2)) < 3, fill: Math.round(r.width / cw * 100), tall: Math.round(r.height / vh * 100)}; }
  return JSON.stringify(out); })()`;
const check = (name, got) => {
  if (got.overflow > 0) fail(`${name}: horizontal overflow of ${got.overflow}px`);
  const wideV = got['video:640x360'], tallV = got['video:360x640'], wideI = got['img:2000x300'], tallI = got['img:300x2400'];
  if (!wideV || !tallV || !wideI || !tallI) fail(`${name}: media missing or sizes unknown: ${JSON.stringify(got)}`);
  if (wideV.fill < 95 && wideV.tall < 70) fail(`${name}: landscape clip should fill the column or the height: ${JSON.stringify(wideV)}`);
  if (Math.abs(wideV.w / wideV.h - 16 / 9) > 0.05) fail(`${name}: landscape player must keep 16:9: ${JSON.stringify(wideV)}`);
  if (tallV.tall > 76 || tallV.fill > 100 || !tallV.centred) fail(`${name}: portrait clip should be capped by the window (or the column on a phone) and centred: ${JSON.stringify(tallV)}`);
  if (Math.abs(tallV.w / tallV.h - 9 / 16) > 0.05) fail(`${name}: portrait player must keep 9:16: ${JSON.stringify(tallV)}`);
  if (wideI.fill < 95 || wideI.tall > 86) fail(`${name}: wide image should fill the column: ${JSON.stringify(wideI)}`);
  if (tallI.tall > 86 || tallI.fill > 100 || !tallI.centred) fail(`${name}: tall image should be capped by the window (or the column) and centred: ${JSON.stringify(tallI)}`);
  console.log(name, 'fits:', JSON.stringify(got));
};
await pad.until(`[...document.querySelectorAll('#preview video')].every(v => v.videoWidth > 0) && [...document.querySelectorAll('#preview img')].every(i => i.naturalWidth > 0) && 'yes'`, 30000);
check('editor view', JSON.parse(await pad.eval(boxes)));

// the read-only page, desktop and phone
const V = await viewKey(await toolKey(url.split('#')[1], 'pad'), 'pad');
const viewer = await Tab.open(ROOT + 'pad/?view#~' + V);
const loaded = `document.body.classList.contains('viewing') && document.querySelectorAll('#preview video').length === 2 && [...document.querySelectorAll('#preview video')].every(v => v.videoWidth > 0) && [...document.querySelectorAll('#preview img')].every(i => i.naturalWidth > 0) && 'yes'`;
await viewer.until(loaded, 30000);
check('read-only', JSON.parse(await viewer.eval(boxes)));
await viewer.call('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true}); await sleep(600);
check('phone', JSON.parse(await viewer.eval(boxes)));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
