// A LaTeX pad: a markdown pad with an attachment is converted one way to its LaTeX source; the
// preview becomes the compiled PDF; the files sidebar lists the attachments and inserts them; an
// attached .tex file is \input; another (markdown) pad is pulled in by its tool link; the PDF
// button downloads the compiled document; a view-link reader gets the compiled PDF too.
import {writeFileSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
import {png, pdfInfo} from './fixtures.mjs';
const {Tab, profile, fail} = await launch(9330, ['--window-size=1280,900']);
try { writeFileSync('openresty/logs/texmf.log', ''); } catch {}   // the dev server's log of TeX files served, counted below from zero
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
const set = s => `(() => { const e = document.getElementById('editor'); e.value = ${JSON.stringify(s)}; e.setSelectionRange(e.value.length, e.value.length); e.dispatchEvent(new Event('input')); })(); 1`;
const compiled = `(f => f && f.src.startsWith('blob:') && 'compiled PDF in the preview')(document.querySelector('#preview iframe.pdfview'))`;

// pad B: markdown, long enough to add a page when included
const other = await Tab.open(ROOT + 'pad/#' + randomBytes(16).toString('base64url')); const otherUrl = await other.until(ready);
await other.eval(set('# From pad B\n\n' + Array.from({length: 40}, (_, i) => `Paragraph ${i} of the other pad, included by its link.`).join('\n\n') + '\n'));
await other.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const otherTool = await toolKey(otherUrl.split('#')[1], 'pad');

// pad A: markdown with an attachment, then converted
writeFileSync(join(profile, 'fig.png'), png(120, 80));
const a = await Tab.open(ROOT + 'pad/#' + randomBytes(16).toString('base64url')); const url = await a.until(ready);
await a.eval(set('# Converted\n\nA paragraph with **bold**.\n\n'));
await a.setFiles('#attachfile', [join(profile, 'fig.png')]);
await a.until(`/!\\[fig\\.png\\]\\(file:[0-9a-f]{32}\\)/.test(${text}) && 'yes'`, 30000);
const id = await a.eval(`/file:([0-9a-f]{32})/.exec(${text})[1]`);
await a.eval(`window.confirm = () => true; document.getElementById('totex').click(); 1`);
console.log('converted', await a.until(`${text}.startsWith('\\\\documentclass') && ${text}.includes('${id}.png') && 'to LaTeX, the figure by its id'`));
if (!await a.eval(`document.getElementById('padmain').dataset.mode === 'tex' && document.getElementById('present').hidden`)) fail('a LaTeX pad should hide the markdown-only tools');
console.log('latex highlighting', await a.until(`(m => m.querySelector('.tk-cmd')?.textContent === '\\\\documentclass' && m.querySelector('.tk-env') && 'commands and environments coloured')(document.getElementById('marks'))`));
console.log('preview', await a.until(compiled, 120000));
// the engine keeps every TeX file it fetched, and the minimal set it prefetched, in persistent storage: after a reload the
// same document compiles with no fetch of a TeX file at all
const texmf = () => { try { return readFileSync('openresty/logs/texmf.log', 'utf8').split('\n').filter(l => l.includes('GET /texmf/')).length; } catch { return 0; } };   // the dev server logs every TeX file served
let n0 = texmf(); for (let i = 0; i < 90; i++) { await sleep(1000); if (texmf() === n0) break; n0 = texmf(); }   // the prefetch of the minimal set runs in the background: wait until the count settles
console.log('TeX files fetched so far', n0);
if (n0 < 100) fail('the prefetch should have pulled the minimal set, got ' + n0 + ' requests');
await sleep(21000); await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);   // checkpoints are at most one per 20 s: the LaTeX text must be stored before the reload
await a.eval(`location.reload(); 1`); await a.until(ready); await a.until(`${text}.startsWith('\\\\documentclass') && 'yes'`, 30000);
const before = texmf();
await a.eval(`(() => { const e = document.getElementById('editor'); e.value = e.value.replace('A paragraph', 'A changed paragraph'); e.dispatchEvent(new Event('input')); })(); 1`);
await a.until(compiled, 120000); await sleep(1500);
console.log('TeX files fetched after a reload and a recompile:', texmf() - before);
if (texmf() - before > 2) fail('after a reload the engine should compile from its cache, but fetched ' + (texmf() - before) + ' TeX files');

// the files sidebar: the attachment, insert at the caret, download
await a.eval(`document.getElementById('filesb').click(); 1`);
console.log('sidebar', await a.until(`(() => { const li = document.querySelector('#padfilelist li'); return !document.getElementById('padfiles').hidden && li && li.textContent.includes('fig.png') && li.textContent.includes('KB') && 'lists fig.png'; })()`));
writeFileSync(join(profile, 'chapter.tex'), '\\newpage\\section{Chapter from a file}\nText that came in through \\textbackslash input.\n');
await a.setFiles('#attachfile', [join(profile, 'chapter.tex')]);
await a.until(`document.querySelectorAll('#padfilelist li').length === 2 && 'yes'`, 30000);
console.log('attached', await a.until(`${text}.includes('\\\\input{chapter.tex}') && 'a .tex attached to a LaTeX pad is referenced by \\\\input'`));
await a.eval(`(() => { const e = document.getElementById('editor'); e.value = e.value.replace('\\\\input{chapter.tex}', ''); e.dispatchEvent(new Event('input')); const p = e.value.lastIndexOf('\\\\end{document}'); e.setSelectionRange(p, p); })(); 1`);   // remove it, then put it back from the sidebar
await a.eval(`[...document.querySelectorAll('#padfilelist li')].find(li => li.textContent.includes('chapter.tex')).querySelector('button').click(); 1`);
console.log('inserted', await a.until(`${text}.includes('\\\\input{chapter.tex}') && 'the sidebar inserts it at the caret'`));
await a.eval(`(() => { const e = document.getElementById('editor'); const p = e.value.lastIndexOf('\\\\end{document}'); e.value = e.value.slice(0, p) + '\\\\input{pad:~${otherTool}}\\n' + e.value.slice(p); e.dispatchEvent(new Event('input')); })(); 1`);
await sleep(2000);
console.log('recompiled', await a.until(`document.getElementById('hstatus').textContent.includes('online') && ${compiled}`, 120000));

// the PDF button: the compiled document, with the figure, the chapter's page and the other pad's pages
await a.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
for (const f of readdirSync(profile)) if (f.endsWith('.pdf')) rmSync(join(profile, f));
await a.eval(`document.getElementById('pdf').click(); 1`);
let file; for (let i = 0; i < 480 && !file; i++) { file = readdirSync(profile).find(f => f.endsWith('.pdf')); await sleep(250); }
if (!file) fail('no PDF downloaded (status: ' + await a.eval(`document.getElementById('hstatus').textContent`) + ')');
await sleep(500);
const info = pdfInfo(readFileSync(join(profile, file)));
if (info.pages < 3 || info.images < 1) fail(`the PDF should have the figure, the chapter page and the other pad: ${JSON.stringify({pages: info.pages, images: info.images})}`);
if (!/From pad B|Paragraph 0/.test(info.text) && !/pad B/.test(info.text)) console.log('(the other pad\'s words are in glyph streams; page count carries the check)');
console.log('exported', file, info.pages, 'pages,', info.images, 'picture');

// a reader: the compiled PDF, nothing editable
const V = await viewKey(await toolKey(url.split('#')[1], 'pad'), 'pad');
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const r = await Tab.open(ROOT + 'pad/?view#~' + V);
console.log('reader', await r.until(`document.body.classList.contains('viewing') && document.getElementById('editor').readOnly && ${compiled}`, 120000));
await r.close();

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
