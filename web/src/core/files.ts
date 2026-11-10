// Encrypted files in a room: the bytes go as sealed chunks through the store's bulk door, a
// sealed manifest names them. Uploads resume: chunks already in the index are skipped. A file
// is referenced from any app as "<id>" (the manifest slot); the pad uses it for inline images.
import {Store, randomSlot} from './store.js';
import type {Bytes} from './crypto.js';

export const CHUNK = 4 * 1024 * 1024;   // raw bytes per chunk; sealed it stays under the server's 8 MB per request
export type Manifest = {name: string; size: number; type: string; chunks: number; by?: string};
export type FileEntry = Manifest & {id: string; at: number};

const isManifest = (x: unknown): x is Manifest => { const m = x as Manifest; return !!m && typeof m === 'object' && typeof m.name === 'string' && m.name.length <= 255 && Number.isInteger(m.size) && m.size >= 0 && typeof m.type === 'string' && m.type.length <= 100 && Number.isInteger(m.chunks) && m.chunks === Math.ceil(m.size / CHUNK); };

export class Files {
  onChange?: () => void;   // a new file is complete somewhere in the room
  sign?: (payload: string) => Promise<string>;                  // manifests carry a signature over their JSON ...
  verify?: (payload: string, sig: string) => Promise<boolean>;  // ... and unsigned or badly signed ones are not files
  private manifests = new Map<string, Manifest | null>();   // by slot: a manifest never changes, so it is read once
  constructor(private store: Store) {
    const prev = store.onChange;
    store.onChange = e => { prev?.(e); if (!e.slot.includes('.')) this.onChange?.(); };   // manifests have no chunk suffix
  }

  /** Complete files, oldest first. */
  async list(): Promise<FileEntry[]> {
    const entries = (await this.store.list()).filter(e => !e.slot.includes('.'));
    const out: FileEntry[] = [];
    for (const e of entries) { const m = await this.readManifest(e.slot); if (m) out.push({...m, id: e.slot, at: e.at}); }
    return out;
  }
  private async readManifest(slot: string): Promise<Manifest | null> {
    if (this.manifests.has(slot)) return this.manifests.get(slot)!;
    const m = (await this.store.get(slot)) as (Manifest & {sig?: string}) | null;
    let out: Manifest | null = null;
    if (isManifest(m)) { const {sig, ...rest} = m; if (!this.verify || (typeof sig === 'string' && await this.verify(JSON.stringify(rest), sig))) out = rest; }
    if (m !== null) this.manifests.set(slot, out);   // a missing blob may still arrive; a present one is final
    return out;
  }

  /** Upload; resolves to the file id. Chunks the index already holds are not sent again. */
  async upload(file: Blob & {name?: string}, by?: string, onProgress?: (done: number, total: number) => void, id = randomSlot()): Promise<string> {
    const chunks = Math.ceil(file.size / CHUNK);
    const have = new Set((await this.store.list()).map(e => e.slot));
    for (let i = 0; i < chunks; i++) {
      const slot = `${id}.${i}`;
      if (!have.has(slot)) {
        const status = await this.store.putChunk(slot, new Uint8Array(await file.slice(i * CHUNK, (i + 1) * CHUNK).arrayBuffer()));
        if (status === 429) { await new Promise(r => setTimeout(r, 3000)); i--; continue; }   // rate limited: wait and retry this chunk
        if (status !== 201 && status !== 409) throw new Error(`upload ${status}`);
      }
      onProgress?.(Math.min(file.size, (i + 1) * CHUNK), file.size);
    }
    const m: Manifest = {name: file.name ?? 'file', size: file.size, type: file.type, chunks, ...(by && {by})};
    const status = await this.store.put(id, this.sign ? {...m, sig: await this.sign(JSON.stringify(m))} : m);
    if (status !== 201) throw new Error(`manifest ${status}`);
    return id;
  }

  /** Download and decrypt into one Blob; null if the manifest or a chunk is missing or not ours. */
  async download(id: string, onProgress?: (done: number, total: number) => void): Promise<(Blob & {name: string}) | null> {
    const m = await this.readManifest(id);
    if (!m) return null;
    const parts: Bytes[] = [];
    for (let i = 0; i < m.chunks; i++) {
      const c = await this.store.getChunk(`${id}.${i}`);
      if (!c) return null;
      parts.push(c);
      onProgress?.(Math.min(m.size, (i + 1) * CHUNK), m.size);
    }
    return Object.assign(new Blob(parts as BlobPart[], {type: m.type}), {name: m.name});
  }

}
