// The rest of the features, one browser run: shell settings (language, theme, name, New, the
// meeting link button), the pad's contents sidebar, presenting, author colours and download,
// the planner's deadline and time-zone change, the form's validation, number and date answers
// and deadline, the files page's upload queue, and in a call: pinning a tile, Escape on a menu,
// leaving. Needs OpenResty running and Chrome; no npm deps.
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT} from './tab.mjs';
const {Tab, profile, fail} = await launch(9306, ['--window-size=1280,900', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const click = id => `document.getElementById('${id}').click(); 1`;
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const M = randomBytes(16).toString('base64url');

// --- shell: the landing page's cards carry the key, language, theme ---
const home = await Tab.open(ROOT + '#' + M); await home.until(`document.querySelectorAll('#toolgrid a').length === 5 && 'yes'`);
if (await home.eval(`[...document.querySelectorAll('#toolgrid a')].every(a => a.getAttribute('href').endsWith('#${M}'))`) !== true || await home.eval(`document.querySelectorAll('#home button').length`) !== 0) fail('the landing page should link every tool with the key and have no copy button');
console.log('landing cards carry the key');
await home.eval(`(() => { const s = document.querySelector('select.lang'); s.value = 'it'; s.dispatchEvent(new Event('change')); })(); 1`);
await home.until(`document.documentElement.lang === 'it' && document.getElementById('tagline').textContent.startsWith('Suite di collaborazione') && 'yes'`);
console.log('italian', await home.eval(`document.getElementById('tagline').textContent`));
const pad = await Tab.open(ROOT + 'pad/#' + M); await pad.until(`!document.getElementById('editor').readOnly && 'yes'`);
if (await pad.eval(`document.documentElement.lang`) !== 'it' || !await pad.eval(`document.getElementById('colors').textContent.includes('Colori')`)) fail('the language should follow to another tool');
console.log('language persists across tools');
await pad.eval(`(() => { const s = document.querySelector('select.lang'); s.value = 'en'; s.dispatchEvent(new Event('change')); })(); 1`);
await pad.until(`document.documentElement.lang === 'en' && !document.getElementById('editor').readOnly && 'yes'`);
const before = await pad.eval(`document.documentElement.dataset.theme || 'system'`);
await pad.eval(`document.querySelector('#site button.theme').click(); 1`);
const after = await pad.eval(`document.documentElement.dataset.theme`);
if (!after || after === before) fail('the theme button should switch the theme');
await pad.eval(`location.reload(); 1`); await pad.until(`!document.getElementById('editor').readOnly && 'yes'`);
if (await pad.eval(`document.documentElement.dataset.theme`) !== after) fail('the theme should persist across reloads');
console.log('theme toggled and kept:', after);
if (!await pad.eval(`location.hash.startsWith('#~') && !document.getElementById('nav').hidden`)) fail('a meeting link should show the tool link in the address bar and keep the navigation');

// --- the name chip: set once, seen everywhere ---
await pad.eval(click('namebox'));
await pad.until(`document.getElementById('namepop').matches(':popover-open') && document.activeElement === document.getElementById('name') && 'yes'`);
await pad.eval(`(() => { const i = document.getElementById('name'); i.value = 'Zoe'; i.dispatchEvent(new Event('change')); })(); 1`);
await pad.until(`!document.getElementById('editor').readOnly && document.getElementById('namechip').textContent === 'Zoe' && 'yes'`);   // the pad reloads to present under the new name
const share = await Tab.open(ROOT + 'share/#' + M); await share.until(`document.getElementById('files') && !document.getElementById('file').disabled && 'yes'`);
if (await share.eval(`localStorage.getItem('name')`) !== 'Zoe') fail('the name should follow to another tool');   // the files page has no chip; it signs uploads with the name
console.log('name chip set and shared');

// --- files: the upload queue shows each file, then clears ---
for (const [n, size] of [['one.bin', 300000], ['two.bin', 200000], ['three.txt', 1000]]) writeFileSync(join(profile, n), Buffer.alloc(size, 3));
await share.setFiles('#file', ['one.bin', 'two.bin', 'three.txt'].map(n => join(profile, n)));
console.log('queue', await share.until(`(l => l.length === 3 && !document.getElementById('uploads').hidden && l.map(m => m.querySelector('span').textContent + ':' + m.querySelector('.state').textContent).join(' '))([...document.querySelectorAll('#uploads .meter')])`));
await share.until(`document.querySelectorAll('#files li').length === 3 && 'yes'`, 60000);
await share.until(`document.getElementById('uploads').hidden && 'yes'`, 20000);
console.log('queue cleared, three files listed, by', await share.eval(`document.querySelector('#files li').textContent.includes('Zoe') && 'Zoe'`));
// a screenshot pasted anywhere on the files page uploads, under a dated name
await share.eval(`(() => { const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4AWP4z8DwHwyBNIgDAEzeB/3dPz+0AAAAAElFTkSuQmCC'), c => c.charCodeAt(0)); const dt = new DataTransfer(); dt.items.add(new File([bytes], 'image.png', {type: 'image/png'})); document.body.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); })(); 1`);
console.log('pasted on files page:', await share.until(`([...document.querySelectorAll('#files li')].find(li => /pasted-\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.png/.test(li.textContent)) || {}).textContent`, 30000));
await share.close();

// --- pad: contents sidebar, author colours, presenting, download, New ---
await pad.eval(`(() => { const e = document.getElementById('editor'); e.value = '# Guide\\n\\n## One\\n\\n' + 'text '.repeat(400) + '\\n\\n## Two\\n\\n' + 'more '.repeat(400) + '\\n\\n### Deep\\n\\nend\\n\\n---\\n\\n# Slide two'; e.dispatchEvent(new Event('input')); })(); 1`);
// a pasted image lands in the editor as an attachment reference and renders
await pad.eval(`(() => { const e = document.getElementById('editor'); e.setSelectionRange(e.value.length, e.value.length); })(); 1`);
await pad.eval(`(() => { const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4AWP4z8DwHwyBNIgDAEzeB/3dPz+0AAAAAElFTkSuQmCC'), c => c.charCodeAt(0)); const dt = new DataTransfer(); dt.items.add(new File([bytes], 'image.png', {type: 'image/png'})); document.getElementById('editor').dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); })(); 1`);
console.log('pasted in pad:', await pad.until(`/!\\[pasted-[\\d-]+\\.png\\]\\(file:[0-9a-f]{32}\\)/.test(document.getElementById('editor').value) && document.querySelector('#preview img')?.naturalWidth === 2 && 'reference inserted, image rendered'`, 30000));
await pad.eval(click('colors'));
console.log('author colours', await pad.until(`document.getElementById('marks').classList.contains('authors') && document.querySelectorAll('#marks span[data-who]').length > 0 && 'on, runs painted'`));
console.log('markdown highlighting', await pad.until(`(m => m.querySelector('.tk-h')?.textContent === '# Guide' && m.querySelectorAll('.tk-h').length >= 4 && getComputedStyle(document.getElementById('editor')).color === 'rgba(0, 0, 0, 0)' && 'headings coloured in the layer, textarea text transparent')(document.getElementById('marks'))`));
await pad.eval(`[...document.querySelectorAll('#tools .segmented input')][2].click(); 1`);
console.log('contents', await pad.until(`(t => !t.hidden && t.querySelectorAll('a').length === 5 && [...t.querySelectorAll('a')].map(a => a.textContent).join('/'))(document.getElementById('toc'))`));
await pad.eval(`document.querySelectorAll('#toc a')[2].click(); 1`); await sleep(500);
if (await pad.eval(`document.getElementById('preview').scrollTop`) < 100) fail('clicking a contents entry should scroll the document');
if (await pad.eval(`location.hash.startsWith('#~')`) !== true) fail('contents links must not change the key in the address bar');
console.log('contents current', await pad.until(`document.querySelector('#toc a[aria-current]')?.textContent`));
await pad.eval(`[...document.querySelectorAll('#tools .segmented input')][1].click(); 1`); await sleep(300);
await pad.eval(click('present'));
console.log('present', await pad.until(`!document.getElementById('present-view').hidden && document.getElementById('slidenav').textContent`));
await pad.eval(`document.getElementById('present-view').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true})); 1`);
console.log('next slide', await pad.until(`document.getElementById('slidenav').textContent.includes('2') && document.getElementById('slidenav').textContent`));
await pad.eval(`document.getElementById('present-view').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); 1`);
if (!await pad.eval(`document.getElementById('present-view').hidden`)) fail('Escape should leave presenting');
await pad.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await pad.eval(click('download'));
let md; for (let i = 0; i < 40 && !md; i++) { md = readdirSync(profile).find(f => f.endsWith('.md')); await sleep(250); }
if (!md || !readFileSync(join(profile, md), 'utf8').startsWith('# Guide')) fail('Download .md should save the text');
console.log('downloaded', md);
const fresh = await pad.eval(`document.getElementById('new').getAttribute('href')`);
if (fresh !== '/pad/') fail('New should open the same tool with a fresh key: ' + fresh);
await pad.close();

// --- planner: a deadline in the past closes answers; a time-zone change relabels the grid ---
const when = await Tab.open(ROOT + 'when/#' + M);
await when.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20 && 'yes'`);
await when.eval(`(() => { const d = [...document.querySelectorAll('#days button')]; const ev = (el, type) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1})); ev(d[0], 'pointerdown'); ev(window, 'pointerup'); document.getElementById('ename').value = 'Closed'; document.getElementById('by').value = '${yesterday}'; document.getElementById('go').click(); })()`);
await when.until(`!document.getElementById('event').hidden && document.querySelectorAll('#heat .cell').length > 0 && 'yes'`);
console.log('closed event', await when.until(`document.getElementById('answer').hidden && document.getElementById('tab-group').checked && document.getElementById('hstatus').textContent`));
const first = await when.eval(`document.querySelector('#heat .labels span').textContent`);
await when.eval(`(() => { const box = document.getElementById('vtz'); box.querySelector('button').click(); const s = box.querySelector('select'); s.value = 'Pacific/Kiritimati'; s.dispatchEvent(new Event('change')); })(); 1`);
const shifted = await when.until(`(l => l && l !== ${JSON.stringify(first)} && l)(document.querySelector('#heat .labels span')?.textContent)`);
console.log('time zone', first, '->', shifted);
await when.close();

// --- form: required fields block, number and date answers round-trip, a past deadline closes it ---
const form = await Tab.open(ROOT + 'form/#' + M);
await form.until(`document.getElementById('go') && document.querySelectorAll('.field').length === 1 && 'yes'`);
await form.eval(`(() => { document.getElementById('ftitle').value = 'Checks'; const f = document.querySelector('.field'); f.querySelector('input').value = 'Name'; f.querySelector('select').value = 'text'; f.querySelector('input[type=checkbox]').checked = true;
  document.getElementById('addfield').click(); const g = document.querySelectorAll('.field')[1]; g.querySelector('input').value = 'Age'; g.querySelector('select').value = 'number';
  document.getElementById('addfield').click(); const h = document.querySelectorAll('.field')[2]; h.querySelector('input').value = 'When'; h.querySelector('select').value = 'date';
  document.getElementById('openres').checked = true; document.getElementById('go').click(); })()`);
const formUrl = await form.until(`document.getElementById('questions')?.children.length === 3 && location.href`);
if (await form.eval(`document.getElementById('answer').reportValidity()`) !== false) fail('an empty required answer must not validate');
await form.eval(`document.querySelector('[name="q0"]').value = 'Ann'; document.querySelector('[name="q1"]').value = '42'; document.querySelector('[name="q2"]').value = '2030-01-02'; document.getElementById('answer').requestSubmit(); 1`);
await form.until(`document.getElementById('sent').textContent.length > 0 && 'yes'`);
console.log('typed answers', await form.until(`(r => r && r.textContent.includes('42') && r.textContent.includes('2030-01-02') && r.textContent)(document.querySelector('#table tbody tr'))`, 20000));
const closedForm = await Tab.open(ROOT); await closedForm.until(`document.getElementById('toolgrid') && 'yes'`);
await closedForm.eval(`localStorage.clear(); location.href = ${JSON.stringify(ROOT + 'form/')}; 1`);
await closedForm.until(`document.getElementById('go') && document.querySelectorAll('.field').length === 1 && 'yes'`);
await closedForm.eval(`(() => { document.getElementById('ftitle').value = 'Late'; const f = document.querySelector('.field'); f.querySelector('input').value = 'Q'; f.querySelector('select').value = 'text'; document.getElementById('by').value = '${yesterday}'; document.getElementById('openres').checked = true; document.getElementById('go').click(); })()`);
console.log('closed form', await closedForm.until(`document.getElementById('answer')?.hidden && document.getElementById('hstatus').textContent`));
await form.close(); await closedForm.close();

// --- call: pin a tile, Escape closes a menu, Leave returns to the lobby ---
const ready = `location.hash.length > 1 && document.getElementById('join')?.onclick && location.href`;
const a = await Tab.open(ROOT + 'meet/?media=relay#' + M); await a.until(ready);
const b = await Tab.open(ROOT + 'meet/?media=relay#' + M); await b.until(ready);
for (const [t, name] of [[a, 'Alice'], [b, 'Bob']]) await t.eval(`document.getElementById('pname').value = '${name}'; ${click('join')}`);
await a.until(`document.querySelectorAll('.tile').length === 2 && 'yes'`, 30000);
await a.eval(`document.querySelectorAll('.tile .pin')[1].click(); 1`);
console.log('pinned', await a.until(`document.querySelectorAll('.tile.pinned').length === 1 && document.querySelectorAll('.tile .pin')[1].getAttribute('aria-pressed') === 'true' && 'the other tile takes the stage'`));
await a.eval(`document.querySelector('.tile.pinned .pin').click(); 1`);   // the pinned tile's own pin: Bob's avatar tile may have been swapped for his video tile meanwhile
await a.until(`document.querySelectorAll('.tile.pinned').length === 0 && 'yes'`);
console.log('unpinned');
await a.eval(click('settingsb'));
await a.until(`document.getElementById('settingsmenu').matches(':popover-open') && 'yes'`);
await a.call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27}); await a.call('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
await a.until(`!document.getElementById('settingsmenu').matches(':popover-open') && 'yes'`);
console.log('menu closed by Escape');
await a.eval(click('leave'));
console.log('left', await a.until(`document.getElementById('call').hidden && !document.getElementById('prejoin').hidden && 'back in the lobby'`, 20000));
console.log('B sees the leave', await b.until(`document.querySelectorAll('.tile').length === 1 && 'yes'`, 20000));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
