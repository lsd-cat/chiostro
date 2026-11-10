// QR code encoder: byte mode, error correction M, versions 1 to 15 (up to 415 bytes), best mask
// by the standard penalty. Returns the module grid; the caller draws it. No dependencies.
// Structure follows ISO/IEC 18004 (and nayuki's reference layout, x = column, y = row).
const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24];   // level M, versions 1..15
const NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10];

export function qr(text: string): boolean[][] {
  const data = new TextEncoder().encode(text);
  let ver = 1;
  while (dataCodewords(ver) * 8 < 4 + (ver < 10 ? 8 : 16) + data.length * 8) if (++ver > 15) throw new Error('too long for a QR code');
  const size = ver * 4 + 17;
  const bits: number[] = [];
  const push = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  push(4, 4); push(data.length, ver < 10 ? 8 : 16); for (const b of data) push(b, 8);
  const cap = dataCodewords(ver) * 8;
  push(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
  const bytes: number[] = []; for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const codewords = interleave(bytes, ver);

  const m: boolean[][] = Array.from({length: size}, () => Array(size).fill(false));
  const fn: boolean[][] = Array.from({length: size}, () => Array(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { m[y]![x] = dark; fn[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && y >= 0 && x < size && y < size) set(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const pos = alignPositions(ver);
  for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(pos[i]! + dx, pos[j]! + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  formatBits(m, fn, size, 0);   // reserve the format areas; rewritten with the chosen mask below
  if (ver >= 7) {
    let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const v = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) { const bit = ((v >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); }
  }
  // data: zigzag in two-column strips from the bottom right, skipping the timing column
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!fn[y]![x] && i < codewords.length * 8) { m[y]![x] = ((codewords[i >>> 3]! >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  // the mask with the lowest penalty
  let best = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(m, fn, size, mask); formatBits(m, fn, size, mask);
    const s = penalty(m, size);
    if (s < bestScore) { bestScore = s; best = mask; }
    applyMask(m, fn, size, mask);   // undo (xor)
  }
  applyMask(m, fn, size, best); formatBits(m, fn, size, best);
  return m;
}

function dataCodewords(ver: number) {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const a = Math.floor(ver / 7) + 2; n -= (25 * a - 10) * a - 55; if (ver >= 7) n -= 36; }
  return Math.floor(n / 8) - ECC_PER_BLOCK[ver - 1]! * NUM_BLOCKS[ver - 1]!;
}
function alignPositions(ver: number): number[] {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17, step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
  for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
}
const mul = (x: number, y: number) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
function interleave(data: number[], ver: number): number[] {
  const ecc = ECC_PER_BLOCK[ver - 1]!, blocks = NUM_BLOCKS[ver - 1]!, raw = dataCodewords(ver) + ecc * blocks;
  const short = blocks - (raw % blocks), shortLen = Math.floor(raw / blocks);
  const div: number[] = Array(ecc - 1).fill(0).concat([1]);
  for (let i = 0, root = 1; i < ecc; i++, root = mul(root, 2)) for (let j = 0; j < div.length; j++) { div[j] = mul(div[j]!, root); if (j + 1 < div.length) div[j]! ^= div[j + 1]!; }
  const out: number[][] = [];
  for (let b = 0, k = 0; b < blocks; b++) {
    const len = shortLen - ecc + (b < short ? 0 : 1), dat = data.slice(k, k + len); k += len;
    const rem: number[] = Array(ecc).fill(0);
    for (const byte of dat) { const f = byte ^ rem.shift()!; rem.push(0); div.forEach((c, j) => { rem[j]! ^= mul(c, f); }); }
    if (b < short) dat.push(0);
    out.push(dat.concat(rem));
  }
  const res: number[] = [];
  for (let i = 0; i < out[0]!.length; i++) out.forEach((blk, j) => { if (i !== shortLen - ecc || j >= short) res.push(blk[i]!); });
  return res;
}
function formatBits(m: boolean[][], fn: boolean[][], size: number, mask: number) {
  const data = (0 << 3) | mask;   // level M is 00
  let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const set = (x: number, y: number, dark: boolean) => { m[y]![x] = dark; fn[y]![x] = true; };
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);
}
function applyMask(m: boolean[][], fn: boolean[][], size: number, mask: number) {
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (fn[y]![x]) continue;
    const f = [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, (x * y) % 2 + (x * y) % 3, ((x * y) % 2 + (x * y) % 3) % 2, ((x + y) % 2 + (x * y) % 3) % 2][mask]!;
    if (f === 0) m[y]![x] = !m[y]![x];
  }
}
function penalty(m: boolean[][], size: number): number {
  let s = 0, dark = 0;
  const P = [true, false, true, true, true, false, true];   // finder-like 1011101, with 4 light modules on either side
  const line = (get: (i: number) => boolean) => {
    const v: boolean[] = []; for (let i = 0; i < size; i++) v.push(get(i));
    for (let i = 1, run = 1; i <= size; i++) { if (i < size && v[i] === v[i - 1]) run++; else { if (run >= 5) s += run - 2; run = 1; } }
    for (let i = 0; i + 7 <= size; i++) {
      if (!P.every((p, k) => v[i + k] === p)) continue;
      if ((i >= 4 && v.slice(i - 4, i).every(x => !x)) || (i + 11 <= size && v.slice(i + 7, i + 11).every(x => !x))) s += 40;
    }
  };
  for (let y = 0; y < size; y++) line(x => m[y]![x]!);
  for (let x = 0; x < size; x++) line(y => m[y]![x]!);
  for (let y = 0; y + 1 < size; y++) for (let x = 0; x + 1 < size; x++) { const c = m[y]![x]; if (c === m[y]![x + 1] && c === m[y + 1]![x] && c === m[y + 1]![x + 1]) s += 3; }
  for (const row of m) for (const v of row) if (v) dark++;
  s += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return s;
}

/** Draw the grid on a canvas with a quiet zone, dark on light (readable regardless of the page theme). */
export function drawQr(canvas: HTMLCanvasElement, text: string, scale = 4) {
  const m = qr(text), size = m.length, quiet = 4;
  canvas.width = canvas.height = (size + quiet * 2) * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y]![x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
}
