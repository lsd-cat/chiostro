// Backend protocol: relay (hello/join/directed/broadcast/leave, oversize disconnects only its
// sender), socket store (write once, server time, pushed to the room) and the HTTP door (chunks,
// index, caps). Needs the server running (E2E_URL, default :8080).
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:8080/';
const WS = BASE.replace(/^http/, 'ws');
const next = ws => new Promise(r => ws.addEventListener('message', e => r(e.data), {once: true}));
const connect = async (room, app = 'meet') => { const ws = new WebSocket(`${WS}ws/${app}/${room}`); ws.binaryType = 'arraybuffer'; await new Promise(r => ws.onopen = r); return ws; };
const fresh = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');

test('relay routes blobs between peers of a room', async t => {
  const open = [];
  t.after(() => open.forEach(ws => ws.close()));   // never leave sockets holding the runner open
  const room = fresh();
  const a = await connect(room); open.push(a);
  const ha = await next(a); assert.match(ha, /^H \d+ $/);
  const aid = ha.split(' ')[1];
  const b = await connect(room); open.push(b);
  const [hb, ja] = await Promise.all([next(b), next(a)]);
  const bid = hb.split(' ')[1];   // ids are global on the server, so other rooms (the load test) interleave
  assert.equal(hb, `H ${bid} ${aid}`); assert.equal(ja, `J ${bid}`);
  b.send('* blob1'); assert.equal(await next(a), `M ${bid} blob1`);
  b.send(`${aid} blob2`); assert.equal(await next(a), `M ${bid} blob2`);
  b.send(new Uint8Array(2));                 // malformed binary frame: ignored, peer stays
  b.send(new Uint8Array([0, 0, 0, 0, 7, 8]));            // binary broadcast: a gets from(4) | payload
  assert.deepEqual([...new Uint8Array(await next(a))].slice(4), [7, 8]);
  b.send(new Uint8Array([0, 0, 0, +bid, 9]));              // binary to self only: a gets nothing
  b.send('* still-here'); assert.equal(await next(a), `M ${bid} still-here`);
  b.send('* ' + 'x'.repeat(300 * 1024));     // over the 256 KB cap: b is disconnected, a is told
  assert.equal(await next(a), `L ${bid}`);
  const c = await connect(room); open.push(c); assert.match(await next(c), new RegExp(`^H \\d+ ${aid}$`));   // room still fine
  const d = await connect(room, 'pad'); open.push(d); assert.match(await next(d), /^H \d+ $/);       // same id, other app: another room
  c.close(); a.close(); d.close();
});

test('HTTP door: binary chunks, index, write once, peers are told', async t => {
  const room = fresh(), url = s => `${BASE}blob/share/${room}/${s}`;
  const w = await connect(room, 'share'); t.after(() => w.close()); await next(w);
  const chunk = new Uint8Array(70000).map((_, i) => i & 255);
  assert.equal((await fetch(url('a'.repeat(32) + '.0'), {method: 'PUT', body: chunk})).status, 201);
  assert.match(await next(w), new RegExp(`^S ${'a'.repeat(32)}\\.0 \\d{13} 70000$`));   // the socket learns of HTTP puts too
  assert.equal((await fetch(url('a'.repeat(32) + '.0'), {method: 'PUT', body: 'x'})).status, 409);
  const got = new Uint8Array(await (await fetch(url('a'.repeat(32) + '.0'))).arrayBuffer());
  assert.deepEqual(got, chunk);
  assert.equal((await fetch(url('b'.repeat(32)))).status, 404);
  assert.equal((await fetch(url('a'.repeat(32) + '.0'), {method: 'DELETE'})).status, 405);
  assert.equal((await fetch(url('index'), {method: 'PUT', body: '1 fake 999999999999\n'})).status, 405, 'the index is never writable');
  assert.equal((await fetch(url('index'), {method: 'DELETE'})).status, 405);
  assert.match(await (await fetch(url('index'))).text(), /^\d{13} a{32}\.0 70000\n$/);
  { const g = await fetch(url('a'.repeat(32) + '.0')); assert.equal(g.headers.get('content-type'), 'application/octet-stream'); assert.equal(g.headers.get('content-disposition'), 'attachment'); assert.equal(g.headers.get('x-content-type-options'), 'nosniff'); }   // a blob is never a page on this origin
  assert.equal((await fetch(`${BASE}blob/share/${room}/..%2Findex`)).status, 404);
  assert.equal((await fetch(url('a'.repeat(32) + '.1'), {method: 'PUT', body: new Uint8Array(9 * 1024 * 1024)})).status, 413);   // one chunk over the per-request cap
});

test('limits: puts per address, quota per room', async t => {
  const room = fresh(), url = s => `${BASE}blob/when/${room}/${s}`;
  await new Promise(r => setTimeout(r, (10 - (Date.now() / 1000) % 10) * 1000 + 200));   // start of a fresh 10 s window
  const codes = [];
  for (let i = 0; i < 45; i++) codes.push((await fetch(url('e'.repeat(32) + '.' + i), {method: 'PUT', body: 'x'})).status);
  assert.equal(codes.filter(c => c === 201).length, 40); assert.equal(codes.filter(c => c === 429).length, 5);
});
