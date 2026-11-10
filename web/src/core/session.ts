// The link secret and what derives from it. A meeting link carries the meeting secret M: every
// tool derives its own secret T = HKDF(M, "tool/<app>") from it, so the same link opens the
// matching call, plan, pad and files. A tool link carries only T (written "~T" in the fragment):
// it opens that tool and nothing else, and M cannot be computed from it. Rooms and keys hang off
// T under distinct labels; the server only ever sees room ids.
import {b64u, deriveAes, sha256hex, type Bytes} from './crypto.js';

export type Session = {
  meeting: string | null;                      // M as shared in links, when this page was opened with a meeting link
  tool: string;                                // this tool's secret T, as shared in tool links
  raw: Bytes;                                  // T's 16 bytes
  extra: string;                               // what followed a dot in the fragment: a capability only some links carry, '' otherwise
  toolKey(app: string): Promise<string | null>;   // a sibling tool's T, only from a meeting link
  roomId(label: string): Promise<string>;      // SHA-256("<label>:<T>"), hex: this tool's room on the server (the call has two labels, one per media path)
  key(label: string): Promise<CryptoKey>;      // AES-GCM key for one purpose, e.g. "pad/signaling"
  derive(label: string, n?: number): Promise<Bytes>;   // raw bytes for one purpose: a weaker secret to hand out (a view link)
};

export const newKey = () => b64u.enc(crypto.getRandomValues(new Uint8Array(16)));

const hkdf = async (ikm: Bytes, label: string, n = 16) => new Uint8Array(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(label)}, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));

/** Throws on a malformed fragment. */
export async function session(fragment: string, app: string): Promise<Session> {
  const [head = '', extra = ''] = fragment.split('.');
  const isTool = head.startsWith('~');
  const bytes = b64u.dec(isTool ? head.slice(1) : head);
  if (bytes.length !== 16) throw new Error('bad key');
  const raw = isTool ? bytes : await hkdf(bytes, `tool/${app}`);
  const tool = b64u.enc(raw);
  return {
    meeting: isTool ? null : head, tool, raw, extra,
    toolKey: async a => isTool ? (a === app ? tool : null) : b64u.enc(await hkdf(bytes, `tool/${a}`)),
    roomId: label => sha256hex(`${label}:${tool}`),
    key: label => deriveAes(raw, label),
    derive: (label, n = 16) => hkdf(raw, label, n),
  };
}
