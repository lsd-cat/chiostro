// Capabilities: signatures a reader verifies but cannot make, sealing to a public key only the
// owner opens, a view secret derived from the edit secret, an extra capability after a dot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {signKeypair, sign, verify, boxKeypair, sealTo, openWith, b64u} from '../dist/core/crypto.js';
import {session} from '../dist/core/session.js';

test('signed checkpoints: verify passes, any change or other key fails', async () => {
  const k = await signKeypair(), other = await signKeypair();
  const sig = await sign(k.priv, '{"state":"hi"}');
  assert.ok(await verify(k.pub, sig, '{"state":"hi"}'));
  assert.ok(!(await verify(k.pub, sig, '{"state":"hi!"}')));
  assert.ok(!(await verify(other.pub, sig, '{"state":"hi"}')));
  assert.ok(!(await verify(k.pub, 'garbage', '{"state":"hi"}')));
});
test('answers sealed to the owner: the owner opens, a wrong key cannot', async () => {
  const owner = await boxKeypair(), other = await boxKeypair();
  const blob = await sealTo(owner.pub, new TextEncoder().encode('secret vote'));
  assert.equal(new TextDecoder().decode(await openWith(owner.d, owner.pub, blob)), 'secret vote');
  await assert.rejects(openWith(other.d, other.pub, blob));
  assert.notEqual(b64u.enc(blob), b64u.enc(await sealTo(owner.pub, new TextEncoder().encode('secret vote'))), 'fresh ephemeral key each time');
});
test('session: a meeting link derives a secret per tool; a tool link is that secret alone', async () => {
  const M = b64u.enc(crypto.getRandomValues(new Uint8Array(16)));
  const pad = await session(M, 'pad'), withExtra = await session(M + '.abc', 'pad'), call = await session(M, 'meet');
  assert.equal(pad.meeting, M); assert.equal(pad.extra, ''); assert.equal(withExtra.extra, 'abc'); assert.equal(withExtra.tool, pad.tool);
  assert.notEqual(pad.tool, M, 'the tool secret is not the meeting secret');
  assert.notEqual(pad.tool, call.tool, 'each tool has its own');
  assert.equal(await pad.toolKey('meet'), call.tool, 'a meeting link reaches every tool');
  const alone = await session('~' + pad.tool, 'pad');
  assert.equal(alone.meeting, null); assert.equal(alone.tool, pad.tool);
  assert.equal(await alone.roomId('pad'), await pad.roomId('pad'), 'same room either way');
  assert.equal(await alone.toolKey('meet'), null, 'a tool link reaches nothing else');
  const v = await pad.derive('pad/view');
  assert.equal(v.length, 16); assert.equal(b64u.enc(await alone.derive('pad/view')), b64u.enc(v), 'deterministic from the tool secret');
  await assert.rejects(session('short', 'pad'));
});
