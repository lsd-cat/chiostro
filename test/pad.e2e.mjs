// Pad in headless Chrome: two tabs edit concurrently and converge, a third joins late and gets the
// text, the snapshot survives everyone leaving, markdown and slides render, history restores.
// Needs OpenResty running (openresty -p openresty -c nginx.conf) and Chrome; no npm deps.
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {webcrypto} from 'node:crypto';

import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, profile, fail} = await launch(9231);
const BASE = ROOT + 'pad/';

process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
// type like a user: set the value with the caret at the end and fire input
const type = (s, at = null) => `(() => { const e = document.getElementById('editor'); const p = ${at === null ? 'e.value.length' : at}; e.value = e.value.slice(0, p) + ${JSON.stringify(s)} + e.value.slice(p); e.setSelectionRange(p + ${s.length}, p + ${s.length}); e.dispatchEvent(new Event('input')); 1 })()`;

const M = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('base64url');   // the meeting link; the page then shows the pad's own link
const a = await Tab.open(BASE + '#' + M);
const url = await a.until(ready); console.log('pad', url);
if (!url.includes('#~')) fail('the address bar should show the tool link, not the meeting secret');
await a.eval(type('# Notes\n\nhello'));
console.log('A preview', await a.until(`document.querySelector('#preview h2')?.textContent === 'Notes' && document.title`));
if (!await a.eval(`document.title.startsWith('Notes')`)) fail('title should follow the first heading');
// B is "another person": same Chrome profile, so give it its own author id before it loads the pad
const b = await Tab.open(BASE.replace(/pad\/$/, '')); await b.until(`document.getElementById('toolgrid') && 'yes'`);
await b.eval(`localStorage.setItem('author', 'b0b0b0b0'); location.href = ${JSON.stringify(url)}; 1`); await b.until(ready);
console.log('B synced', await b.until(`${text} === '# Notes\\n\\nhello' && 'yes'`));
// concurrent: A appends at the end, B inserts at the start, both in the same instant
await Promise.all([a.eval(type(' world')), b.eval(type('> ', 0))]);
const want = '> # Notes\n\nhello world';
console.log('A text', JSON.stringify(await a.until(`${text} === ${JSON.stringify(want)} && ${text}`)));
console.log('B text', JSON.stringify(await b.until(`${text} === ${JSON.stringify(want)} && ${text}`)));
// a burst from both sides while the other side types too
await Promise.all([a.eval(`(async () => { for (let i = 0; i < 5; i++) { ${type('a')}; await new Promise(r => setTimeout(r, 30)); } })()`), b.eval(`(async () => { for (let i = 0; i < 5; i++) { ${type('b', 0)}; await new Promise(r => setTimeout(r, 30)); } })()`)]);
await sleep(1500);
const [ta, tb] = [await a.eval(text), await b.eval(text)];
if (ta !== tb) fail(`diverged after burst: ${JSON.stringify(ta)} vs ${JSON.stringify(tb)}`);
if (!/^b{5}> # Notes\n\nhello worlda{5}$/.test(ta)) fail('burst lost edits: ' + JSON.stringify(ta));
console.log('burst converged', JSON.stringify(ta));
// authorship: the layer behind the textarea shows the same text, in two colours, on both screens
const hues = `JSON.stringify({text: [...document.querySelectorAll('#marks span')].map(s => s.textContent).join('').slice(0, -1), hues: [...new Set([...document.querySelectorAll('#marks span[data-who]')].map(s => s.style.getPropertyValue('--hue')))].length})`;
console.log('A marks', await a.until(`(m => m.text === ${text} && m.hues === 2 && JSON.stringify(m))(JSON.parse(${hues}))`));
console.log('B marks', await b.until(`(m => m.text === ${text} && m.hues === 2 && JSON.stringify(m))(JSON.parse(${hues}))`));
console.log('presence', await b.until(`document.getElementById('hstatus').textContent.includes('2 online: Guest, You') && document.getElementById('hstatus').textContent`));
// cursors: B selects "Notes", A sees Guest's selection tinted and the caret at its end; A's caret is at the end of the text on B's screen
await b.eval(`(() => { const e = document.getElementById('editor'); e.focus(); const i = e.value.indexOf('Notes'); e.setSelectionRange(i, i + 5); document.dispatchEvent(new Event('selectionchange')); })(); 1`);
await a.eval(`(() => { const e = document.getElementById('editor'); e.focus(); e.setSelectionRange(e.value.length, e.value.length); document.dispatchEvent(new Event('selectionchange')); })(); 1`);
console.log('A sees B\'s cursor', await a.until(`(c => c && c.dataset.who === 'Guest' && c.previousSibling.textContent.endsWith('Notes') && [...document.querySelectorAll('#marks .rsel')].map(s => s.textContent).join('') === 'Notes' && 'selection and caret after Notes')(document.querySelector('#marks .caret'))`));
console.log('B sees A\'s cursor', await b.until(`(c => c && c.nextSibling.textContent === '\\n' && 'caret at the end')(document.querySelector('#marks .caret'))`));
// typing: A inserts letters one by one after "hello"; B's caret for A rides on the typed text and settles exactly after it, never ahead
await a.eval(`(async () => { const e = document.getElementById('editor'); let p = e.value.indexOf('hello') + 5; for (const ch of 'XYZ') { e.value = e.value.slice(0, p) + ch + e.value.slice(p); p++; e.setSelectionRange(p, p); e.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 120)); } })(); 1`);
console.log('typing caret', await b.until(`(c => c && c.previousSibling.textContent.endsWith('helloXYZ') && c.nextSibling.textContent.startsWith(' world') && 'right after helloXYZ')(document.querySelector('#marks .caret'))`));
await sleep(1000);
if (!await b.eval(`(c => c && c.previousSibling.textContent.endsWith('helloXYZ'))(document.querySelector('#marks .caret'))`)) fail('the caret drifted after typing stopped: ' + await b.eval(`document.getElementById('marks').innerHTML.slice(0, 300)`));
// late joiner gets the live text from a peer, not the store
const c = await Tab.open(url); await c.until(ready);
if (await c.eval(text) !== await a.eval(text)) fail('late joiner got ' + JSON.stringify(await c.eval(text)));
console.log('C joined with the live text');
// slides and markdown
await a.eval(type('\n\n---\n\n## Second\n\n- [x] done\n- todo\n\n| a | b |\n|---|---|\n| 1 | 2 |'));
await a.eval(`document.querySelector('input[name="view"][value="slides"]').click(); 1`);
console.log('A slides', await a.until(`document.querySelectorAll('#preview .slide').length === 2 && document.querySelectorAll('#preview .slide table td').length === 2 && document.querySelector('#preview input[type=checkbox]')?.checked && 'ok'`));
await a.eval(`document.getElementById('present').click(); 1`);
console.log('A presenting', await a.until(`!document.getElementById('present-view').hidden && document.getElementById('slidenav').textContent`));
await a.eval(`document.getElementById('present-view').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'})); 1`);
if (!/2 of 2/.test(await a.eval(`document.getElementById('slidenav').textContent`))) fail('arrow should advance the slide');
await a.eval(`document.getElementById('exit').click(); 1`);
// a view link: derived from the edit secret, shows the latest signed checkpoint, cannot edit, follows new checkpoints
const V = await viewKey(await toolKey(url.split('#')[1], 'pad'), 'pad');
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 10000);
const v = await Tab.open(BASE + '?view#~' + V);
console.log('viewer', await v.until(`document.body.classList.contains('viewing') && document.getElementById('hstatus').textContent`));
if (await v.eval(`document.getElementById('editor').offsetParent !== null`)) fail('viewer must have no editor');
console.log('viewer renders', await v.until(`document.getElementById('preview').textContent.includes('helloXYZ world') && 'the checkpoint'`));
// the editor adds a theme (front matter) and embeds this meeting's form
await a.eval(type('---\n_accent_ placeholder\n---\n'.replace('_accent_ placeholder', 'accent: #00ff00'), 0));   // prepend the theme
await a.eval(`(() => { const e = document.getElementById('editor'); e.value += '\\n![Vote](/form/#~${await toolKey(M, 'form')})\\n'; e.dispatchEvent(new Event('input')); })(); 1`);   // append the embed
console.log('A themed', await a.until(`document.getElementById('preview').style.getPropertyValue('--accent') === '#00ff00' && 'accent applied to the preview'`));
console.log('A embed', await a.until(`(f => f && f.src.includes('/form/?embed#') && 'iframe')(document.querySelector('#preview iframe.embed'))`));
console.log('A embed sized', await a.until(`(f => f && parseInt(f.style.height) > 120 && f.style.height)(document.querySelector('#preview iframe.embed'))`, 20000));
console.log('viewer follows', await v.until(`document.documentElement.style.getPropertyValue('--accent') === '#00ff00' && document.querySelector('#preview iframe.embed') && 'new checkpoint rendered with its theme and embed'`, 30000));   // checkpoints are throttled to one per 20 s
// PDF through the browser's print engine: the document paginates; slides view gives one page per slide
const pages = pdf => (pdf.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
await a.eval(`document.querySelector('input[name="view"][value="both"]').click(); 1`);
const doc = Buffer.from((await a.call('Page.printToPDF', {preferCSSPageSize: true})).result.data, 'base64').toString('latin1');
if (!doc.startsWith('%PDF') || pages(doc) < 1) fail('document PDF wrong: ' + pages(doc) + ' pages');
await a.eval(`document.querySelector('input[name="view"][value="slides"]').click(); 1`); await sleep(400);
const slidesPdf = Buffer.from((await a.call('Page.printToPDF', {preferCSSPageSize: true})).result.data, 'base64').toString('latin1');
if (pages(slidesPdf) !== 2) fail('slides PDF should have one page per slide, got ' + pages(slidesPdf));
const mediaBox = /MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(slidesPdf);
if (!mediaBox || +mediaBox[1] < +mediaBox[2]) fail('slides should print landscape: ' + mediaBox?.[0]);
console.log('A pdf', pages(doc), 'page(s) portrait; slides', pages(slidesPdf), 'pages landscape');
await a.eval(`document.querySelector('input[name="view"][value="both"]').click(); 1`);
// the sequencer saves; everyone leaves; a fresh tab loads the snapshot from the store
console.log('A saved', await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 10000));
const final = await a.eval(text);
await a.close(); await b.close(); await c.close(); await v.close(); Tab.all.length = 0;
await sleep(500);
const d = await Tab.open(url); await d.until(ready);
if (await d.eval(text) !== final) fail('snapshot not restored: ' + JSON.stringify(await d.eval(text)));
if (await d.eval(`[...new Set([...document.querySelectorAll('#marks span[data-who]')].map(s => s.style.getPropertyValue('--hue')))].length`) !== 2) fail('authorship not restored from the checkpoint');
console.log('D restored from the store', final.length, 'chars');
// history lists at least one version and restoring it is one edit
await d.eval(type('\n\nscratch'));
await d.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 10000);
await d.eval(`document.getElementById('history').dispatchEvent(new Event('focus')); 1`);
console.log('D history', await d.until(`document.getElementById('history').options.length >= 3 && document.getElementById('history').options.length + ' entries'`));
await d.eval(`const h = document.getElementById('history'); h.value = h.options[h.options.length - 1].value; h.dispatchEvent(new Event('change')); 1`);
await d.until(`!document.getElementById('histbar').hidden && 'yes'`);
await d.eval(`document.getElementById('histrestore').click(); 1`);
const restored = await d.eval(text);
if (restored.includes('scratch') || !restored.includes('# Notes')) fail('restore should bring back an earlier version: ' + JSON.stringify(restored));
console.log('D restored version', JSON.stringify(restored.slice(0, 30)));
for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
