// Encrypts every encoded audio/video frame before it leaves the browser, decrypts on arrival.
// Keys arrive by postMessage: 'me' for our own sender key, "<peer id>" for each remote sender,
// each with a generation number (kid). Frame layout: clear codec header | kid | AES-GCM(body),
// with header+kid as additional data. The receiving depacketizer must read the VP8 payload
// header (10 bytes on keyframes, 3 on delta) and the Opus TOC byte, hence the clear header.
// Keyframe is read from the VP8 frame tag (bit 0 of byte 0 == 0) rather than frame.type,
// which Firefox does not report reliably on the sending side (same trick as Orange Meets).
// Frames without a usable key are dropped; the decoder recovers at the next keyframe.
import {importKey, seal, open, pruneRing, RING_MAX, type Bytes, type TransformOptions, type KeyMessage} from './core/crypto.js';

type Frame = RTCEncodedVideoFrame | RTCEncodedAudioFrame;

const keys = new Map<string, Map<number, CryptoKey>>();   // peer -> kid -> key, pruned as keys come into use (pruneRing)
const latest = new Map<string, number>();

onmessage = async ({data: {peer, kid, key}}: MessageEvent<KeyMessage>) => {
  const ring = keys.get(peer) ?? new Map<number, CryptoKey>();
  keys.set(peer, ring);
  ring.delete(kid); ring.set(kid, await importKey(key));   // newest last
  latest.set(peer, kid);
  if (peer === 'me') { for (const k of ring.keys()) if (k !== kid) ring.delete(k); }   // we only ever seal with the newest
  else while (ring.size > RING_MAX) ring.delete(ring.keys().next().value!);
};

const clearBytes = (frame: Frame, data: Bytes) =>
  frame instanceof RTCEncodedVideoFrame ? ((data[0]! & 1) === 0 ? 10 : 3) : 1;

onrtctransform = ({transformer}: RTCTransformEvent) => {
  const {readable, writable} = transformer;
  const {op, peer} = transformer.options as TransformOptions;
  // A receiver that cannot decrypt (key not arrived yet, or arrived after frames were dropped)
  // asks the sender for a keyframe, at most once a second, so video resumes instead of stalling.
  let lastReq = 0;
  const needKeyframe = () => {
    const now = Date.now();
    if (now - lastReq < 1000) return;
    lastReq = now;
    (transformer as unknown as {sendKeyFrameRequest?: () => Promise<void>}).sendKeyFrameRequest?.().catch(() => {});
  };
  readable.pipeThrough(new TransformStream<Frame, Frame>({
    async transform(frame, ctl) {
      try {
        const data = new Uint8Array(frame.data), n = clearBytes(frame, data);
        let out: Bytes;
        if (op === 'encrypt') {
          const kid = latest.get('me'), key = kid === undefined ? undefined : keys.get('me')?.get(kid);
          if (!key) return;
          const header = new Uint8Array(n + 1);
          header.set(data.subarray(0, n)); header[n] = kid!;
          const body = await seal(key, data.subarray(n), header);
          out = new Uint8Array(header.length + body.length); out.set(header); out.set(body, header.length);
        } else {
          const ring = keys.get(peer), key = ring?.get(data[n]!);
          if (!key) return needKeyframe();
          const header = data.subarray(0, n + 1), body = await open(key, data.subarray(n + 1), header);
          pruneRing(ring!, data[n]!);
          out = new Uint8Array(n + body.length); out.set(data.subarray(0, n)); out.set(body, n);
        }
        frame.data = out.buffer;
        ctl.enqueue(frame);
      } catch { if (op === 'decrypt') needKeyframe(); }
    },
  })).pipeTo(writable);
};
