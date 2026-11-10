// The room's write-once store, sealed. Every blob is a format byte (0x01) then AES-128-GCM: a
// 12-byte IV, the ciphertext, a 16-byte tag, with the slot name as authenticated data, so a blob
// cannot be moved to another slot or read with another room's key. The byte lets another format
// in later without migrating anything. Reads are plain cacheable GETs (a slot never changes); a
// put is announced to the room by the server, which the socket passes on.
import {seal, open, deriveAes, concat, enc, hex, type Bytes} from './crypto.js';
import type {Signaling, Entry} from './signaling.js';
export type {Entry};

export const randomSlot = () => hex(crypto.getRandomValues(new Uint8Array(16)));
/** Eight hex digits of the clock: a slot suffix that sorts in write order. */
export const stamp = () => Date.now().toString(16).padStart(8, '0').slice(-8);
export type StoreKeys = {gcm: CryptoKey};
/** The room's key from a secret and a label such as "share/store". */
export async function storeKeys(raw: Bytes, label: string): Promise<StoreKeys> {
  return {gcm: await deriveAes(raw, label)};
}

export class Store {
  onChange?: (e: Entry) => void;   // a put by anyone
  constructor(private sig: Signaling, private keys: StoreKeys, private base = '') {
    const prev = sig.onPut;   // several stores may share one socket (a room's store and its head): all of them hear every put
    sig.onPut = e => { prev?.(e); this.onChange?.(e); };
  }
  private url(slot: string) { return `${this.base}/blob/${this.sig.app}/${this.sig.roomId}/${slot}`; }

  async sealBlob(slot: string, bytes: Bytes): Promise<Bytes> { return concat(new Uint8Array([1]), await seal(this.keys.gcm, bytes, enc(slot))); }
  /** null if not ours, tampered, or in an unknown format. */
  async openBlob(slot: string, blob: Bytes): Promise<Bytes | null> {
    try { if (blob[0] === 1) return await open(this.keys.gcm, blob.subarray(1), enc(slot)); } catch { /* not ours */ }
    return null;
  }

  /** Sealed bytes. 201 created, 409 the slot exists, 413 room quota, 429 too fast. */
  async putChunk(slot: string, bytes: Bytes): Promise<number> {
    return (await fetch(this.url(slot), {method: 'PUT', body: await this.sealBlob(slot, bytes)})).status;
  }
  async getChunk(slot: string): Promise<Bytes | null> {
    const res = await fetch(this.url(slot));
    if (!res.ok) return null;
    return this.openBlob(slot, new Uint8Array(await res.arrayBuffer()));
  }
  /** JSON values, same sealing. */
  put(slot: string, data: unknown): Promise<number> { return this.putChunk(slot, enc(JSON.stringify(data))); }
  async get(slot: string): Promise<unknown | null> {
    const b = await this.getChunk(slot);
    if (!b) return null;
    try { return JSON.parse(new TextDecoder().decode(b)); } catch { return null; }
  }
  /** Every slot, oldest first, with the server's write time. */
  async list(): Promise<Entry[]> {
    const res = await fetch(this.url('index'));
    if (!res.ok) return [];
    return (await res.text()).split('\n').filter(Boolean).map(l => { const [at = '', slot = '', size = ''] = l.split(' '); return {slot, at: +at, size: +size}; });
  }
}
