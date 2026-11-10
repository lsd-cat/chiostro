// PDF sharing, logic only: who presents, which page, consent, chunked sealed transfer.
// Bytes go sealed in chunks over the relay, only to peers that accepted the prompt.
// Bus: emits 'pdf:page' {page} on open, turn and close; listens to 'fit' (show whole pages).
import type {Core} from '../ext.js';
import {b64u, type Bytes} from '../crypto.js';

const CHUNK = 64 * 1024;   // sealed + base64 ≈ 118 KB, under the relay's 256 KB message cap
const PDF_MAX_BYTES = 50e6;

export type PdfState = {id: string; name: string; blob: Blob; page: number; mine: boolean; owner: number};
export type PdfOffer = {from: number; id: string; name: string; size: number};

export class PdfShare {
  state: PdfState | null = null;
  fit = false;                                    // show whole pages (set once anyone draws)
  onChange?: () => void;                          // state, page or fit changed
  onOffer?: (o: PdfOffer) => void;                // someone wants to share: ask the user
  onProgress?: (name: string, pct: number) => void;
  private rx = new Map<string, {name: string; owner: number; parts: Bytes[]; bytes: number}>();   // id -> chunks while receiving

  constructor(private core: Core) {
    const {sig, bus} = core;
    bus.on('fit', () => { if (!this.fit) { this.fit = true; this.onChange?.(); } });
    core.sync.register('pdf', {
      get: () => { const s = this.state; return s && {id: s.id, name: s.name, size: s.blob.size, owner: core.sync.idOf(s.owner), page: s.page}; },
      set: v => { const o = v as {id: string; name: string; size: number; owner: number} | null; if (o && typeof o.owner === 'number') this.onOffer?.({from: o.owner, id: String(o.id), name: String(o.name).slice(0, 80), size: Number(o.size)}); },
    });
    sig.on('pdf-offer', (id, m) => this.onOffer?.({from: id, id: String(m.id), name: String(m.name).slice(0, 80), size: Number(m.size)}));
    sig.on('pdf-accept', (id, m) => { if (this.state?.mine && m.id === this.state.id) this.sendTo(id); });
    sig.on('pdf-chunk', (id, m) => this.chunk(id, String(m.id), Number(m.i), Number(m.n), String(m.data)));
    sig.on('pdf-page', (id, m) => { if (this.state && !this.state.mine && m.id === this.state.id && id === this.state.owner) this.gotoPage(Number(m.page)); });
    sig.on('pdf-close', (id, m) => { if (this.state && !this.state.mine && m.id === this.state.id && id === this.state.owner) this.close(); });
  }

  /** Present a file. Returns false when it is too large. */
  async share(file: File): Promise<boolean> {
    if (file.size > PDF_MAX_BYTES) return false;
    this.close();
    this.show({id: crypto.randomUUID(), name: file.name, blob: file, mine: true, owner: this.core.sig.myId});
    this.offer('*');
    return true;
  }

  accept(o: PdfOffer) {
    this.rx.set(o.id, {name: o.name, owner: o.from, parts: [], bytes: 0});
    this.onProgress?.(o.name, 0);
    this.core.sig.send(o.from, {t: 'pdf-accept', id: o.id});
  }

  gotoPage(page: number) {
    const s = this.state;
    if (!s) return;
    s.page = Math.max(1, page | 0);
    this.announce();
    if (s.mine) this.core.sig.send('*', {t: 'pdf-page', id: s.id, page: s.page});
  }

  close() {
    const s = this.state;
    if (!s) return;
    if (s.mine) this.core.sig.send('*', {t: 'pdf-close', id: s.id});
    this.state = null;
    this.announce();
  }

  private announce() { this.core.bus.emit('pdf:page', {page: this.state?.page ?? 0}); this.onChange?.(); }

  private offer(to: number | '*') {
    const s = this.state!;
    this.core.sig.send(to, {t: 'pdf-offer', id: s.id, name: s.name, size: s.blob.size});
  }

  private show(p: Omit<PdfState, 'page'>) {
    this.state = {...p, page: 1};
    this.announce();
  }

  // One chunk in flight at a time, paced by the socket backlog: bounded memory, chat stays responsive.
  private async sendTo(to: number) {
    const {sig} = this.core, s = this.state!, bytes = new Uint8Array(await s.blob.arrayBuffer()), n = Math.ceil(bytes.length / CHUNK);
    for (let i = 0; i < n && this.state === s; i++) {
      await sig.drained();
      await sig.send(to, {t: 'pdf-chunk', id: s.id, i, n, data: b64u.enc(bytes.subarray(i * CHUNK, (i + 1) * CHUNK))});
    }
    sig.send(to, {t: 'pdf-page', id: s.id, page: s.page});   // late acceptor lands on the current page
  }

  private chunk(from: number, id: string, i: number, n: number, data: string) {   // only the offerer's chunks, in bounds, within the size cap
    const rx = this.rx.get(id);
    if (!rx || rx.owner !== from || !Number.isInteger(i) || !Number.isInteger(n) || i < 0 || i >= n || n > Math.ceil(PDF_MAX_BYTES / CHUNK) || rx.parts[i]) return;
    rx.parts[i] = b64u.dec(data); rx.bytes += rx.parts[i]!.length;
    if (rx.bytes > PDF_MAX_BYTES) { this.rx.delete(id); return; }
    const got = rx.parts.filter(Boolean).length;
    this.onProgress?.(rx.name, Math.round(100 * got / n));
    if (got === n) { this.rx.delete(id); this.show({id, name: rx.name, blob: new Blob(rx.parts, {type: 'application/pdf'}), mine: false, owner: rx.owner}); }
  }
}
