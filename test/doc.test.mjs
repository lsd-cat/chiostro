// The document sequencer with many peers over a simulated relay: random concurrent edits with
// random delivery delays converge; the sequencer leaving hands over without losing edits; a
// dropped message triggers a resync instead of a frozen client.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Doc, text} from '../dist/core/doc.js';
import {Sync} from '../dist/core/sync.js';
import {diff} from '../dist/core/ot.js';

let seed = 11;
const rnd = n => (seed = (seed * 48271) % 2147483647) % n;

// An in-memory relay with the server's semantics: ids increase, per-sender order kept, a delay per message.
class Relay {
  peers = new Map(); next = 1; queue = []; dropNext = 0;
  join(sig) { sig.myId = this.next++; const others = [...this.peers.keys()]; for (const p of this.peers.values()) p.onJoin?.(sig.myId, false); this.peers.set(sig.myId, sig); sig.onReady?.(others); for (const o of others) sig.onJoin?.(o, true); }
  leave(id) {   // like the server: the leave notice queues behind what the leaver already sent to each peer
    this.peers.delete(id);
    for (const [to] of this.peers) { const k = id + '>' + to, at = Math.max(this.last.get(k) ?? 0, this.now + 1); this.last.set(k, at); this.queue.push({at, seq: this.seq++, id: to, from: id, leave: true}); }
  }
  last = new Map();   // per (from, to) the delivery time of the previous message: order per sender is kept, like TCP
  send(from, to, m) { if (this.dropNext > 0) { this.dropNext--; return; } for (const [id, p] of this.peers) if (id !== from && (to === '*' || to === id)) { const k = from + '>' + id, at = Math.max(this.last.get(k) ?? 0, this.now + 1 + rnd(5)); this.last.set(k, at); this.queue.push({at, seq: this.seq++, id, from, m: JSON.parse(JSON.stringify(m))}); } }
  now = 0; seq = 0;
  async tick() { this.now++; const due = this.queue.filter(q => q.at <= this.now).sort((a, b) => a.at - b.at || a.seq - b.seq); this.queue = this.queue.filter(q => q.at > this.now); for (const q of due) { const p = this.peers.get(q.id); if (!p) continue; if (q.leave) p.onLeave?.(q.from); else for (const h of p.handlers.get(q.m.t) ?? []) await h(q.from, q.m); } }
  async settle() { for (let i = 0; i < 100000 && this.queue.length; i++) await this.tick(); }   // until nothing is in flight
}
class Sig { constructor(relay) { this.relay = relay; this.handlers = new Map(); this.myId = 0; } on(t, h) { this.handlers.set(t, [...(this.handlers.get(t) ?? []), h]); } send(to, m) { this.relay.send(this.myId, to, m); } }
class RosterStub { peers = new Map(); constructor(sig) { sig.onJoin = (id, i) => { this.peers.set(id, {}); this.onJoin?.(id, i); }; sig.onLeave = id => { this.peers.delete(id); this.onLeave?.(id); }; } }
const storeStub = {list: async () => [], get: async () => null, put: async () => 201, onChange: undefined};

function peer(relay, initial = '') {
  const sig = new Sig(relay), roster = new RosterStub(sig);
  const core = {sig, roster, bus: null, store: storeStub}; core.sync = new Sync(core);
  const doc = new Doc(core, storeStub, text, initial, 1e9);
  doc.view = initial; doc.typed = 0;
  doc.onRemote = op => { doc.view = text.apply(doc.view, op); };
  // a real editor is read-only while not synced, so typing then is impossible
  doc.type = s => { if (!doc.ready) return; const at = rnd(doc.view.length + 1); const next = doc.view.slice(0, at) + s + doc.view.slice(at); const op = diff(doc.view, next); doc.view = next; doc.typed++; doc.edit(op); };
  relay.join(sig);
  return doc;
}

test('5 peers, 200 concurrent edits with random delays, everyone converges', async () => {
  const relay = new Relay();
  const first = peer(relay, 'start'); await relay.settle();
  const others = [peer(relay), peer(relay), peer(relay), peer(relay)]; await relay.settle();
  const all = [first, ...others];
  for (const d of all) assert.ok(d.ready, 'every peer synced');
  for (let i = 0; i < 200; i++) { all[rnd(all.length)].type(String.fromCharCode(97 + rnd(26))); if (rnd(3) === 0) await relay.tick(); }
  await relay.settle();
  for (const d of all) { assert.equal(d.view, first.view, 'views agree'); assert.equal(d.state, d.view, 'state matches view'); }
  const typed = all.reduce((n, d) => n + d.typed, 0);
  assert.equal(first.view.length, 'start'.length + typed, 'nothing lost');
  assert.ok(typed > 150, 'most edits happened while synced');
});

test('the sequencer leaves mid-stream: the next oldest takes over, pending edits survive', async () => {
  const relay = new Relay();
  const a = peer(relay, 'x'); await relay.settle();
  const b = peer(relay), c = peer(relay); await relay.settle();
  b.type('1'); c.type('2'); b.type('3');          // in flight toward a
  relay.leave(1);                                   // a dies before sequencing them
  await relay.settle();
  b.type('4'); c.type('5');
  await relay.settle();
  assert.equal(b.view, c.view);
  assert.equal(b.view.length, 1 + 5, 'all five edits present after handover');
  assert.equal(b.state, b.view); assert.equal(c.state, c.view);
  assert.ok(b.isHost, 'b, the oldest remaining, sequences');
});

test('a dropped broadcast makes the client resync instead of freezing', async () => {
  const relay = new Relay();
  const a = peer(relay, 'abc'); await relay.settle();
  const b = peer(relay); await relay.settle();
  relay.dropNext = 1;            // a's next broadcast is lost
  a.type('Q'); await relay.settle();
  assert.notEqual(b.view, a.view, 'b missed the edit');
  a.type('R'); await relay.settle();   // the gap triggers a resync
  assert.equal(b.view, a.view, 'b caught up');
  assert.ok(b.ready);
  b.type('S'); await relay.settle();
  assert.equal(b.view, a.view);
});
