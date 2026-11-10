// The QR encoder, read back by an independent decoder written here: format bits give level M and
// the mask, the unmasked zigzag yields codewords whose Reed-Solomon remainder is zero, and the
// byte-mode payload is the input. Sizes follow the version; links of every realistic length fit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {qr} from '../dist/ui/qr.js';

const ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24], BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];
const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
const raw = ver => { let n = (16 * ver + 128) * ver + 64; if (ver >= 2) { const a = Math.floor(ver / 7) + 2; n -= (25 * a - 10) * a - 55; if (ver >= 7) n -= 36; } return Math.floor(n / 8); };
const alignPos = ver => { if (ver === 1) return []; const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17, step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2, out = [6]; for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p); return out; };

function decode(m) {
  const size = m.length, ver = (size - 17) / 4;
  // which modules are function patterns (recomputed here, not taken from the encoder)
  const fn = Array.from({length: size}, () => Array(size).fill(false));
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true; };
  for (let i = 0; i < size; i++) { mark(6, i); mark(i, 6); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) mark(cx + dx, cy + dy);
  const pos = alignPos(ver);
  for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) { if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mark(pos[i] + dx, pos[j] + dy); }
  for (let i = 0; i <= 8; i++) { mark(8, i); mark(i, 8); }
  for (let i = 0; i < 8; i++) { mark(size - 1 - i, 8); mark(8, size - 1 - i); }
  if (ver >= 7) for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), b = Math.floor(i / 3); mark(a, b); mark(b, a); }
  // format bits: first copy, unmasked with 0x5412; the 5 data bits are level (2) + mask (3), checked against the BCH remainder
  let bits = 0;
  const at = (x, y) => m[y][x] ? 1 : 0;
  for (let i = 0; i <= 5; i++) bits |= at(8, i) << i;
  bits |= at(8, 7) << 6; bits |= at(8, 8) << 7; bits |= at(7, 8) << 8;
  for (let i = 9; i < 15; i++) bits |= at(14 - i, 8) << i;
  bits ^= 0x5412;
  const data = bits >>> 10; let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  assert.equal(bits & 0x3FF, rem, 'format BCH remainder');
  const level = data >>> 3, mask = data & 7;
  assert.equal(level, 0, 'level M');
  assert.equal(at(8, size - 8), 1, 'dark module');
  const unmask = (x, y) => [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, (x * y) % 2 + (x * y) % 3, ((x * y) % 2 + (x * y) % 3) % 2, ((x + y) % 2 + (x * y) % 3) % 2][mask] === 0;
  // read the zigzag back
  const out = []; let cur = 0, n = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (fn[y][x]) continue;
      const bit = m[y][x] !== unmask(x, y);
      cur = (cur << 1) | (bit ? 1 : 0); if (++n === 8) { out.push(cur); cur = 0; n = 0; }
    }
  }
  const total = raw(ver); assert.ok(out.length >= total, 'enough codewords');
  const cw = out.slice(0, total);
  // de-interleave into blocks and check every block's Reed-Solomon remainder is zero
  const ecc = ECC[ver - 1], blocks = BLOCKS[ver - 1], short = blocks - (total % blocks), shortLen = Math.floor(total / blocks);
  const blk = Array.from({length: blocks}, (_, b) => ({len: shortLen + (b < short ? 0 : 1), bytes: []}));
  let k = 0;   // the encoder's order: data rows (short blocks lack the last one), then ecc rows
  const dataLens = blk.map(b => b.len - ecc), maxData = Math.max(...dataLens);
  for (let i = 0; i < maxData; i++) blk.forEach((b, j) => { if (i < dataLens[j]) b.bytes.push(cw[k++]); });
  for (let i = 0; i < ecc; i++) blk.forEach(b => { b.bytes.push(cw[k++]); });
  assert.equal(k, total, 'all codewords consumed');
  const div = Array(ecc - 1).fill(0).concat([1]);
  for (let i = 0, root = 1; i < ecc; i++, root = mul(root, 2)) for (let j = 0; j < div.length; j++) { div[j] = mul(div[j], root); if (j + 1 < div.length) div[j] ^= div[j + 1]; }
  const payload = [];
  for (const b of blk) {
    const r = Array(ecc).fill(0);
    for (const byte of b.bytes) { const f = byte ^ r.shift(); r.push(0); div.forEach((c, j) => { r[j] ^= mul(c, f); }); }
    assert.ok(r.every(x => x === 0), 'Reed-Solomon remainder is zero (data + ecc consistent)');
    payload.push(...b.bytes.slice(0, b.len - ecc));
  }
  // byte mode: 0100, count, bytes
  const bitAt = i => (payload[i >>> 3] >>> (7 - (i & 7))) & 1;
  const read = (at, n) => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | bitAt(at + i); return v; };
  assert.equal(read(0, 4), 4, 'byte mode');
  const cbits = ver < 10 ? 8 : 16, count = read(4, cbits);
  const bytes = []; for (let i = 0; i < count; i++) bytes.push(read(4 + cbits + i * 8, 8));
  return {text: new TextDecoder().decode(Uint8Array.from(bytes)), ver, mask};
}

test('short and long links round-trip through an independent decoder', () => {
  for (const text of ['A', 'http://127.0.0.1:8080/pad/#vcwHtM8dn-WMzBSDj4KvZw', 'https://chiost.ro/form/?view#' + 'x'.repeat(22) + '.' + 'y'.repeat(43), 'é'.repeat(100), 'z'.repeat(400)]) {
    const m = qr(text);
    assert.equal(m.length % 4, 1); assert.equal(m.length, m[0].length);
    const got = decode(m);
    assert.equal(got.text, text, `text of length ${text.length} (version ${got.ver}, mask ${got.mask})`);
  }
});

test('finder patterns, timing and the quiet-zone-free size are right', () => {
  const m = qr('hello');
  assert.equal(m.length, 21, 'version 1');
  const finder = (cx, cy) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); assert.equal(m[cy + dy][cx + dx], d !== 2, `finder at ${cx},${cy}`); } };
  finder(3, 3); finder(17, 3); finder(3, 17);
  for (let i = 8; i < 13; i++) { assert.equal(m[6][i], i % 2 === 0, 'timing row'); assert.equal(m[i][6], i % 2 === 0, 'timing column'); }
  assert.throws(() => qr('x'.repeat(500)), /too long/);
});
