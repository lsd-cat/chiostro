// Comment threads on a pad: Alice selects a word and comments; Bob sees the thread and the tinted
// range, replies; Alice types before the word and the tint follows it; a reader with the view
// link sees the thread and answers; Alice resolves it and the tint goes; the words are found again
// after a reload; a thread whose words were deleted says so.
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, fail} = await launch(9350, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
const set = s => `(() => { const e = document.getElementById('editor'); e.value = ${JSON.stringify(s)}; e.setSelectionRange(e.value.length, e.value.length); e.dispatchEvent(new Event('input')); })(); 1`;
const tinted = `[...document.querySelectorAll('#marks .cm')].map(s => s.textContent).join('')`;
const threadsShown = `[...document.querySelectorAll('#threadlist .thread')].map(t => t.querySelector('.quote').textContent + '|' + [...t.querySelectorAll('.post p')].map(p => p.textContent).join('/')).join(';')`;

const M = randomBytes(16).toString('base64url');
const a = await Tab.open(ROOT + 'pad/#' + M); const url = await a.until(ready);
const T = await toolKey(url.split('#')[1], 'pad');
await a.eval(set('# Plan\n\nWe meet on Monday at noon.\n'));
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const b = await Tab.open(ROOT); await b.until(`document.getElementById('toolgrid') && 'yes'`);
await b.eval(`localStorage.setItem('author', 'b0bb0bb0'); localStorage.setItem('name', 'Bob'); location.href = ${JSON.stringify(ROOT + 'pad/#~' + T)}; 1`); await b.until(ready);

// Alice comments on "Monday"
await a.eval(`document.getElementById('commentsb').click(); 1`);
if (!await a.eval(`document.getElementById('commenton').disabled`)) fail('nothing selected: the comment button should be disabled');
await a.eval(`(() => { const e = document.getElementById('editor'); const i = e.value.indexOf('Monday'); e.focus(); e.setSelectionRange(i, i + 6); document.dispatchEvent(new Event('selectionchange')); })(); 1`);
await a.until(`!document.getElementById('commenton').disabled && 'yes'`);
await a.eval(`document.getElementById('commenton').click(); document.getElementById('commenttext').value = 'Tuesday is better?'; document.getElementById('commentform').requestSubmit(); 1`);
console.log('A thread', await a.until(`${threadsShown} === 'Monday|Tuesday is better?' && ${tinted} === 'Monday' && 'on Monday, tinted'`));
console.log('A badge', await a.until(`document.getElementById('commentsb').dataset.count === '1' && '1'`));

// Bob sees it, replies; Alice sees the reply
await b.eval(`document.getElementById('commentsb').click(); 1`);
console.log('B sees', await b.until(`${threadsShown} === 'Monday|Tuesday is better?' && ${tinted} === 'Monday' && 'the thread and the tint'`, 20000));
await b.eval(`(() => { const f = document.querySelector('#threadlist .thread .replyform'); f.querySelector('input').value = 'Fine by me'; f.requestSubmit(); })(); 1`);
console.log('A sees the reply', await a.until(`${threadsShown} === 'Monday|Tuesday is better?/Fine by me' && 'yes'`, 20000));
await sleep(1500); if (await b.eval(threadsShown) !== 'Monday|Tuesday is better?/Fine by me') fail('the poster sees their reply once: ' + await b.eval(threadsShown));

// the anchor follows edits: Alice inserts before the word, Bob deletes a word before it
await a.eval(`(() => { const e = document.getElementById('editor'); const i = e.value.indexOf('We meet'); e.value = e.value.slice(0, i) + 'Reminder: ' + e.value.slice(i); e.setSelectionRange(i, i); e.dispatchEvent(new Event('input')); })(); 1`);
console.log('A tint follows', await a.until(`${tinted} === 'Monday' && ${text}.includes('Reminder: We meet') && 'Monday still tinted after an insert before it'`));
console.log('B tint follows', await b.until(`${text}.includes('Reminder: We meet') && ${tinted} === 'Monday' && 'on B too'`, 20000));
await b.eval(`(() => { const e = document.getElementById('editor'); e.value = e.value.replace('Reminder: ', ''); e.setSelectionRange(0, 0); e.dispatchEvent(new Event('input')); })(); 1`);
console.log('A after B deletes', await a.until(`!${text}.includes('Reminder') && ${tinted} === 'Monday' && 'still Monday'`, 20000));
// clicking the quote selects the range in the editor
await a.eval(`document.querySelector('#threadlist .thread .quote').click(); 1`);
if (await a.eval(`(e => e.value.slice(e.selectionStart, e.selectionEnd))(document.getElementById('editor'))`) !== 'Monday') fail('the quote should select the commented range');

// a reader with the view link sees the thread and can answer
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const V = await viewKey(T, 'pad');
const r = await Tab.open(ROOT + 'pad/?view#~' + V); await r.until(`document.body.classList.contains('viewing') && 'yes'`);
await r.eval(`localStorage.setItem('name', 'Reader'); document.getElementById('commentsb').click(); 1`);
console.log('reader', await r.until(`${threadsShown} === 'Monday|Tuesday is better?/Fine by me' && document.getElementById('commenton').hidden && 'sees the thread, cannot start one'`, 20000));
await r.eval(`(() => { const f = document.querySelector('#threadlist .thread .replyform'); f.querySelector('input').value = 'Noted'; f.requestSubmit(); })(); 1`);
console.log('A sees the reader', await a.until(`${threadsShown}.endsWith('/Noted') && 'yes'`, 20000));
await r.close();

// resolve: the thread moves under Resolved, the tint goes; reopen brings it back
await a.eval(`(() => { const f = document.querySelector('#threadlist .thread .replyform'); f.querySelector('button.link').click(); })(); 1`);
console.log('resolved', await a.until(`document.querySelectorAll('#threadlist .thread').length === 0 && !document.getElementById('resolved').hidden && ${tinted} === '' && document.getElementById('commentsb').dataset.count === '0' && 'listed under Resolved, no tint'`, 20000));
await a.eval(`document.querySelector('#resolved .thread .replyform button.link').click(); 1`);
console.log('reopened', await a.until(`document.querySelectorAll('#threadlist .thread').length === 1 && ${tinted} === 'Monday' && 'back, tinted'`, 20000));

// a reload finds the words again; deleting them leaves a thread that says so
await a.eval(`location.reload(); 1`); await a.until(ready);
await a.eval(`document.getElementById('commentsb').click(); 1`);
console.log('after reload', await a.until(`${tinted} === 'Monday' && 'anchored by its words'`, 20000));
await a.eval(`(() => { const e = document.getElementById('editor'); e.value = e.value.replace('Monday', 'Friday'); e.setSelectionRange(0, 0); e.dispatchEvent(new Event('input')); })(); 1`);
console.log('words gone', await a.until(`${tinted} === '' && document.querySelector('#threadlist .thread small')?.textContent.includes('changed') && 'the thread says the text changed'`, 20000));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
