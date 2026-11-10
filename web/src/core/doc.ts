// A shared document over the blind relay. Classic server OT, the server being a peer: the
// longest-present peer (lowest relay id) sequences every edit and broadcasts it with a version;
// clients keep one op in flight and transform incoming ops against what they have pending. Late
// joiners get the state from the sequencer through Sync; the sequencer writes sealed checkpoints
// to the store, so the document survives everyone leaving and keeps every version.
// The algebra is a parameter: text OT for the pad, or JSON ops for a board.
import {apply as applyText, transform as transformText, diff as diffText, type Op as TextOp} from './ot.js';
import {Store} from './store.js';
import type {Core} from './ext.js';

export type Algebra<S, O> = {
  apply(state: S, op: O): S;
  /** [a', b'] for concurrent a and b; a was sequenced first. */
  transform(a: O, b: O): [O, O];
  /** One op that turns `from` into `to`, for adopting a snapshot. */
  diff(from: S, to: S): O;
};
export const text: Algebra<string, TextOp> = {apply: applyText, transform: transformText, diff: diffText};

// Checkpoint slots are a zero-padded hex timestamp plus random bytes, so they sort by time and
// start with zeros; other blobs an app keeps in the same room (keys, heads) never do.
const isCheckpoint = (slot: string) => slot.startsWith('0000') && !slot.includes('.');
const HISTORY = 500;   // ops kept for transforming late client ops; a session's whole history would grow without bound

export class Doc<S, O> {
  version = 0;
  ready = false;                       // editable: synced with the sequencer, or alone
  onRemote?: (op: O, from?: number) => void;   // an op from someone else was applied to `state`; `from` is its author's peer id when known
  extra?: () => unknown;               // app state saved beside `state` in checkpoints and snapshots (authorship, for instance)
  sign?: (payload: string) => Promise<string>;                  // checkpoints carry a signature over JSON({state, x}) ...
  verify?: (payload: string, sig: string) => Promise<boolean>;  // ... and unsigned or badly signed ones are ignored
  onExtra?: (x: unknown) => void;      // ...and restored from them
  onStatus?: () => void;               // ready / peers / saved changed
  saved: 'idle' | 'saving' | 'saved' | 'failed' = 'idle';
  readonly peers = new Set<number>();
  private inflight: O | null = null;
  private buffer: O[] = [];
  private history: O[] = [];           // the last HISTORY ops, for transforming late client ops; an older one triggers a resync
  private early: {sender: number; v: number; op: O}[] = [];   // client ops that reached us before we learned we are the sequencer
  private resyncing = false;
  private lastSaved: S;
  private saveTimer = 0;

  private lastSaveAt = 0;
  /** Checkpoints: `saveAfterMs` after the last edit, but at most one per `saveEveryMs` while edits keep coming. */
  constructor(private core: Core, private store: Store, private alg: Algebra<S, O>, public state: S, private saveAfterMs = 3000, private saveEveryMs = 20000) {
    this.lastSaved = state;
    const {sig, roster, sync} = core;
    roster.onJoin = id => { this.peers.add(id); this.onStatus?.(); };
    roster.onLeave = id => {
      const wasHost = id === this.hostId;   // computed before the removal
      this.peers.delete(id);
      if (wasHost) this.isHost ? this.takeOver() : this.inflight && this.send(this.inflight);   // the old host's inbox is gone: resend
      this.onStatus?.();
    };
    sync.register('doc', {get: () => ({state: this.state, v: this.version, x: this.extra?.()}), set: v => this.adopt(v as {state: S; v: number; x?: unknown})});
    const ready = sig.onReady;   // Sync owns the hello; we only need to know when we are alone
    sig.onReady = peers => { ready?.(peers); if (!peers.length) this.becomeReady(); else setTimeout(() => { if (!this.ready && this.isHost) this.becomeReady(); }, 4000); };
    sig.on('op', (from, m) => this.onOp(from, m.v as number, m.op as O, m.from as number | undefined));
    sig.on('resync', (from, m) => { if (m.state) { if (from === this.hostId) this.adopt(m.state as {state: S; v: number; x?: unknown}); } else if (this.isHost) sig.send(from, {t: 'resync', state: {state: this.state, v: this.version, x: this.extra?.()}}); });
  }

  /** Take the sequencer's whole state: at join, or after a gap. Whatever we had pending is lost. */
  private adopt(s: {state: S; v: number; x?: unknown}) {
    if ((this.ready && !this.resyncing) || s.v === undefined) return;
    const op = this.alg.diff(this.state, s.state);   // the view shows the old state: move it to the live one as one op
    this.state = s.state; this.version = s.v; this.history = []; this.inflight = null; this.buffer = []; this.resyncing = false;
    this.onRemote?.(op);
    if (s.x !== undefined) this.onExtra?.(s.x);
    this.becomeReady();
  }

  get hostId() { return Math.min(this.core.sig.myId, ...this.peers); }
  get isHost() { return this.core.sig.myId === this.hostId; }

  /** The latest checkpoint, before connecting. False if there is none (a new document). */
  async load(): Promise<boolean> {
    const snaps = (await this.store.list()).filter(e => isCheckpoint(e.slot)).reverse();
    for (const e of snaps) {   // the newest checkpoint that verifies
      const snap = await this.read(e.slot);
      if (snap) { this.state = this.lastSaved = snap.state; if (snap.x !== undefined) this.onExtra?.(snap.x); return true; }
    }
    return false;
  }
  /** Every checkpoint that verifies, oldest first (a view-link holder can write checkpoint-shaped garbage). */
  async checkpoints() { const out = []; for (const e of (await this.store.list()).filter(e => isCheckpoint(e.slot))) if (await this.read(e.slot)) out.push(e); return out; }
  checkpoint(slot: string): Promise<S | null> { return this.read(slot).then(s => s?.state ?? null); }
  /** A checkpoint blob, if it is ours and (when verifying) signed by the editors' key. */
  private async read(slot: string): Promise<{state: S; x?: unknown} | null> {
    const c = (await this.store.get(slot)) as {state?: S; x?: unknown; sig?: string} | null;
    if (!c || c.state === undefined) return null;
    if (this.verify && !(typeof c.sig === 'string' && await this.verify(JSON.stringify({state: c.state, x: c.x}), c.sig))) return null;
    return {state: c.state, x: c.x};
  }

  /** A local edit, already applied to the editor's view. */
  edit(op: O) {
    if (!this.ready) return;
    this.state = this.alg.apply(this.state, op);
    if (this.isHost) this.sequence(op, this.core.sig.myId);
    else if (this.inflight) this.buffer.push(op);
    else this.send(op);
    this.scheduleSave();
  }

  private becomeReady() { this.ready = true; this.onStatus?.(); }
  private send(op: O) { this.inflight = op; this.core.sig.send(this.hostId, {t: 'op', v: this.version, op}); }
  private sequence(op: O, from: number) {
    this.history.push(op); this.version++; if (this.history.length > HISTORY) this.history.shift();
    this.core.sig.send('*', {t: 'op', v: this.version, op, from});
  }
  private takeOver() {   // our pending ops were never sequenced: they become the first ops of our reign
    for (const op of [this.inflight, ...this.buffer]) if (op) this.sequence(op, this.core.sig.myId);
    this.inflight = null; this.buffer = [];
    const early = this.early; this.early = [];
    for (const e of early) this.onOp(e.sender, e.v, e.op);   // peers that heard of the handover before we did
    this.scheduleSave();
  }

  private onOp(sender: number, v: number, op: O, from?: number) {
    if (from === undefined) {   // a client op addressed to the sequencer
      if (!this.isHost) { this.early.push({sender, v, op}); return; }   // the leave notice for the old host is still on its way to us
      const since = v - (this.version - this.history.length);
      if (since < 0) return console.warn('op older than history; dropped');
      let o = op;
      for (const h of this.history.slice(since)) o = this.alg.transform(h, o)[1];   // what was sequenced first wins ties
      this.state = this.alg.apply(this.state, o);
      this.sequence(o, sender);
      this.onRemote?.(o, sender);
      this.scheduleSave();
      return;
    }
    if (sender !== this.hostId) return;
    if (v !== this.version + 1) {   // a gap: something was dropped on the way; ask the sequencer for the whole state
      if (!this.resyncing) { this.resyncing = true; this.ready = false; this.onStatus?.(); this.core.sig.send(this.hostId, {t: 'resync'}); }
      return;
    }
    this.history.push(op); this.version = v; if (this.history.length > HISTORY) this.history.shift();
    if (from === this.core.sig.myId) {   // our own op came back sequenced: send the next one
      this.inflight = this.buffer.shift() ?? null;
      if (this.inflight) this.send(this.inflight);
      return;
    }
    let s = op;   // transform against what we have pending, then apply
    const pending = [this.inflight, ...this.buffer].filter((p): p is O => !!p);
    for (let i = 0; i < pending.length; i++) { const [s2, p2] = this.alg.transform(s, pending[i]!); s = s2; pending[i] = p2; }
    const next = this.alg.apply(this.state, s);   // apply before committing, so a bad op changes nothing
    this.inflight = pending[0] ?? null; this.buffer = pending.slice(1);
    this.state = next;
    this.onRemote?.(s, from);
  }

  // --- checkpoints: the sequencer writes one a few seconds after the last change ---
  private scheduleSave() {
    if (!this.isHost) return;
    clearTimeout(this.saveTimer);
    const wait = Math.max(this.saveAfterMs, this.lastSaveAt + this.saveEveryMs - Date.now());
    this.saveTimer = setTimeout(() => this.save(), wait) as unknown as number;
  }
  async save() {
    if (!this.isHost || this.state === this.lastSaved) return;
    clearTimeout(this.saveTimer);
    const state = this.state;
    this.saved = 'saving'; this.onStatus?.();
    const slot = Date.now().toString(16).padStart(16, '0') + [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');   // sorts by time
    const x = this.extra?.(), payload = JSON.stringify({state, x});
    const status = await this.store.put(slot, {state, x, ...(this.sign && {sig: await this.sign(payload)})});
    if (status < 300) { this.lastSaved = state; this.lastSaveAt = Date.now(); }
    this.saved = status < 300 ? 'saved' : 'failed'; this.onStatus?.();
  }
}
