// Scalability of the relay: N peers in one room, each broadcasting; everyone must receive
// every message, fan-out latency stays low, and the single nginx worker's memory stays flat.
// Prints the numbers; asserts generous bounds. Needs the server running on 127.0.0.1:8080.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execSync} from 'node:child_process';

const WS = (process.env.E2E_URL ?? 'http://127.0.0.1:8080/').replace(/^http/, 'ws');
const N = +(process.env.PEERS ?? 40), ROUNDS = 5;
const rss = () => { try { return +execSync(`ps -o rss= -p $(pgrep -f 'nginx: worker process' | head -1)`).toString().trim(); } catch { return 0; } };
const fresh = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');

test(`${N} peers broadcasting: all delivered, flat memory`, async t => {
  const room = fresh(), peers = [];
  t.after(() => peers.forEach(ws => ws.close()));
  const before = rss();
  for (let i = 0; i < N; i++) {
    const ws = new WebSocket(`${WS}ws/meet/${room}`); ws.got = 0; ws.lat = [];
    ws.onmessage = e => { if (typeof e.data === 'string' && e.data.startsWith('M ')) { ws.got++; ws.lat.push(Date.now() - +e.data.split(' ')[2]); } };
    await new Promise(r => ws.onopen = r); peers.push(ws);
  }
  for (let r = 0; r < ROUNDS; r++) { for (const ws of peers) ws.send(`* ${Date.now()} ${'x'.repeat(2000)}`); await new Promise(res => setTimeout(res, 200)); }
  await new Promise(res => setTimeout(res, 1000));
  const expected = ROUNDS * (N - 1);
  const lat = peers.flatMap(p => p.lat).sort((a, b) => a - b);
  const after = rss();
  console.log(`peers ${N}: delivered ${peers.reduce((s, p) => s + p.got, 0)}/${N * expected}, latency p50 ${lat[Math.floor(lat.length / 2)]} ms p95 ${lat[Math.floor(lat.length * 0.95)]} ms, worker RSS ${before} -> ${after} KB`);
  for (const p of peers) assert.equal(p.got, expected, 'every peer gets every message');
  assert.ok(lat[Math.floor(lat.length * 0.95)] < 500, 'p95 fan-out latency under 500 ms');
  assert.ok(after - before < 40000, 'worker grew less than 40 MB');
});
