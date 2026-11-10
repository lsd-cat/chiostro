import test from 'node:test';
import assert from 'node:assert/strict';
import {importKey, seal, open, b64u} from '../dist/core/crypto.js';

test('seal/open roundtrip and tamper detection', async () => {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await importKey(raw);
  const msg = new TextEncoder().encode('hello frame');
  const boxed = await seal(key, msg);
  assert.equal(boxed.length, msg.length + 12 + 16);
  assert.deepEqual(await open(key, boxed), msg);
  boxed[20] ^= 1;
  await assert.rejects(open(key, boxed));
  const aad = new Uint8Array([1, 2, 3]);
  const withAad = await seal(key, msg, aad);
  assert.deepEqual(await open(key, withAad, aad), msg);
  await assert.rejects(open(key, withAad, new Uint8Array([9, 2, 3])));
  assert.deepEqual(b64u.dec(b64u.enc(raw)), raw);
  assert.doesNotMatch(b64u.enc(raw), /[+/=]/);
});

import {deriveAes, ecdhKeypair, pairKey, u32, concat} from '../dist/core/crypto.js';

test('HKDF domain separation and ECDH pairwise agreement', async () => {
  const link = crypto.getRandomValues(new Uint8Array(16));
  const msg = new TextEncoder().encode('x');
  const sig1 = await deriveAes(link, 'e2ecall/signaling'), sig2 = await deriveAes(link, 'e2ecall/signaling');
  assert.deepEqual(await open(sig2, await seal(sig1, msg)), msg);                      // same ikm+info -> same key
  await assert.rejects(open(await deriveAes(link, 'other'), await seal(sig1, msg)));   // different info -> different key
  const a = await ecdhKeypair(), b = await ecdhKeypair();
  const ab = await pairKey(a.priv, b.pub, 'e2ecall/pair'), ba = await pairKey(b.priv, a.pub, 'e2ecall/pair');
  assert.deepEqual(await open(ba, await seal(ab, msg)), msg);                          // both sides agree
  const c = await ecdhKeypair();
  await assert.rejects(open(await pairKey(c.priv, a.pub, 'e2ecall/pair'), await seal(ab, msg)));   // third party cannot
  assert.deepEqual([...u32(258)], [0, 0, 1, 2]);
  assert.deepEqual([...concat(new Uint8Array([1]), new Uint8Array([2, 3]))], [1, 2, 3]);
});
