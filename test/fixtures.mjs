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
