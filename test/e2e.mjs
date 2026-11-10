// Full call in two headless Chrome tabs: encrypted video both ways, chat, screen share, leave.
// Needs the server running (default http://127.0.0.1:8080) and Chrome; no npm deps.
import {writeFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {launch, sleep, ROOT} from './tab.mjs';

const RELAY = process.env.MEDIA === 'relay';   // MEDIA=relay tests the WebCodecs-through-server mode
const BASE = ROOT + 'meet/';
// E2E_ADV=1 puts the relay server and an explicit ICE list into the link (same origin, so CSP allows it)
const ADV = process.env.E2E_ADV ? `server=${encodeURIComponent(BASE.replace(/\/$/, ''))}&ice=${encodeURIComponent('stun.l.google.com:19302\nturn:turn.example.org:3478 user pass')}` : '';
const URL_ = BASE + '?' + [RELAY ? 'media=relay' : 'media=p2p', ADV].filter(Boolean).join('&');

// Collect RTCPeerConnections so the test can assert real decoded frames, not just a video width.
const {Tab, profile} = await launch(9222, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire', '--autoplay-policy=no-user-gesture-required'], `(() => { const O = RTCPeerConnection; globalThis.__pcs = []; globalThis.RTCPeerConnection = function (...a) { const pc = new O(...a); __pcs.push(pc); return pc; }; RTCPeerConnection.prototype = O.prototype; Object.setPrototypeOf(RTCPeerConnection, O); })()`);

const size = `(e => e.videoWidth ?? e.width)`;
const tiles = `JSON.stringify([...document.querySelectorAll('.tile')].filter(t => t.querySelector('video, canvas')).map(t => [t.querySelector('.label').textContent, ${size}(t.querySelector('video, canvas'))]))`;
const allPlaying = `[...document.querySelectorAll('.tile video, .tile canvas')].every(e => ${size}(e) > 0)`;
// decoded frame counts per remote video: WebRTC stats in mesh mode, canvas counters in relay mode
const frames = RELAY
  ? `(async () => [...document.querySelectorAll('.tile canvas')].map(c => +c.dataset.frames || 0))()`
  : `(async () => { const n = []; for (const pc of __pcs) for (const r of (await pc.getStats()).values()) if (r.type === 'inbound-rtp' && r.kind === 'video') n.push(r.framesDecoded); return n; })()`;
const decoding = `${frames}.then(n => n.length > 0 && n.every(x => x >= 10))`;
const click = id => `document.getElementById('${id}').click(); 1`;

const ready = `location.hash.length > 1 && document.getElementById('join')?.onclick && location.href`;   // app module finished loading
process.on('uncaughtException', async e => { console.error(e.message.slice(0, 120)); for (const t of Tab.all) console.error('tab:', t.violations, await t.eval(`JSON.stringify({status: document.getElementById('status').textContent, prejoin: document.getElementById('prejoin').hidden, err: document.getElementById('err').textContent, pollHidden: document.getElementById('poll')?.hidden, pollQ: document.getElementById('pollquestion')?.textContent, counts: [...document.querySelectorAll('#polloptions .option b')].map(b => b.textContent).join('/'), ink: document.getElementById('ink').dataset.strokes, page: document.getElementById('pdfpage').textContent, tiles: ${tiles}, pcs: (globalThis.__pcs ?? []).map(p => p.connectionState + '/' + p.signalingState)})`).catch(String)); process.exit(1); });
// Every built module must be served (a file missing from the server's table breaks the module graph silently).
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
for (const f of walk('dist').filter(p => p.endsWith('.js')).map(p => p.replace(/^dist\//, ''))) {
  const r = await fetch(new URL('/' + f, BASE)); if (r.status !== 200) { console.log(`FAIL: ${f} not served (${r.status})`); process.exit(1); }
}
const a = await Tab.open(URL_);
const room = await a.until(ready); console.log('room', room);
if (!/[?&]media=(p2p|relay)/.test(room)) { console.log('FAIL: invite link does not carry the media mode'); process.exit(1); }
if (process.env.E2E_ADV && !/[?&]ice=/.test(room)) { console.log('FAIL: invite link lost the advanced settings'); process.exit(1); }
const b = await Tab.open(room); await b.until(ready);
for (const [t, name] of [[a, 'Alice'], [b, 'Bob']]) await t.eval(`document.getElementById('pname').value = '${name}'; ${click('join')}`);
console.log('A tiles', await a.until(`(${tiles}).includes('"Bob",') && ${allPlaying} && ${tiles}`));
console.log('B tiles', await b.until(`(${tiles}).includes('"Alice",') && ${allPlaying} && ${tiles}`));
console.log('A decoding', await a.until(`${decoding}.then(ok => ok && 'yes')`));
console.log('B decoding', await b.until(`${decoding}.then(ok => ok && 'yes')`));
await a.eval(click('camb'));   // Alice turns her camera off: Bob sees her avatar, then her video again
console.log('B sees avatar', await b.until(`(t => t && t.classList.contains('camoff') && t.querySelector('.avatar')?.textContent)(document.querySelector('[data-peer]:not([data-peer="me"])'))`));
console.log('B sees camera badge', await b.until(`(t => t && !t.querySelector('.badge-cam').hidden && 'badge')(document.querySelector('[data-peer]:not([data-peer="me"])'))`));
await a.eval(click('camb'));
console.log('B sees video again', await b.until(`!document.querySelector('[data-peer]:not([data-peer="me"])').classList.contains('camoff') && 'yes'`));
// Alice mutes: Bob sees a muted badge on her tile; unmute clears it
await a.eval(click('mic'));
console.log('B sees mic badge', await b.until(`(t => t && !t.querySelector('.badge-mic').hidden && 'badge')(document.querySelector('[data-peer]:not([data-peer="me"])'))`));
await a.eval(click('mic'));
console.log('B mic badge gone', await b.until(`(t => t && t.querySelector('.badge-mic').hidden && 'yes')(document.querySelector('[data-peer]:not([data-peer="me"])'))`));
await b.eval(click('chatb'));   // Bob closes the chat: the next message must show as unread + toast
await a.eval(`document.getElementById('msg').value = 'hi bob'; document.getElementById('chatform').requestSubmit(); 1`);
console.log('B chat', await b.until(`document.getElementById('messages').textContent.includes('hi bob') && document.getElementById('messages').textContent`));
console.log('B unread', await b.until(`!document.getElementById('unread').hidden && document.getElementById('unread').textContent === '1' && !document.getElementById('toast').hidden && document.getElementById('toast').textContent`));
await b.eval(click('toast'));
console.log('B chat reopened', await b.until(`!document.getElementById('chat').hidden && document.getElementById('unread').hidden && 'yes'`));
await a.eval(click('share'));
console.log('B share', await b.until(`(${tiles}).includes('(screen)') && ${allPlaying} && ${tiles}`));
console.log('B decoding', await b.until(`${decoding}.then(ok => ok && 'yes')`));
await a.eval(click('share'));
console.log('B unshare', await b.until(`!(${tiles}).includes('(screen)') && ${tiles}`));
// PDF: Alice picks a file, Bob accepts, pages follow, close propagates
const pdfPath = join(profile, 't.pdf');
// ~1.5 MB so the transfer spans many chunks
writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R 4 0 R]/Count 2>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n%' + 'x'.repeat(1500000) + '\ntrailer<</Root 1 0 R>>');
const {root: {nodeId}} = (await a.call('DOM.getDocument')).result;
const {nodeId: input} = (await a.call('DOM.querySelector', {nodeId, selector: '#pdffile'})).result;
await a.call('DOM.setFileInputFiles', {nodeId: input, files: [pdfPath]});
console.log('B asked', await b.until(`!document.getElementById('pdfask').hidden && document.getElementById('pdfask-text').textContent`));
await a.eval(click('pdfnext'));   // presenter moves on before Bob accepts
await b.eval(click('pdfyes'));
console.log('B progress', await b.until(`document.getElementById('pdfyes').hidden && document.getElementById('pdfask-text').textContent.includes('%') && document.getElementById('pdfask-text').textContent`));
console.log('B pdf', await b.until(`!document.getElementById('pdf').hidden && document.getElementById('pdfask').hidden && document.getElementById('pdfframe').src.startsWith('blob:') && document.getElementById('pdfname').textContent`));
console.log('B page', await b.until(`document.getElementById('pdfframe').src.includes('#page=2') && document.getElementById('pdfpage').textContent`));
await a.eval(click('pdfnext'));
console.log('B page', await b.until(`document.getElementById('pdfframe').src.includes('#page=3') && document.getElementById('pdfpage').textContent`));
// a viewer cannot turn the presenter's pages: Bob forges pdf-page, Alice must stay on 3
await b.eval(`document.getElementById('pdfnext').hidden = false; ${click('pdfnext')}`);
await sleep(1500);
console.log('A page after forged turn', await a.eval(`document.getElementById('pdfpage').textContent`));
if (await a.eval(`document.getElementById('pdfpage').textContent`) !== '3') { console.log('FAIL: viewer moved presenter'); process.exit(1); }
// Annotation: presenter turns to page 4 (Bob's forged turn left him there), draws, Bob sees it; clear propagates
await a.eval(click('pdfnext'));
await b.until(`document.getElementById('pdfpage').textContent === '4' && 'yes'`);
await a.eval(click('inkb'));
console.log('A strip clickable', await a.until(`(b => { const r = b.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === b && 'yes'; })(document.getElementById('inkdone'))`));
await a.eval(`(() => { const c = document.getElementById('ink'), r = c.getBoundingClientRect(); const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, {clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true})); ev('pointerdown', 50, 50); ev('pointermove', 120, 90); ev('pointermove', 200, 140); ev('pointerup', 200, 140); })()`);
console.log('A strokes', await a.until(`document.getElementById('ink').dataset.strokes`));
console.log('B strokes', await b.until(`document.getElementById('ink').dataset.strokes === '1' && 'one'`));
await a.eval(click('inkclear'));
console.log('B strokes after clear', await b.until(`document.getElementById('ink').dataset.strokes === '0' && 'none'`));
await a.eval(click('pdfclose'));
console.log('B pdf closed', await b.until(`document.getElementById('pdf').hidden && 'yes'`));
// Without a PDF the canvas sits over the tiles, including tiles added after it (Bob joined after the canvas existed)
await a.eval(click('inkdone')); await a.eval(click('inkb'));   // pen was still on from the drawing step: restart it cleanly
console.log('A canvas over tiles', await a.until(`(t => { const r = t.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.id === 'ink' && 'yes'; })(document.querySelector('[data-peer]:not([data-peer="me"])'))`));
await a.eval(click('inkdone'));
// Raise hand: Alice raises, Bob sees a badge on Alice's tile with position 1
await a.eval(click('handb'));
console.log('B hand', await b.until(`[...document.querySelectorAll('.tile.hand')].map(t => t.dataset.hand).join() === '1' && 'badge'`));
await a.eval(click('handb'));
// Poll: Alice creates, Bob votes, Alice sees the tally; Alice closes
await a.eval(`document.getElementById('pollb').click(); document.getElementById('pollq').value = 'Lunch?'; document.getElementById('pollopts').value = 'Pizza\\nPasta'; document.getElementById('pollform').requestSubmit(); 1`);
console.log('B poll', await b.until(`!document.getElementById('poll').hidden && document.getElementById('pollquestion').textContent`));
await b.eval(`document.querySelectorAll('#polloptions .option')[1].click(); 1`);
console.log('A tally', await a.until(`document.querySelectorAll('#polloptions .option b')[1].textContent === '1' && 'pasta=1'`));
await a.eval(click('pollclose'));
console.log('B poll closed', await b.until(`document.querySelectorAll('#polloptions .option')[0].disabled && 'yes'`));
await b.eval(click('polldismiss'));
console.log('B poll dismissed', await b.until(`document.getElementById('poll').hidden && 'yes'`));
// Agenda + timer (only when the deployment enables the extension): Alice adds an item and starts a timer; Bob sees both
if (await a.eval(`!!document.getElementById('agendab')`)) {
await a.eval(`document.getElementById('agendab').click(); document.getElementById('agendanew').value = 'Budget'; document.getElementById('agendaform').requestSubmit(); 1`);
console.log('B agenda', await b.until(`document.getElementById('agendalist').textContent.includes('Budget') && 'item'`));
await a.eval(`document.getElementById('timermin').value = '2'; document.getElementById('timerform').requestSubmit(); 1`);
console.log('B timer', await b.until(`/^01:5\\d$/.test(document.getElementById('agendatime').textContent) && document.getElementById('agendatime').textContent`));
await a.eval(click('timerstop'));
} else console.log('agenda extension disabled here, skipped');
// Embed (only when enabled): Alice shares a page, Bob is told the origin, accepts, gets a sandboxed frame; Alice closes
if (await a.eval(`!!document.getElementById('embedb')`)) {
await a.eval(`document.getElementById('embedb').click(); document.getElementById('embedurl').value = 'https://example.com/page?x=1'; document.getElementById('embedform').requestSubmit(); 1`);
console.log('B embed ask', await b.until(`!document.getElementById('embedask').hidden && document.getElementById('embedask-text').textContent`));
await b.eval(click('embedyes'));
console.log('B frame', await b.until(`(f => f && f.getAttribute('sandbox') && f.referrerPolicy === 'no-referrer' && f.src)(document.querySelector('#embedview iframe'))`));
await a.eval(click('embedclose'));
console.log('B embed closed', await b.until(`document.getElementById('embed').hidden && 'yes'`));
} else console.log('embed extension disabled here, skipped');
// Recording: Alice records 2 s locally; Bob sees the indicator; stopping offers a file
await a.eval(click('recb'));
console.log('B sees recording', await b.until(`!document.getElementById('recnote').hidden && document.getElementById('recnote').textContent`));
await sleep(2000);
await a.eval(click('recb'));
console.log('B recording gone', await b.until(`document.getElementById('recnote').hidden && 'yes'`));
// Key rotation: Carol joins, leaves; Alice and Bob must keep decoding each other with new keys
const c = await Tab.open(room); await c.until(ready);
await c.eval(`document.getElementById('pname').value = 'Carol'; ${click('join')}`);
console.log('A sees Carol', await a.until(`(${tiles}).includes('"Carol",') && ${allPlaying} && 'yes'`));
console.log('C synced chat', await c.until(`document.getElementById('messages').textContent.includes('hi bob') && 'yes'`));
console.log('C synced poll', await c.until(`!document.getElementById('poll').hidden && document.querySelectorAll('#polloptions .option b')[1]?.textContent === '1' && document.getElementById('pollquestion').textContent`));
if (await a.eval(`!!document.getElementById('agendab')`)) console.log('C synced agenda', await c.until(`document.getElementById('agendalist').textContent.includes('Budget') && 'yes'`));
await c.eval(click('leave'));
console.log('A after Carol left', await a.until(`document.getElementById('status').textContent.includes('2 in call') && 'yes'`));
const total = async () => (await a.eval(`${frames}.then(n => n.reduce((s, x) => s + x, 0))`));
const before = await total();
await sleep(2000);
const after = await total();
console.log('A frames from Bob after rotation', before, '->', after);
if (!(after > before + 10)) { console.log('FAIL: decoding stopped after key rotation'); process.exit(1); }
await b.eval(click('leave'));
console.log('A leave', await a.until(`document.getElementById('status').textContent.includes('1 in call') && ${tiles}`));
for (const [n, t] of [['A', a], ['B', b], ['C', c]]) if (t.violations.length) { console.log(n, 'CSP/exception:', t.violations); process.exit(1); }
console.log('no CSP violations or exceptions');
console.log('ALL OK');
process.exit(0);
