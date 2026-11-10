// Room state for late joiners, from a member rather than the server: the newcomer asks the
// longest-present peer for a snapshot; every feature registers what it contributes. 'me' entries
// are written as the sender's peer id, which is the same id everyone else uses for them.
import type {Core} from './ext.js';

export type Provider = {get: () => unknown; set: (v: unknown) => void};
/** 'me' anywhere in a peer's snapshot means that peer, never the reader: rewrite it to their id before any feature sees it. */
const own = (v: unknown, id: number): unknown => v === 'me' ? id : Array.isArray(v) ? v.map(x => own(x, id)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k === 'me' ? String(id) : k, own(x, id)])) : v;

export class Sync {
  private providers = new Map<string, Provider>();
  private asked: number[] = [];
  private askedAny = new Set<number>();
  private done = false;
  private timer = 0;

  constructor(private core: Core) {
    const {sig} = core;
    sig.onReady = peers => { if (peers.length) { this.asked = [...peers].sort((a, b) => a - b); this.ask(); } else this.done = true; };
    sig.on('sync-req', id => sig.send(id, {t: 'sync', state: this.snapshot()}));
    // Every answer from a peer we asked is merged; a late answer still counts, and an empty value
    // (a peer who dismissed the poll) never erases what another peer provided.
    sig.on('sync', (id, m) => {
      if (!this.askedAny.has(id)) return;
      this.done = true; clearTimeout(this.timer);
      this.adopt(own(m.state, id));
    });
  }

  /** Feed a snapshot to every provider that has a value in it. */
  adopt(snapshot: unknown) {
    const state = (snapshot ?? {}) as Record<string, unknown>;
    for (const [name, p] of this.providers) if (state[name] != null) { try { p.set(state[name]); } catch (e) { console.warn('sync', name, e); } }
  }

  register(name: string, p: Provider) { this.providers.set(name, p); }

  /** Replace 'me' by our id in a value's keys or fields, so the receiver sees the right peer. */
  idOf(x: number | 'me'): number { return x === 'me' ? this.core.sig.myId : x; }

  private snapshot() { const s: Record<string, unknown> = {}; for (const [n, p] of this.providers) s[n] = p.get(); return s; }

  private ask() {   // the oldest peer first; if no answer in 3 s, the next one
    const target = this.asked.shift();
    if (target === undefined || this.done) return;
    this.askedAny.add(target);
    this.core.sig.send(target, {t: 'sync-req'});
    this.timer = setTimeout(() => this.ask(), 3000) as unknown as number;
  }
}
