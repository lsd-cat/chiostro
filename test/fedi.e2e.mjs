// Fediverse snapshots in a pad: an editor's browser fetches a post and an event from a (fake)
// instance, seals them into the pad's room; a view-link reader renders them without ever
// contacting the instance; Refresh fetches again. The fake instance counts its requests.
import {createServer} from 'node:http';
import {webcrypto} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, fail} = await launch(9244);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const hits = [];
const fake = createServer((req, res) => {
  hits.push(req.url);
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/v1/statuses/42') res.end(JSON.stringify({content: '<p>Hello <b>fediverse</b> &amp; friends</p>', created_at: '2026-11-01T10:00:00Z', account: {display_name: 'Ann', acct: 'ann@fake'}}));
  else if (req.url === '/events/11111111-2222-3333-4444-555555555555') res.end(JSON.stringify({type: 'Event', name: 'Picnic in the park', content: '<p>Bring food</p>', startTime: '2027-06-01T10:00:00Z', endTime: '2027-06-01T14:00:00Z', location: {name: 'Park', address: 'Main st'}}));
  else { res.statusCode = 404; res.end('{}'); }
}).listen(8099);
const INST = 'http://127.0.0.1:8099';

const ready = `!document.getElementById('editor').readOnly && location.href`;
const a = await Tab.open(ROOT + 'pad/'); const url = await a.until(ready);
await a.eval(`(() => { const e = document.getElementById('editor'); e.value = '# Links\\n\\n![a post](${INST}/@ann/42)\\n\\n![the picnic](${INST}/events/11111111-2222-3333-4444-555555555555)\\n'; e.dispatchEvent(new Event('input')); })(); 1`);
console.log('A post card', await a.until(`(c => c && c.textContent)(document.querySelector('#preview .fedi-card.post'))`, 20000));
console.log('A event card', await a.until(`(c => c && c.textContent)(document.querySelector('#preview .fedi-card.event'))`, 20000));
if (!await a.eval(`document.querySelector('#preview .fedi-card.post').textContent.includes('Hello fediverse & friends')`)) fail('post text not rendered as text');
if (!await a.eval(`document.querySelector('#preview .fedi-card.event').textContent.includes('Park, Main st')`)) fail('event place missing');
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 10000);
const before = hits.length; console.log('instance hits so far', hits);
// the reader
const V = await viewKey(await toolKey(url.split('#')[1], 'pad'), 'pad');
const v = await Tab.open(ROOT + 'pad/?view#~' + V);
console.log('viewer cards', await v.until(`document.querySelectorAll('#preview .fedi-card').length === 2 && document.querySelector('#preview .fedi-card.event h3').textContent`));
await sleep(1500);
if (hits.length !== before) fail('the reader must not contact the instance: ' + hits.slice(before));
if (await v.eval(`!!document.querySelector('#preview .fedi-card button')`)) fail('readers have no refresh button');
// refresh by the editor
await a.eval(`document.querySelector('#preview .fedi-card.post button.link').click(); 1`);
await a.until(`${JSON.stringify(hits.length)} < ${hits.length + 1} || true`);
for (let i = 0; i < 20 && hits.length === before; i++) await sleep(250);
if (hits.length !== before + 1) fail('refresh should fetch exactly once more');
console.log('refresh fetched again; instance hits', hits.length);
for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
fake.close(); process.exit(0);
