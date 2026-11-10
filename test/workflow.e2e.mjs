// A whole pad workflow, two people at once: Alice opens a pad from the meeting link, Bob joins by
// its tool link; they type concurrently and converge; Alice attaches an image and Bob a video
// clip; Alice adds a front-matter theme and slide breaks; both see three themed slides with the
// media in them; the slides export to a landscape PDF, one page per slide, with the image in it;
// a read-only reader sees the same; Alice presents and steps to the last slide.
import {writeFileSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
import {pdfInfo} from './fixtures.mjs';
const {Tab, profile, fail} = await launch(9307, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
const type = (s, at = null) => `(() => { const e = document.getElementById('editor'); const p = ${at === null ? 'e.value.length' : at}; e.value = e.value.slice(0, p) + ${JSON.stringify(s)} + e.value.slice(p); e.setSelectionRange(p + ${JSON.stringify(s)}.length, p + ${JSON.stringify(s)}.length); e.dispatchEvent(new Event('input')); })(); 1`;

// fixtures: a 2x2 PNG and a real 640x360 clip recorded in the browser
const maker = await Tab.open(ROOT); await maker.until(`document.getElementById('toolgrid') && 'yes'`);
// the image is one the browser encoded itself (what a pasted screenshot is), so the typesetter is held to real PNGs
writeFileSync(join(profile, 'dot.png'), Buffer.from(await maker.eval(`(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d'); x.fillStyle = '#393'; x.fillRect(0, 0, 320, 180); x.fillStyle = '#fff'; x.fillRect(40, 40, 240, 100); return c.toDataURL('image/png').split(',')[1]; })()`), 'base64'));
writeFileSync(join(profile, 'clip.webm'), Buffer.from(await maker.eval(`(async () => { const c = document.createElement('canvas'); c.width = 640; c.height = 360; const x = c.getContext('2d');
  const rec = new MediaRecorder(c.captureStream(10), {mimeType: 'video/webm'}), parts = []; rec.ondataavailable = e => parts.push(e.data); const done = new Promise(r => { rec.onstop = r; }); rec.start(50);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#c00' : '#06c'; x.fillRect(0, 0, 640, 360); await new Promise(r => setTimeout(r, 60)); }
  rec.stop(); await done; const buf = await new Blob(parts, {type: 'video/webm'}).arrayBuffer(); return btoa(String.fromCharCode(...new Uint8Array(buf))); })()`), 'base64'));
await maker.close();

// Alice from the meeting link, Bob from the pad's tool link with his own author id
const M = randomBytes(16).toString('base64url');
const a = await Tab.open(ROOT + 'pad/#' + M); const url = await a.until(ready);
const T = await toolKey(url.split('#')[1], 'pad');
const b = await Tab.open(ROOT); await b.until(`document.getElementById('toolgrid') && 'yes'`);
await b.eval(`localStorage.setItem('author', 'b0bb0bb0'); localStorage.setItem('name', 'Bob'); location.href = ${JSON.stringify(ROOT + 'pad/#~' + T)}; 1`); await b.until(ready);
console.log('two editors', await a.until(`document.getElementById('hstatus').textContent.includes('2 online') && document.getElementById('hstatus').textContent`));

// concurrent typing: Alice the head of the document, Bob the tail, both in bursts at the same time
const burst = (parts, atEnd, gap) => `(async () => { const e = document.getElementById('editor'); let cur = 0; for (const s of ${JSON.stringify(parts)}) { const p = ${atEnd ? 'e.value.length' : 'cur'}; e.value = e.value.slice(0, p) + s + e.value.slice(p); cur = p + s.length; e.setSelectionRange(cur, cur); e.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, ${gap})); } })()`;   // Alice types at her own cursor from the top, Bob appends at the end
await Promise.all([
  a.eval(burst(['# Field guide\n', '\nIntro by Alice.\n', '\n---\n', '\n## Setup\n'], false, 40)),
  b.eval(burst(['\n---\n', '\n## Deploy by Bob\n', '\nLast words.\n'], true, 55)),
]);
await sleep(1500);
const [ta, tb] = [await a.eval(text), await b.eval(text)];
if (ta !== tb) fail(`diverged: ${JSON.stringify(ta)} vs ${JSON.stringify(tb)}`);
if (!ta.includes('Intro by Alice') || !ta.includes('Deploy by Bob') || (ta.match(/^---$/gm) ?? []).length !== 2) fail('both contributions and both slide breaks should be present: ' + JSON.stringify(ta));
console.log('converged', JSON.stringify(ta));

// attachments from both sides: Alice an image into the Setup slide, Bob a clip into his slide
await a.eval(`(() => { const e = document.getElementById('editor'); const p = e.value.indexOf('## Setup') + '## Setup\\n'.length; e.setSelectionRange(p, p); })(); 1`);
await a.setFiles('#attachfile', [join(profile, 'dot.png')]);
await a.until(`/!\\[dot\\.png\\]\\(file:[0-9a-f]{32}\\)/.test(${text}) && 'yes'`, 30000);
await b.until(`${text}.includes('![dot.png](file:') && 'yes'`, 20000);
await b.eval(`(() => { const e = document.getElementById('editor'); e.setSelectionRange(e.value.length, e.value.length); })(); 1`);
await b.setFiles('#attachfile', [join(profile, 'clip.webm')]);
await b.until(`/!\\[clip\\.webm\\]\\(file:[0-9a-f]{32}\\)/.test(${text}) && 'yes'`, 30000);
writeFileSync(join(profile, 'notes.txt'), 'hello from the notes\n');
writeFileSync(join(profile, 'photo.webp'), Buffer.from(await b.eval(`(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 90; const x = c.getContext('2d'); x.fillStyle = '#c60'; x.fillRect(0, 0, 160, 90); return c.toDataURL('image/webp').split(',')[1]; })()`), 'base64'));
await b.setFiles('#attachfile', [join(profile, 'notes.txt'), join(profile, 'photo.webp')]);
await b.until(`/\\[notes\\.txt\\]\\(file:[0-9a-f]{32}\\)/.test(${text}) && /!\\[photo\\.webp\\]\\(file:[0-9a-f]{32}\\)/.test(${text}) && 'yes'`, 30000);
await a.until(`${text}.includes('![clip.webm](file:') && 'yes'`, 20000);
console.log('attached', await a.until(`(i => i && i.naturalWidth === 320 && 'image')(document.querySelector('#preview img'))`, 30000), 'and', await b.until(`(v => v && v.videoWidth === 640 && 'video')(document.querySelector('#preview video'))`, 30000));

// Alice themes the document from front matter; both previews take the accent
await a.eval(type('---\naccent: #00aa55\n---\n', 0));
console.log('themed', await a.until(`document.getElementById('preview').style.getPropertyValue('--accent') === '#00aa55' && 'Alice'`), await b.until(`document.getElementById('preview').style.getPropertyValue('--accent') === '#00aa55' && 'Bob'`, 20000));

// slides view: three slides, the image in the second, the video in the third, on both sides
for (const [t, who] of [[a, 'Alice'], [b, 'Bob']]) {
  await t.eval(`document.querySelector('input[name="view"][value="slides"]').click(); 1`);
  console.log(who, 'slides', await t.until(`(s => s.length === 3 && s[1].querySelector('img') && s[2].querySelector('video') && s.map(x => x.querySelector('h2, h3')?.textContent).join(' | '))([...document.querySelectorAll('#preview .slide')])`, 20000));
}

// PDF: one landscape page per slide, the image embedded; the document view paginates portrait
const pages = pdf => (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const slidesPdf = Buffer.from((await a.call('Page.printToPDF', {preferCSSPageSize: true})).result.data, 'base64').toString('latin1');
const box = /MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(slidesPdf);
if (pages(slidesPdf) !== 3 || !box || +box[1] < +box[2]) fail(`slides PDF: ${pages(slidesPdf)} pages, box ${box?.[0]}`);
if (!/\/Subtype\s*\/Image/.test(slidesPdf)) fail('the attached image should be in the PDF');
await a.eval(`document.querySelector('input[name="view"][value="view"]').click(); 1`); await sleep(400);
const docPdf = Buffer.from((await a.call('Page.printToPDF', {preferCSSPageSize: true})).result.data, 'base64').toString('latin1');
const dbox = /MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(docPdf);
if (pages(docPdf) < 1 || !dbox || +dbox[1] > +dbox[2]) fail('document PDF should be portrait');
console.log('pdf: slides', pages(slidesPdf), 'landscape pages with the image; document', pages(docPdf), 'portrait page(s)');
// the PDF button: LaTeX typeset in the browser by tstex (the TeX files come from /texmf/ on this server); a beamer deck in the slides view, an article otherwise
const typeset = async (t, view, want, name) => {
  await t.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
  await t.eval(`document.querySelector('input[name="view"][value="${view}"]').click(); 1`); await sleep(300);
  for (const f of readdirSync(profile)) if (f.endsWith('.pdf')) rmSync(join(profile, f));   // headless Chrome overwrites a same-named download in place
  await t.eval(`document.getElementById('pdf').click(); 1`);
  let file; for (let i = 0; i < 480 && !file; i++) { file = readdirSync(profile).find(f => f.endsWith('.pdf')); await sleep(250); }
  if (!file) fail(name + ': no PDF downloaded in two minutes (status: ' + await t.eval(`document.getElementById('hstatus').textContent`) + ')');
  await sleep(500);
  const raw = readFileSync(join(profile, file)), bytes = raw.toString('latin1');
  if (!bytes.startsWith('%PDF') || !/pdfTeX/.test(bytes)) fail(name + ': not a pdfTeX document');
  const info = pdfInfo(raw);
  const {text: _t, ...shape} = info;   // the inflated text is for the content checks, not for a failure message
  if (info.pages < want.pages || !info.width || (want.landscape ? info.width < info.height : info.width > info.height)) fail(`${name}: ${JSON.stringify(shape)}`);
  if (info.images < 2) fail(name + ': the PNG and the WebP (drawn to PNG) should both be pictures in the PDF, got ' + info.images);
  if (info.attachments < 2 || !/hello from the notes/.test(info.text)) fail(name + ': the text file and the clip should ride inside the PDF as attachments, got ' + info.attachments);
  console.log('typeset', name, file, info.pages, 'pages,', info.images, 'pictures,', info.attachments, 'attachments inside');
};
await typeset(a, 'slides', {pages: 4, landscape: true}, 'beamer deck (title + 3 slides)');
await typeset(b, 'view', {pages: 1, landscape: false}, 'article');   // at least one portrait page

// a reader with the view link: the same three slides, themed, with the media, nothing editable
const V = await viewKey(T, 'pad');
const r = await Tab.open(ROOT + 'pad/?view#~' + V);
await r.until(`document.body.classList.contains('viewing') && document.querySelector('#preview img')?.naturalWidth === 320 && document.querySelector('#preview video')?.videoWidth === 640 && 'yes'`, 30000);
if (await r.eval(`document.documentElement.style.getPropertyValue('--accent')`) !== '#00aa55') fail('the reader should get the theme');
// a reader has no view switcher: the document shows the slide breaks as rules
console.log('reader', await r.until(`document.querySelectorAll('#preview hr').length === 2 && document.querySelectorAll('#preview h2, #preview h3').length === 3 && document.getElementById('editor').readOnly && 'the whole document, two breaks, read-only, themed'`, 20000));
await r.close();

// presenting: Alice steps to the last slide, which holds Bob's clip
await a.eval(`document.getElementById('present').click(); 1`);
await a.until(`!document.getElementById('present-view').hidden && document.getElementById('slidenav').textContent.includes('1') && 'yes'`);
for (let i = 0; i < 2; i++) await a.eval(`document.getElementById('present-view').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})); 1`);
console.log('presenting', await a.until(`document.getElementById('slidenav').textContent.includes('3') && document.querySelector('#slide video') && document.getElementById('slidenav').textContent + ', with the clip'`));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
