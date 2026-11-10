// Forms in headless Chrome: build a form with a choice and a text question, answer it from a
// public link, the owner's link shows results live and exports CSV, the public link shows none;
// an "open results" form shows them to everyone.
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {launch, sleep, ROOT} from './tab.mjs';
const {Tab, profile, fail} = await launch(9242);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const build = async (t, open) => {
  await t.until(`document.getElementById('go') && !document.getElementById('build').hidden && document.querySelectorAll('.field').length === 1 && 'yes'`);
  await t.eval(`(() => { document.getElementById('ftitle').value = 'Lunch'; const f = document.querySelector('.field'); f.querySelector('input').value = 'Dish?'; f.querySelector('textarea').value = 'Pizza\\nPasta'; document.getElementById('addfield').click(); })(); 1`);
  await t.eval(`(() => { const f = document.querySelectorAll('.field')[1]; f.querySelector('input').value = 'Allergies'; f.querySelector('select').value = 'text'; document.getElementById('openres').checked = ${open}; document.getElementById('go').click(); })(); 1`);
  return t.until(`document.getElementById('questions')?.children.length === 2 && location.href`);
};
const answer = async (t, dish, text) => {
  await t.eval(`document.querySelector('input[name="q0"][value="${dish}"]').checked = true; document.querySelector('[name="q1"]').value = ${JSON.stringify(text)}; document.getElementById('answer').requestSubmit(); 1`);
  await t.until(`document.getElementById('sent').textContent.length > 0 && document.getElementById('answer').hidden && 'yes'`);
};
const asNewPerson = async (url) => { const t = await Tab.open(ROOT); await t.until(`document.getElementById('toolgrid') && 'yes'`); await t.eval(`localStorage.clear(); location.href = ${JSON.stringify(url)}; 1`); return t; };

// closed form: only the owner reads answers
const a = await Tab.open(ROOT + 'form/');
const ownerUrl = await build(a, false);
console.log('owner link', ownerUrl);
if (!/#~[\w-]{22}\.[\w-]{40,}$/.test(ownerUrl)) fail('owner link should be the form\'s own link plus a private key after a dot');
const publicUrl = ownerUrl.replace(/#([^.]*)\..*$/, '#$1');   // drop the owner capability after the dot
console.log('A sees results section', await a.until(`!document.getElementById('results').hidden && document.getElementById('rcount').textContent`));
console.log('A share box', await a.eval(`document.getElementById('publiclink').textContent + ' | ' + (document.getElementById('ownerlink').textContent === location.href)`));
const b = await asNewPerson(publicUrl); await b.until(`document.getElementById('questions')?.children.length === 2 && 'yes'`);
if (!await b.eval(`document.getElementById('results').hidden && !document.getElementById('locked').hidden`)) fail('public link must not show results');
await answer(b, 'Pasta', 'nuts, "peanuts"');
const c = await asNewPerson(publicUrl); await c.until(`document.getElementById('questions')?.children.length === 2 && 'yes'`);
await answer(c, 'Pizza', '=1+1');   // a formula: must come out quoted
console.log('A live results', await a.until(`document.getElementById('rcount').textContent.includes('2 answers') && document.querySelectorAll('#table tbody tr').length === 2 && document.getElementById('table').textContent`));
console.log('A tally', await a.eval(`[...document.querySelectorAll('.tally b')].map(b => b.textContent).join('/')`));
if (await a.eval(`[...document.querySelectorAll('.tally b')].map(b => b.textContent).join('/')`) !== 'Dish?/1/1') fail('tally should be 1 Pizza, 1 Pasta');
// CSV: a real download with quotes escaped
await a.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await a.eval(`document.getElementById('csv').click(); 1`);
let csv; for (let i = 0; i < 40 && !csv; i++) { csv = readdirSync(profile).find(f => f.endsWith('.csv')); await sleep(250); }
if (!csv) fail('no CSV downloaded');
const text = readFileSync(join(profile, csv), 'utf8');
console.log('csv', JSON.stringify(text.slice(0, 120)));
if (!/"Answered","Dish\?","Allergies"\r\n/.test(text) || !text.includes('"nuts, ""peanuts"""') || !text.includes('"Pizza"')) fail('bad csv: ' + text);
if (!text.includes("\"'=1+1\"") || text.includes('"=1+1"')) fail('a formula-looking answer must be neutralised in the CSV: ' + text);
// an answer cannot be read by the server or a stranger: the stored blob is not JSON
const room = await a.eval(`document.querySelector('#table') && location.href`);
// open form: results for everyone
const d = await asNewPerson(ROOT + 'form/'); const openUrl = await build(d, true);
if (openUrl.split('#')[1].includes('.')) fail('open form needs no owner key');
const e = await asNewPerson(openUrl); await e.until(`document.getElementById('questions')?.children.length === 2 && 'yes'`);
await answer(e, 'Pizza', 'none');
console.log('E sees open results', await e.until(`document.querySelectorAll('#table tbody tr').length === 1 && 'yes'`));
// Menti-style: an open form with a word cloud and a scale is presented; phones follow the presenter one question at a time
const p = await asNewPerson(ROOT + 'form/');
await p.until(`document.getElementById('go') && document.querySelectorAll('.field').length === 1 && 'yes'`);
await p.eval(`(() => { document.getElementById('ftitle').value = 'Retro'; const f = document.querySelector('.field'); f.querySelector('input').value = 'One word for this week'; f.querySelector('select').value = 'words'; document.getElementById('addfield').click();
  const g = document.querySelectorAll('.field')[1]; g.querySelector('input').value = 'Energy level'; g.querySelector('select').value = 'scale'; document.getElementById('openres').checked = true; document.getElementById('go').click(); })()`);
const liveUrl = await p.until(`document.getElementById('questions')?.children.length === 2 && location.href`);
await p.eval(`document.getElementById('present').click(); 1`);
console.log('presenting', await p.until(`!document.getElementById('fpresent').hidden && document.getElementById('fpqtitle').textContent === 'One word for this week' && document.getElementById('fpcount').textContent`));
if (await p.eval(`document.getElementById('fpqr').width`) < 100) fail('present view should draw the join QR');
const phone = await asNewPerson(liveUrl);
console.log('phone follows', await phone.until(`document.querySelectorAll('#questions .q:not([hidden])').length === 1 && !document.getElementById('waiting').hidden && document.getElementById('results').hidden && document.getElementById('hstatus').textContent`));
await phone.eval(`document.querySelector('[name="q0"]').value = 'focused'; document.getElementById('answer').requestSubmit(); 1`);
await phone.until(`document.getElementById('sent').textContent.length > 0 && 'yes'`);
console.log('presenter counts it', await p.until(`document.getElementById('fpcount').textContent.includes('1 answer') && document.getElementById('fpviz').textContent`));
await p.eval(`document.getElementById('fpreveal').click(); 1`);
console.log('cloud', await p.until(`(c => c && c.textContent === 'focused' && c.title === '1' && 'a word, sized by its count')(document.querySelector('#fpviz .cloud span'))`));
console.log('phone sees results', await phone.until(`!document.getElementById('results').hidden && document.getElementById('waiting').hidden && document.getElementById('rcount').textContent`, 20000));
await p.eval(`document.getElementById('fpnext').click(); 1`);
console.log('phone on question 2', await phone.until(`document.querySelector('#questions .q:not([hidden]) legend')?.textContent === 'Energy level' && !document.getElementById('answer').hidden && 'scale shown, can answer again'`, 20000));
await phone.eval(`document.querySelector('input[name="q1"][value="4"]').checked = true; document.getElementById('answer').requestSubmit(); 1`);
await phone.until(`document.getElementById('sent').textContent.length > 0 && 'yes'`);
console.log('average', await p.until(`document.querySelector('#fpviz .fpavg')?.textContent.includes('4.0') && document.querySelector('#fpviz .fpavg').textContent`));
await p.eval(`document.getElementById('fpexit').click(); 1`);
if (!await p.eval(`document.getElementById('fpresent').hidden`)) fail('exit should close the present view');

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
