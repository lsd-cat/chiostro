// Test fixtures: a valid RGB PNG of any size (every reader accepts it), and a PDF page counter.
import {deflateSync, inflateSync} from 'node:zlib';
const table = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
export function png(w, h, rgb = [40, 120, 200]) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = []; for (let y = 0; y < h; y++) { rows.push(0); for (let x = 0; x < w; x++) rows.push(...rgb); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0))]);
}

/** Pages, the first page box, pictures and attachments of a PDF, looking inside every deflated stream (pdfTeX puts page objects in object streams). */
export function pdfInfo(bytes) {
  const raw = Buffer.from(bytes); let text = raw.toString('latin1');
  const re = /<<([^>]*?)>>\s*stream\r?\n/g;
  for (let m; (m = re.exec(text));) {
    if (!/FlateDecode/.test(m[1])) continue;   // object streams, embedded files, contents: anything deflated is read
    const len = +(/\/Length\s+(\d+)/.exec(m[1])?.[1] ?? 0), start = m.index + m[0].length;
    try { text += '\n' + inflateSync(raw.subarray(start, start + len)).toString('latin1'); } catch { /* not a plain flate stream */ }
  }
  const box = /MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(text);
  return {pages: (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length, width: box ? +box[1] : 0, height: box ? +box[2] : 0, images: (text.match(/\/Subtype\s*\/Image/g) ?? []).length, attachments: (text.match(/\/Subtype\s*\/FileAttachment/g) ?? []).length, text};
}

/** The removal protocol against a store door: a manifest with a delete-key hash and one chunk, wrong token 403, no token 403, a chunk alone 405, a slot without a key 404, the right token 204 and everything gone. */
export async function removalFlow(url, assert) {
  const {createHash} = await import('node:crypto');
  const token = 'ab'.repeat(32), keyHash = createHash('sha256').update(token).digest('hex'), mslot = 'c'.repeat(32);
  assert.equal((await fetch(url(mslot + '.0'), {method: 'PUT', body: 'chunk'})).status, 201);
  assert.equal((await fetch(url(mslot), {method: 'PUT', body: 'manifest', headers: {'X-Delete-Key': keyHash}})).status, 201);
  assert.equal((await fetch(url('d'.repeat(32)), {method: 'PUT', body: 'no key'})).status, 201);
  assert.equal((await fetch(url(mslot), {method: 'DELETE', headers: {'X-Delete-Key': 'ff'.repeat(32)}})).status, 403, 'a wrong token');
  assert.equal((await fetch(url(mslot), {method: 'DELETE'})).status, 403, 'no token');
  assert.equal((await fetch(url(mslot + '.0'), {method: 'DELETE', headers: {'X-Delete-Key': token}})).status, 405, 'chunks go with their manifest, never alone');
  assert.equal((await fetch(url('d'.repeat(32)), {method: 'DELETE', headers: {'X-Delete-Key': token}})).status, 404, 'a blob stored without a key can never be removed');
  assert.equal((await fetch(url(mslot), {method: 'DELETE', headers: {'X-Delete-Key': token}})).status, 204);
  assert.equal((await fetch(url(mslot))).status, 404); assert.equal((await fetch(url(mslot + '.0'))).status, 404);
  const index = await (await fetch(url('index'))).text();
  assert.doesNotMatch(index, /c{32}/, 'the index forgets it'); assert.match(index, /d{32}/, 'the others stay');
}
