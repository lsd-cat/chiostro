// Who is in the room, their names, pairwise keys and sender keys. Shared by both media modes.
// Each participant encrypts with its own random sender key, delivered to every peer sealed under
// an ECDH pairwise key from the hello exchange, and rotated whenever anyone leaves.
import type {Signaling} from './signaling.js';
import {b64u, seal, open, pairKey, concat, type Bytes, type Ecdh} from './crypto.js';

export type Peer = {
  name: string;
  screens: Set<string>;   // remote stream ids announced as screen shares
  pair?: CryptoKey;       // ECDH-derived key shared with this peer only; carries sender keys
  fresh?: boolean;        // joined after us and has not had a key from us yet
};

export class Roster {
  readonly peers = new Map<number, Peer>();
  onJoin?: (id: number, initiator: boolean) => void;
  onLeave?: (id: number) => void;
  onName?: (id: number, name: string) => void;
  /** A sender key became known: ours ('me') or a peer's ("<id>"). */
  onKey?: (peer: string, kid: number, key: Bytes) => void;
  private kid = 0;   // generation of our sender key, one clear byte in every frame
  private senderKey!: Bytes;

  constructor(private sig: Signaling, private ecdh: Ecdh, private myName: string) {
    sig.onJoin = (id, initiator) => this.add(id, initiator);
    sig.onLeave = id => this.remove(id);
    sig.on('hello', async (id, m) => {
      const p = this.peer(id);
      p.name = String(m.name).slice(0, 40);
      this.onName?.(id, p.name);
      p.pair = await pairKey(ecdh.priv, b64u.dec(String(m.pub)), 'chiostro/pair');
      if (p.fresh) { p.fresh = false; this.rotateSenderKey(); }   // a newcomer gets a new key, never the one our earlier frames used
      else this.sendSenderKey(id);
    });
    sig.on('skey', async (id, m) => {
      const p = this.peer(id);
      if (!p.pair) return;
      const b = await open(p.pair, b64u.dec(String(m.box)));
      this.onKey?.(String(id), b[0]!, b.subarray(1));
    });
    sig.on('screen', (id, m) => { this.peer(id).screens.add(String(m.sid)); });
    sig.on('unscreen', (id, m) => { this.peer(id).screens.delete(String(m.sid)); });
  }

  start() { this.rotateSenderKey(); }   // after onKey is wired
  nameOf(id: number) { return this.peers.get(id)?.name ?? 'Guest'; }
  peer(id: number): Peer { return this.peers.get(id) ?? this.add(id, false); }

  private add(id: number, initiator: boolean): Peer {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const peer: Peer = {name: 'Guest', screens: new Set(), fresh: !initiator};   // fresh: they joined after us
    this.peers.set(id, peer);
    this.sig.send(id, {t: 'hello', name: this.myName, pub: b64u.enc(this.ecdh.pub)});
    this.onJoin?.(id, initiator);
    return peer;
  }

  private remove(id: number) {
    if (!this.peers.delete(id)) return;
    this.onLeave?.(id);
    this.rotateSenderKey();   // the leaver knew our key; from now on they cannot read our media
  }

  private rotateSenderKey() {
    if (!this.onKey) return;   // no media on this room (pad, files): names and pairwise keys only
    this.kid = (this.kid + 1) % 256;
    const kid = this.kid, key = this.senderKey = crypto.getRandomValues(new Uint8Array(16));
    for (const id of this.peers.keys()) this.sendSenderKey(id);
    // Distribute first, switch our encoder a moment later: over a real network the first frames
    // under the new key would otherwise beat the key itself to the receivers.
    const activate = () => { if (this.kid === kid) this.onKey?.('me', kid, key); };
    this.peers.size ? setTimeout(activate, 800) : activate();
  }

  private async sendSenderKey(id: number) {
    const pair = this.peers.get(id)?.pair;
    if (!pair || !this.senderKey) return;   // sent as soon as the peer's hello gives us a pairwise key; never without media
    this.sig.send(id, {t: 'skey', box: b64u.enc(await seal(pair, concat(new Uint8Array([this.kid]), this.senderKey)))});
  }
}
