// Pad under stress: twenty editors typing at once converge; two editors replacing the same word
// and one deleting a range another is typing into converge without losing the inserts; two people
// attach files and finish at the same time and both files reach everyone; the sequencer's tab is
// closed in the middle of a burst; two comments on the same word and two replies to one thread
// land at the same instant; and a view-link reader gets the final text.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
import {png} from './fixtures.mjs';
const {Tab, profile, fail} = await launch(9360, ['--window-size=1000,700']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
const N = 20, LETTERS = 'ABCDEFGHIJKLMNOPQRST';
const count = (s, ch) => s.split(ch).length - 1;
/** Open a tab as its own person (author id and name live in localStorage, shared by the profile, so set them before the pad loads). */
const person = async (i, url) => { const t = await Tab.open(ROOT); await t.until(`document.getElementById('toolgrid') && 'yes'`); await t.eval(`localStorage.setItem('author', ${JSON.stringify(i.toString(16).padStart(8, '0'))}); localStorage.setItem('name', ${JSON.stringify('P' + i)}); location.href = ${JSON.stringify(url)}; 1`); await t.until(ready); return t; };
/** Everyone's text is identical and `ok(text)` holds, within `ms`. */
async function converged(tabs, ok, ms = 90000) {
  for (let t0 = Date.now(); Date.now() - t0 < ms; await sleep(500)) {
    const texts = await Promise.all(tabs.map(t => t.eval(text).catch(() => null)));
    if (texts.every(x => x !== null && x === texts[0]) && ok(texts[0])) return texts[0];
  }
  const texts = await Promise.all(tabs.map(t => t.eval(text).catch(() => 'ERR')));
  fail('no convergence: ' + texts.map((x, i) => `${i}:${JSON.stringify(x).slice(0, 60)}`).join(' | '));
}
/** Type `s` `times` times at random spots after the fixed first sentence, `gap` ms apart, through the real input path. */
const burst = (s, times, gap) => `(async () => { const e = document.getElementById('editor'); for (let i = 0; i < ${times}; i++) { const from = e.value.indexOf('end.') + 5; const p = from + Math.floor(Math.random() * (e.value.length - from + 1)); e.value = e.value.slice(0, p) + ${JSON.stringify(s)} + e.value.slice(p); e.setSelectionRange(p + ${s.length}, p + ${s.length}); e.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, ${gap})); } })(); 1`;

// --- twenty editors ---
const host = await Tab.open(ROOT + 'pad/#' + randomBytes(16).toString('base64url')); const url = await host.until(ready);
const T = await toolKey(url.split('#')[1], 'pad'), padUrl = ROOT + 'pad/#~' + T;
await host.eval(`(() => { const e = document.getElementById('editor'); e.value = '# Stress\\n\\nRACE here. [KEEP THIS RANGE] end.\\n'; e.dispatchEvent(new Event('input')); })(); 1`);
const tabs = [host];
for (let i = 1; i < N; i++) tabs.push(await person(i, padUrl));
await converged(tabs, s => s.includes('RACE here'), 60000);
console.log(N, 'editors in the room');
const before = await host.eval(text), base = Object.fromEntries(LETTERS.split('').map(ch => [ch, count(before, ch)]));
await Promise.all(tabs.map((t, i) => t.eval(burst(LETTERS[i], 12, 40))));
const after = await converged(tabs, s => LETTERS.split('').every(ch => count(s, ch) === base[ch] + 12));
console.log('20 x 12 concurrent inserts converged:', after.length, 'chars, every letter 12 times');

// --- races on one word, and an insert inside a range being deleted ---
const replace = (from, to) => `(() => { const e = document.getElementById('editor'); const i = e.value.indexOf(${JSON.stringify(from)}); if (i < 0) throw new Error('no ' + ${JSON.stringify(from)}); e.value = e.value.slice(0, i) + ${JSON.stringify(to)} + e.value.slice(i + ${from.length}); e.setSelectionRange(i, i); e.dispatchEvent(new Event('input')); })(); 1`;
await Promise.all([tabs[1].eval(replace('RACE', 'one')), tabs[2].eval(replace('RACE', 'two'))]);
const raced = await converged(tabs, s => !s.includes('RACE') && s.includes('one') && s.includes('two'));
console.log('same word replaced by two people at once:', JSON.stringify(/(one|two)(one|two)? here/.exec(raced)?.[0]));
const insertAt = (anchor, s) => `(() => { const e = document.getElementById('editor'); const i = e.value.indexOf(${JSON.stringify(anchor)}) + ${anchor.length}; e.value = e.value.slice(0, i) + ${JSON.stringify(s)} + e.value.slice(i); e.setSelectionRange(i, i); e.dispatchEvent(new Event('input')); })(); 1`;
await Promise.all([tabs[3].eval(replace('[KEEP THIS RANGE]', '')), tabs[4].eval(insertAt('[KEEP ', 'INSERTED '))]);
await converged(tabs, s => !s.includes('THIS RANGE') && s.includes('INSERTED'));
console.log('a range deleted while someone typed into it: the typed text survives, the range is gone');

// --- two attachments finishing at the same time ---
writeFileSync(join(profile, 'left.png'), png(200, 150, [200, 60, 60])); writeFileSync(join(profile, 'right.png'), png(300, 100, [60, 60, 200]));
await Promise.all([tabs[5].setFiles('#attachfile', [join(profile, 'left.png')]), tabs[6].setFiles('#attachfile', [join(profile, 'right.png')])]);
await converged(tabs, s => /!\[left\.png\]\(file:[0-9a-f]{32}\)/.test(s) && /!\[right\.png\]\(file:[0-9a-f]{32}\)/.test(s), 60000);
await tabs[7].eval(`document.getElementById('filesb').click(); 1`);
await tabs[7].until(`document.querySelectorAll('#padfilelist li').length === 2 && 'yes'`, 30000);
console.log('two people attached at once: both references in the text, both files listed on a third screen');

// --- the sequencer leaves in the middle of a burst ---
const rest = tabs.slice(1);
const typing = Promise.all(rest.slice(0, 8).map((t, i) => t.eval(burst(String(i), 10, 60))));
await sleep(150); await host.close(); tabs.shift();
await typing;
const afterChurn = await converged(rest, s => '01234567'.split('').every(ch => count(s, ch) >= 10));
console.log('sequencer closed mid-burst: the others converged with every insert,', afterChurn.length, 'chars');

// --- two comments on one word at the same instant, two replies to one thread at the same instant ---
const comment = body => `(async () => { const e = document.getElementById('editor'); document.getElementById('commentsb').click(); const i = e.value.indexOf('INSERTED'); e.focus(); e.setSelectionRange(i, i + 8); document.dispatchEvent(new Event('selectionchange')); for (let n = 0; n < 40 && document.getElementById('commenton').disabled; n++) await new Promise(r => setTimeout(r, 50)); document.getElementById('commenton').click(); document.getElementById('commenttext').value = ${JSON.stringify(body)}; document.getElementById('commentform').requestSubmit(); })(); 1`;
for (const t of rest.slice(0, 2)) await t.eval(`window.__puts = []; const of = window.fetch; window.fetch = async (u, o) => { const r = await of(u, o); if (o && o.method === 'PUT') window.__puts.push(r.status + ' ' + String(u).slice(-12)); return r; }; 1`);
await Promise.all([rest[0].eval(comment('first?')), rest[1].eval(comment('second?'))]);
for (const t of rest.slice(0, 3)) {
  await t.eval(`document.getElementById('commentsb').ariaPressed === 'true' || document.getElementById('commentsb').click(); 1`);
  try { await t.until(`document.querySelectorAll('#threadlist .thread').length === 2 && 'yes'`, 60000); }
  catch (e) { fail('threads: ' + await t.eval(`JSON.stringify({threads: document.querySelectorAll('#threadlist .thread').length, formHidden: document.getElementById('commentform').hidden, btnDisabled: document.getElementById('commenton').disabled, status: document.getElementById('hstatus').textContent, puts: window.__puts, sel: (e => e.value.slice(e.selectionStart, e.selectionEnd))(document.getElementById('editor'))})`)); }
}
const replyAll = who => `(() => { const f = document.querySelector('#threadlist .thread .replyform'); f.querySelector('input').value = ${JSON.stringify(who)}; f.requestSubmit(); })(); 1`;
await Promise.all([rest[0].eval(replyAll('reply A')), rest[1].eval(replyAll('reply B'))]);
await rest[2].until(`[...document.querySelectorAll('#threadlist .thread')].some(t => t.querySelectorAll('.post').length === 3) && 'yes'`, 30000);
console.log('two threads on one word, two replies at once: all kept');

// --- a reader gets the final text ---
await rest[0].until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 60000);
const final = await rest[0].eval(text);
const r = await Tab.open(ROOT + 'pad/?view#~' + await viewKey(T, 'pad'));
await r.until(`document.body.classList.contains('viewing') && ${text} === ${JSON.stringify(final)} && 'yes'`, 60000);
console.log('reader has the final text');

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
