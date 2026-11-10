// The relay-media replay guard: a frame must be newer than the last authenticated one from that
// sender and kind under the same key; a new key starts the clock over; senders and kinds are apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../dist/core/relaymedia.js';
import {pruneRing} from '../dist/core/crypto.js';

test('replays and old frames are refused, new keys and other streams are not', () => {
  const last = new Map();
  const seen = (from, kind, kid, ts) => { const ok = fresh(last, from, kind, kid, ts); if (ok) last.set(from + ':' + kind, {kid, ts}); return ok; };
  assert.ok(seen(7, 1, 0, 1000)); assert.ok(seen(7, 1, 0, 1033));
  assert.ok(!seen(7, 1, 0, 1033), 'the same frame again is a replay');
  assert.ok(!seen(7, 1, 0, 1000), 'an older frame is a replay');
  assert.ok(seen(7, 0, 0, 500), 'audio of the same sender has its own clock');
  assert.ok(seen(8, 1, 0, 10), 'another sender has its own clock');
  assert.ok(seen(7, 1, 1, 5), 'a new key (a restarted track) starts over');
  assert.ok(!seen(7, 1, 1, 5)); assert.ok(seen(7, 1, 1, 6));
});

test('a key ring is pruned by use, not by arrival: a sender that skipped a key keeps decrypting', () => {
  const ring = new Map([[1, 'k1'], [2, 'k2'], [3, 'k3'], [4, 'k4']]);   // keys 3 and 4 arrived within the sender's switch delay; it went from 2 straight to 4
  pruneRing(ring, 2); assert.deepEqual([...ring.keys()], [1, 2, 3, 4], 'frames still under 2: nothing newer is dropped, and 1 stays for a reordered frame');
  pruneRing(ring, 4); assert.deepEqual([...ring.keys()], [3, 4], 'first frame under 4: everything older than the previous key goes');
  pruneRing(ring, 4); assert.deepEqual([...ring.keys()], [3, 4]);
  pruneRing(ring, 9); assert.deepEqual([...ring.keys()], [3, 4], 'an unknown key changes nothing');
});
