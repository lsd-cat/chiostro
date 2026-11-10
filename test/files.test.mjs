// Chunked encrypted files against the real server: a 9 MB upload lands as three sealed chunks
// plus a manifest, downloads byte-exact, a second upload of the same id skips stored chunks,
// and a stranger without the key reads nothing. Needs the server on :8080.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Store, storeKeys} from '../dist/core/store.js';
import {Files, CHUNK} from '../dist/core/files.js';


const BASE = (process.env.E2E_URL ?? 'http://127.0.0.1:8080/').replace(/\/$/, '');
const roomId = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
const sig = {app: 'share', roomId, onPut: undefined};   // no socket in this test
const key = await storeKeys(crypto.getRandomValues(new Uint8Array(16)), 'share/store');

test('upload, list, download, resume', async () => {
  const store = new Store(sig, key, BASE), files = new Files(store);
  const bytes = new Uint8Array(9 * 1024 * 1024); for (let i = 0; i < bytes.length; i += 4096) bytes[i] = i / 4096 & 255;
  const file = Object.assign(new Blob([bytes], {type: 'application/octet-stream'}), {name: 'big.bin'});
  const progress = [];
  const id = await files.upload(file, 'tester', (d, t) => progress.push(d / t));
  assert.equal(progress.at(-1), 1);
  const index = await store.list();
  assert.deepEqual(index.map(e => e.slot).sort(), [id, `${id}.0`, `${id}.1`, `${id}.2`].sort(), 'three chunks and a manifest');
  assert.ok(index.every(e => e.at > 1.7e12), 'server times');
  const [m] = await files.list();
  assert.equal(m.name, 'big.bin'); assert.equal(m.size, bytes.length); assert.equal(m.chunks, 3); assert.equal(m.by, 'tester');
  const got = await files.download(id);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), bytes, 'byte exact');
  // resume: the same id again sends nothing new (409s are skipped) and still ends with a manifest refusal, so pre-seed a fresh id
  const id2 = 'f'.repeat(32);
  await store.putChunk(`${id2}.0`, bytes.subarray(0, CHUNK));   // "a previous attempt stored chunk 0"
  const before = (await store.list()).length;
  await files.upload(file, 'tester', undefined, id2);
  assert.equal((await store.list()).length, before + 3, 'chunk 0 was skipped: only chunks 1, 2 and the manifest were written');
  // a stranger with another key sees ciphertext only
  const stranger = new Files(new Store(sig, await storeKeys(crypto.getRandomValues(new Uint8Array(16)), 'share/store'), BASE));
  assert.deepEqual(await stranger.list(), []);
  assert.equal(await stranger.download(id), null);
});
