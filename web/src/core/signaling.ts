// One WebSocket to the blind relay of one room. Every payload is sealed with the signaling key,
// so the server only routes opaque blobs. Wire format (text frames):
//   server -> client: "H <my id> <id,id,...>" | "J <id>" | "L <id>" | "M <from> <blob>"
//   client -> server: "<to id or *> <blob>"
// blob = base64url( counter(4) | AES-GCM(json, aad = counter | sender id) ). The per-sender counter
// must increase, so the relay cannot replay a message; the sender's own id (the one the relay gave
// it) is in the authenticated data, so the relay cannot hand A's message out as B's either.
// Binary frames carry media for RelayMedia: client -> server "to(4, 0 = all) | payload",
// server -> client "from(4) | payload". Payloads are sealed by the sender, see relaymedia.ts.
// "S <slot> <time> <size>" announces a put into the room's store (store.ts), by anyone.
import {seal, open, b64u, u32, concat, type Bytes} from './crypto.js';

export type Msg = {t: string} & Record<string, unknown>;
export type Handler = (from: number, m: Msg) => void | Promise<void>;
export type Entry = {slot: string; at: number; size: number};   // at: the server's clock, the only one a client can trust

export class Signaling {
  myId = 0;
  onJoin?: (id: number, initiator: boolean) => void;
  onReady?: (peersAlreadyHere: number[]) => void;   // after the hello from the relay
  onLeave?: (id: number) => void;
  onClose?: () => void;
  onRaw?: (from: number, payload: Bytes) => void;
  onPut?: (e: Entry) => void;                        // someone stored a blob in this room
  private ws!: WebSocket;
  private opened!: () => void;
  private open = new Promise<void>(r => { this.opened = r; });   // everything sent waits for connect()
  private sendQ: Promise<unknown>;   // queues keep seal/open from reordering messages
  private helloed!: () => void;
  private hello = new Promise<void>(r => { this.helloed = r; });   // our id is known after the relay's hello; it goes into every seal
  private recvQ: Promise<unknown> = Promise.resolve();
  private handlers = new Map<string, Handler[]>();
  private ctr = 0;
  private lastSeen = new Map<number, number>();   // sender id -> highest counter accepted

  /** `server`: ws(s) origin of the relay, e.g. "wss://meet.example.org"; `app`: the room's namespace there. */
  /** `key` null: listen only (store notices, joins); nothing can be sent or read. */
  constructor(private key: CryptoKey | null, readonly app: string, readonly roomId: string, private server: string) { this.sendQ = this.open; }

  connect() {
    this.ws = new WebSocket(`${this.server}/ws/${this.app}/${this.roomId}`);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => this.opened();
    this.ws.onmessage = ({data}) => {
      if (data instanceof ArrayBuffer) { const b = new Uint8Array(data); this.onRaw?.(new DataView(data).getUint32(0), b.subarray(4)); return; }
      this.recvQ = this.recvQ.then(() => this.onServer(String(data))).catch(e => console.warn('message dropped:', (e as Error).message));   // garbage from a peer is expected, not an error
    };
    this.ws.onclose = () => this.onClose?.();
  }

  on(type: string, h: Handler) {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), h]);
  }

  /** Queued, ordered. The returned promise resolves once this message is handed to the socket. */
  send(to: number | '*', m: Msg): Promise<void> {
    if (!this.key) return Promise.resolve();
    const ctr = u32(++this.ctr);
    this.sendQ = this.sendQ
      .then(() => this.hello)
      .then(async () => this.ws.send(`${to} ${b64u.enc(concat(ctr, await seal(this.key!, new TextEncoder().encode(JSON.stringify(m)), concat(ctr, u32(this.myId)))))}`))
      .catch(console.error);
    return this.sendQ as Promise<void>;
  }

  /** Unsealed, unordered relative to send(): media frames. */
  sendRaw(to: number | '*', payload: Bytes) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(concat(u32(to === '*' ? 0 : to), payload));
  }

  get buffered() { return this.ws?.bufferedAmount ?? 0; }


  /** Resolves when the socket's unsent backlog is below `bytes`. Lets bulk senders pace themselves. */
  async drained(bytes = 1 << 20) {
    while (this.ws.bufferedAmount > bytes) await new Promise(r => setTimeout(r, 50));
  }

  close() { this.ws.close(); }

  private async onServer(data: string) {
    const type = data[0], [idStr = '', rest = ''] = data.slice(2).split(' '), id = +idStr;
    if (type === 'S') { const [slot = '', at = '', size = ''] = data.slice(2).split(' '); this.onPut?.({slot, at: +at, size: +size}); return; }
    if (type === 'H') { this.myId = id; this.helloed(); const peers = rest.split(',').filter(Boolean).map(Number); for (const p of peers) this.onJoin?.(p, true); this.onReady?.(peers); }
    else if (type === 'J') this.onJoin?.(id, false);
    else if (type === 'L') this.onLeave?.(id);
    else if (type === 'M') {
      if (!this.key) return;
      const blob = b64u.dec(rest), ctr = new DataView(blob.buffer).getUint32(0);
      if (ctr <= (this.lastSeen.get(id) ?? 0)) return console.warn(`replayed message from ${id} dropped`);
      const m = JSON.parse(new TextDecoder().decode(await open(this.key!, blob.subarray(4), concat(blob.subarray(0, 4), u32(id))))) as Msg;   // the relay's `from` must be the id the sender sealed with
      this.lastSeen.set(id, ctr);   // only after the tag verified: a forged counter cannot block real ones
      for (const h of this.handlers.get(m.t) ?? []) await h(id, m);
    }
  }
}
