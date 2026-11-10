// Hostile input from every door a stranger with the link has: markdown built to inject or escape,
// a room peer that speaks garbage, replays, lies about its name and offers a javascript: page,
// a huge document, and a vandal writing checkpoint-shaped junk into the store with the view key.
// The honest pad keeps working, nothing runs, nothing crashes, the reader sees the real text.
import {randomBytes, webcrypto} from 'node:crypto';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, fail} = await launch(9308, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
const set = s => `(() => { const e = document.getElementById('editor'); e.value = ${JSON.stringify(s)}; e.setSelectionRange(e.value.length, e.value.length); e.dispatchEvent(new Event('input')); })(); 1`;
const b64u = b => Buffer.from(b).toString('base64url');

// --- hostile markdown: every way to run or reach something, in one document ---
const M = randomBytes(16).toString('base64url');
const a = await Tab.open(ROOT + 'pad/#' + M); const url = await a.until(ready);
const T = await toolKey(url.split('#')[1], 'pad');
const payloads = [
  '# <script>alert(1)</script>', '<img src=x onerror=alert(1)>', '[click](javascript:alert(1))', '[click](JAVASCRIPT:alert(1))', '[click](data:text/html,<script>alert(1)</script>)',
  '![x](javascript:alert(1))', '![x](data:image/svg+xml,<svg onload=alert(1)>)', '![x](file:../../etc/passwd)', '![x](file:zzzz)', '![x](/pad/#../../x)', '![x](https://evil.example/t.png" onerror="alert(1))',
  '[x](https://ok.example/a?b=1&c=<script>)', '`<b>code</b>`', '> <iframe src="https://evil.example">', '| a | b |\n|---|---|\n| <x> | &amp; |', '---\naccent: url(https://evil.example/x)\n---',
  '- [ ] <input type=text onfocus=alert(1)>', '~~<s>~~', '**bold <u>html</u>**', 'text with ‮ reversed ​ zero width 😀',
];
await a.eval(set(payloads.join('\n\n')));
await a.until(`document.querySelector('#preview h2') && 'yes'`);
const audit = await a.eval(`(() => { const p = document.getElementById('preview'); const out = {scripts: p.querySelectorAll('script, object, embed, style').length, handlers: [...p.querySelectorAll('*')].filter(e => [...e.attributes].some(at => /^on/i.test(at.name))).length,
  hrefs: [...p.querySelectorAll('a[href]')].map(x => x.getAttribute('href')).filter(h => !/^(https?:|mailto:|#)/i.test(h)), srcs: [...p.querySelectorAll('[src]')].map(x => x.getAttribute('src')).filter(s => !/^(https:|blob:)/.test(s) && s !== ''),
  frames: [...p.querySelectorAll('iframe')].map(f => f.src).filter(s => !s.startsWith(location.origin + '/')), accent: p.style.getPropertyValue('--accent'), rawTags: [...p.querySelectorAll('*')].some(e => /^(b|u|s|input)$/i.test(e.tagName) && e.closest('p, h2') && e.textContent.includes('html')),
  textOk: p.textContent.includes('<script>alert(1)</script>') && p.textContent.includes('<img src=x onerror=alert(1)>')}; return JSON.stringify(out); })()`);
const h = JSON.parse(audit);
if (h.scripts || h.handlers || h.hrefs.length || h.srcs.length || h.frames.length || h.accent || !h.textOk) fail('hostile markdown got through: ' + audit);
console.log('hostile markdown rendered as text:', audit);
if (await a.eval(`document.getElementById('editor').value.includes('\\u202e') && document.title.length > 0`) !== true) fail('unicode controls should survive as text');

// --- a huge document still renders and converges in reasonable time ---
const big = Array.from({length: 4000}, (_, i) => `## Section ${i}\n\nLine ${i} with **bold** and a [link](https://x.example/${i}).`).join('\n\n');
const t0 = Date.now();
await a.eval(set(big));
await a.until(`document.querySelectorAll('#preview h3').length === 4000 && 'yes'`, 30000);
const renderMs = Date.now() - t0;
if (renderMs > 15000) fail('a 4000-section document took ' + renderMs + ' ms to render');
console.log('4000 sections rendered in', renderMs, 'ms');
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);

// --- a hostile room peer, from node: speaks the wire format with the real key ---
// the pad's room hangs off the view key (so readers can listen); the signaling key comes from the tool secret (editors only)
const V0 = await viewKey(T, 'pad');
const roomId = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('pad:' + V0))).toString('hex');
const hkdf = await webcrypto.subtle.importKey('raw', Buffer.from(T, 'base64url'), 'HKDF', false, ['deriveKey']);
const key = await webcrypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('pad/signaling')}, hkdf, {name: 'AES-GCM', length: 128}, false, ['encrypt']);
let ctr = 0, myId = 0;   // the relay's hello gives our id; it is in every seal's authenticated data, so the relay cannot re-attribute a message
const sealed = async (obj, counter = ++ctr) => { const c = new Uint8Array(8); new DataView(c.buffer).setUint32(0, counter); new DataView(c.buffer).setUint32(4, myId); const iv = webcrypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await webcrypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: c}, key, new TextEncoder().encode(JSON.stringify(obj)))); return b64u(Buffer.concat([c.subarray(0, 4), iv, ct])); };   // the wire carries the counter; the id is implied by the relay's framing
const ws = new WebSocket(`${ROOT.replace(/^http/, 'ws')}ws/pad/${roomId}`);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
const closed = new Promise(r => { ws.onclose = r; });
const hello = await new Promise(r => { ws.onmessage = e => r(String(e.data)); });
if (!/^H \d+ \d+/.test(hello)) fail('the hostile peer should land in the pad\'s room with the editor already there: ' + hello);
myId = +hello.split(' ')[1];
console.log('hostile peer in the room:', hello);
ws.send('* ' + await sealed({t: 'hello', name: 'X'.repeat(5000), pub: 'not-a-key'}));           // a name far over the limit, a public key that is garbage
ws.send('* ' + await sealed({t: 'embed', id: 'e1', url: 'javascript:alert(1)'}));              // an offer to embed a script URL
ws.send('* ' + await sealed({t: 'op', v: 999999, op: {garbage: true}, from: 1}));              // an op claiming to be sequenced, from a bogus host
ws.send('* ' + await sealed({t: 'sync', state: {doc: {state: 'HACKED', v: 1}}}));             // a snapshot nobody asked for
ws.send('* ' + await sealed({t: 'hello', name: 'replay'}, 1));                                  // counter 1 again: a replay
ws.send('* not-base64-at-all');                                                                 // not even sealed
ws.send('* ' + b64u(Buffer.alloc(40, 7)));                                                      // sealed-looking bytes under no key
ws.send(Buffer.concat([Buffer.alloc(4), Buffer.alloc(100, 9)]));                                // binary junk to everyone
await sleep(1500);
const after = JSON.parse(await a.eval(`JSON.stringify({online: document.getElementById('hstatus').textContent, text: ${text}.slice(0, 20), embedAsk: !!document.getElementById('embedask') && !document.getElementById('embedask').hidden, editable: !document.getElementById('editor').readOnly, docs: document.querySelectorAll('#preview h3').length})`));
if (!after.editable || after.text !== big.slice(0, 20) || after.docs !== 4000 || after.embedAsk) fail('the honest pad should shrug off a hostile peer: ' + JSON.stringify(after));
if (!/X{40}(?!X)/.test(after.online) || after.online.length > 120) fail('the hostile name should be cut to 40 characters in the presence line: ' + after.online.slice(0, 80));
console.log('hostile peer ignored; presence shows the cut name:', after.online.slice(0, 60));
ws.send('* ' + await sealed({t: 'x', pad: 'y'.repeat(300 * 1024)}));                           // over the frame cap: the relay drops this peer, nobody else
await Promise.race([closed, sleep(5000)]);
if (ws.readyState !== WebSocket.CLOSED) fail('an oversize frame should get the sender disconnected');
console.log('oversize frame: hostile peer disconnected, honest pad still', await a.eval(`document.getElementById('hstatus').textContent.includes('1 online') ? 'alone and fine' : document.getElementById('hstatus').textContent`));

// --- a store vandal with the view key: junk checkpoints and a forged head; the reader still gets the real text ---
const V = V0, roomV = roomId;
const put = async (slot, body) => (await fetch(`${ROOT}blob/pad/${roomV}/${slot}`, {method: 'PUT', body})).status;
const junk = [];
for (let i = 0; i < 5; i++) junk.push(await put('0000' + 'f'.repeat(20) + String(i).padStart(8, '0'), randomBytes(200)));
const head = await put('2'.repeat(32), randomBytes(64));
console.log('vandal puts', junk.join(','), 'forged head', head);
if ((await fetch(`${ROOT}blob/pad/${roomV}/${'0000' + 'f'.repeat(20) + '00000000'}`, {method: 'DELETE', headers: {'X-Delete-Key': 'ab'.repeat(32)}})).status !== 404) fail('a blob stored without a removal key cannot be deleted by anyone');
if (head !== 409) fail("the editors' public key slot must already be taken: " + head);
await a.eval(set('# Real text\n\nAfter the vandal.'));
await a.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const r = await Tab.open(ROOT + 'pad/?view#~' + V);
console.log('reader', await r.until(`document.body.classList.contains('viewing') && document.querySelector('#preview h2')?.textContent === 'Real text' && 'shows the real text'`, 30000));
await a.eval(`document.getElementById('history').dispatchEvent(new Event('focus')); 1`);   // a programmatic focus fires no event in an unfocused headless window
const hist = await a.until(`(n => n > 0 && n)(document.getElementById('history').options.length - 1)`, 30000);   // every entry is verified before it is listed
if (hist > 6 || hist < 2) fail('history should list only checkpoints that verify, got ' + hist);
console.log('history lists', hist, 'verified checkpoints, none of the junk');
await r.close();

// --- a room no editor ever opened: a checkpoint sealed with the view key but unsigned must not reach a reader ---
const enc = s => new TextEncoder().encode(s), sha256hex = async s => Buffer.from(await webcrypto.subtle.digest('SHA-256', enc(s))).toString('hex');
const T3 = await toolKey(randomBytes(16).toString('base64url'), 'pad'), V3 = await viewKey(T3, 'pad'), room3 = await sha256hex('pad:' + V3);
const hk = await webcrypto.subtle.importKey('raw', Buffer.from(V3, 'base64url'), 'HKDF', false, ['deriveKey']);
const storeKey = await webcrypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc('pad/store')}, hk, {name: 'AES-GCM', length: 128}, false, ['encrypt']);
const sealBlob = async (slot, obj) => { const iv = webcrypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await webcrypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: enc(slot)}, storeKey, enc(JSON.stringify(obj)))); return Buffer.concat([Buffer.from([1]), iv, ct]); };
const slot3 = '0000' + 'e'.repeat(20) + '00000001';
if ((await fetch(`${ROOT}blob/pad/${room3}/${slot3}`, {method: 'PUT', body: await sealBlob(slot3, {state: '# Forged\n\nUnsigned, and the room has no key.', v: 1})})).status !== 201) fail('the forged checkpoint should land');
const r3 = await Tab.open(ROOT + 'pad/?view#~' + V3);
await r3.until(`document.body.classList.contains('viewing') && document.getElementById('hstatus').textContent.includes('no editor key') && 'yes'`, 30000);
await sleep(3000);
if (await r3.eval(`document.getElementById('editor').value + document.getElementById('preview').textContent`) !== '') fail('a reader without the editors\' key must show nothing, got: ' + await r3.eval(`document.getElementById('preview').textContent.slice(0, 80)`));
console.log('keyless room: the reader shows nothing of the forged checkpoint');
await r3.close();

// --- the key slot squatted before the editor arrives: the editor refuses to vouch and offers no view link ---
const T4 = await toolKey(randomBytes(16).toString('base64url'), 'pad'), V4 = await viewKey(T4, 'pad'), room4 = await sha256hex('pad:' + V4);
if ((await fetch(`${ROOT}blob/pad/${room4}/${'2'.repeat(32)}`, {method: 'PUT', body: randomBytes(64)})).status !== 201) fail('the squat should land');
const e4 = await Tab.open(ROOT + 'pad/#~' + T4);
await e4.until(`document.getElementById('hstatus').textContent.includes('signing key') && 'yes'`, 30000);
if (await e4.eval(`!!document.getElementById('viewlink') || !document.getElementById('editor').readOnly`)) fail('a squatted pad must offer no view link and no editing');
console.log('squatted key slot: the editor is told and gets no view link');
e4.violations = e4.violations.filter(v => !v.includes('foreign key'));   // the refusal is thrown on purpose
await e4.close();

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
