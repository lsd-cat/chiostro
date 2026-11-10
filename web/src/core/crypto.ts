// AES-128-GCM with a random 96-bit IV prepended to the ciphertext.
// Same shape as the SFrame AES_128_GCM suite (RFC 9605), minus its key-id/counter header.
export type Bytes = Uint8Array<ArrayBuffer>;

export const importKey = (raw: Bytes) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

export async function seal(key: CryptoKey, data: Bytes, aad?: Bytes): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, ...(aad && {additionalData: aad})}, key, data));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}

export async function open(key: CryptoKey, data: Bytes, aad?: Bytes): Promise<Bytes> {
  return new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: data.subarray(0, 12), ...(aad && {additionalData: aad})}, key, data.subarray(12)));
}

export const b64u = {
  enc(bytes: Bytes): string {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));  // spread has an arg limit
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: (s: string): Bytes => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
};

// --- key agreement and derivation ---
export const enc = (s: string) => new TextEncoder().encode(s);
export const hex = (b: Bytes) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
/** SHA-256 of a string, hex: room ids and slot prefixes. */
export const sha256hex = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc(s))));

/** AES-GCM key derived from `ikm` for one named purpose (HKDF-SHA256, empty salt). */
export const deriveAes = (ikm: Bytes, info: string) => deriveKey(ikm, info, {name: 'AES-GCM', length: 128}, ['encrypt', 'decrypt']);
/** Any key HKDF-SHA256 can make from `ikm` for one purpose. */
export async function deriveKey(ikm: Bytes, info: string, alg: AesKeyGenParams | HmacKeyGenParams, usages: KeyUsage[]): Promise<CryptoKey> {
  const hkdf = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc(info)}, hkdf, alg, false, usages);
}

export type Ecdh = {priv: CryptoKey; pub: Bytes};
export async function ecdhKeypair(): Promise<Ecdh> {
  const kp = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, false, ['deriveBits']);
  return {priv: kp.privateKey, pub: new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))};
}

/** Pairwise AES-GCM key from our private key and the peer's raw public key. */
export async function pairKey(priv: CryptoKey, peerPub: Bytes, info: string): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey('raw', peerPub, {name: 'ECDH', namedCurve: 'P-256'}, false, []);
  return deriveAes(new Uint8Array(await crypto.subtle.deriveBits({name: 'ECDH', public: pub}, priv, 256)), info);
}

// --- signatures (ECDSA P-256): checkpoints a reader can trust without being able to write them ---
export type SignKeys = {priv: JsonWebKey; pub: JsonWebKey};
export async function signKeypair(): Promise<SignKeys> {
  const kp = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
  return {priv: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: await crypto.subtle.exportKey('jwk', kp.publicKey)};
}
export async function sign(priv: JsonWebKey, data: string): Promise<string> {
  const k = await crypto.subtle.importKey('jwk', priv, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']);
  return b64u.enc(new Uint8Array(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, k, enc(data))));
}
export async function verify(pub: JsonWebKey, sig: string, data: string): Promise<boolean> {
  try {
    const k = await crypto.subtle.importKey('jwk', pub, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
    return await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, k, b64u.dec(sig), enc(data));
  } catch { return false; }
}

// --- sealing to a public key (ECIES: ephemeral ECDH + HKDF + AES-GCM): answers only the form's owner can read ---
export type BoxKeys = {d: string; pub: Bytes};   // d: the private scalar (base64url, lives in the owner's link); pub: raw public key, in the form
export async function boxKeypair(): Promise<BoxKeys> {
  const kp = await crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']);
  return {d: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d!, pub: new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))};
}
export async function sealTo(pub: Bytes, data: Bytes): Promise<Bytes> {
  const eph = await ecdhKeypair();
  return concat(eph.pub, await seal(await pairKey(eph.priv, pub, 'box'), data));
}
export async function openWith(d: string, pub: Bytes, blob: Bytes): Promise<Bytes> {
  const jwk = {kty: 'EC', crv: 'P-256', d, x: b64u.enc(pub.subarray(1, 33)), y: b64u.enc(pub.subarray(33, 65))};
  const priv = await crypto.subtle.importKey('jwk', jwk, {name: 'ECDH', namedCurve: 'P-256'}, false, ['deriveBits']);
  return open(await pairKey(priv, blob.subarray(0, 65), 'box'), blob.subarray(65));
}

export const u32 = (n: number): Bytes => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b; };
export const concat = (...parts: Bytes[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

// --- page <-> worker protocol ---
export type TransformOptions = {op: 'encrypt' | 'decrypt'; peer: string};   // RTCRtpScriptTransform options
export type KeyMessage = {peer: string; kid: number; key: Bytes};          // postMessage to the worker
