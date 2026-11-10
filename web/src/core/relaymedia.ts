// Media through the blind relay: WebCodecs encode -> seal with our sender key -> binary frames
// over the signaling socket -> relay fan-out -> peers decrypt and decode. Each participant uploads
// once; the server never touches plaintext or parses media. Binary payload layout:
//   kind(1: 0 audio, 1 camera, 2 screen) | flags(1: bit0 keyframe) | kid(1) | timestamp ms (4) | AES-GCM(chunk, aad = header)
// shortcut: transport is TCP (WebSocket), so packet loss stalls instead of degrading; move to WebTransport when the server speaks HTTP/3.
import type {Signaling} from './signaling.js';
import type {Roster} from './roster.js';
import type {Media} from './media.js';
import {importKey, seal, open, type Bytes} from './crypto.js';
import type {FrameSource} from './media.js';

const AUDIO = 0, CAMERA = 1, SCREEN = 2;
/** Replay guard: a frame is fresh if nothing newer from that sender and kind was seen under the same key; a new key starts over (a restarted track restarts its clock). */
export const fresh = (last: Map<string, {kid: number; ts: number}>, from: number, kind: number, kid: number, ts: number) => { const p = last.get(from + ':' + kind); return !(p && p.kid === kid && ts <= p.ts); };
const BACKLOG_DROP = 256 * 1024;   // skip video frames while this much is unsent: crude congestion control

type Video = {dec: VideoDecoder; sink?: (frame: VideoFrame) => void; gotKey: boolean};
type Decoder = {video: Map<number, Video>; audio?: AudioDecoder; speaker?: AudioWorkletNode; lastReq: number};   // per peer, video per kind

export class RelayMedia implements Media {
  onTrack?: Media['onTrack'];
  onTrackEnd?: Media['onTrackEnd'];
  private keys = new Map<string, Map<number, CryptoKey>>();   // peer -> kid -> key
  private myKid = 0;
  private decoders = new Map<number, Decoder>();
  private encoders = new Map<MediaStreamTrack, () => void>();   // track -> stop
  private forceKey = new Set<number>();                          // kinds needing a keyframe
  private last = new Map<string, {kid: number; ts: number}>();   // sender:kind -> newest authenticated frame, against replays by the relay
  private ac: AudioContext;
  private ready: Promise<void>;
  private mix: MediaStreamAudioDestinationNode;

  /** `grab(track)` must return a function producing a VideoFrame of the track's current image (or null), plus a stop. The UI
   *  supplies it (it needs a <video> element in browsers without MediaStreamTrackProcessor). */
  constructor(private sig: Signaling, roster: Roster, localStreams: () => MediaStream[],
              private grab: (track: MediaStreamTrack) => {frame: () => VideoFrame | null; stop: () => void}) {
    this.ac = new AudioContext({sampleRate: 48000});
    this.mix = this.ac.createMediaStreamDestination();
    this.ready = this.ac.audioWorklet.addModule('/audio-worklet.js');
    roster.onKey = async (peer, kid, key) => {
      const ring = this.keys.get(peer) ?? new Map<number, CryptoKey>();
      this.keys.set(peer, ring);
      ring.set(kid, await importKey(key));
      for (const k of ring.keys()) if (k !== kid && k !== (kid + 255) % 256) ring.delete(k);
      if (peer === 'me') this.myKid = kid;
    };
    roster.onJoin = () => { this.forceKey.add(CAMERA).add(SCREEN); };   // newcomers need a keyframe to start
    roster.onLeave = id => this.dropPeer(id);
    sig.on('kf', () => { this.forceKey.add(CAMERA).add(SCREEN); });
    sig.on('unscreen', id => { this.closeVideo(id, SCREEN); this.onTrackEnd?.(id, 'screen'); });
    sig.onRaw = (from, payload) => this.receive(from, payload);
    roster.start();
    for (const s of localStreams()) for (const t of s.getTracks()) this.addTrack(t, s);
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    if (this.encoders.has(track)) return;
    const kind = track.kind === 'audio' ? AUDIO : track.contentHint === 'text' ? SCREEN : CAMERA;
    this.encoders.set(track, kind === AUDIO ? this.encodeAudio(stream) : this.encodeVideo(track, stream, kind));
  }

  removeTrack(track: MediaStreamTrack) { this.encoders.get(track)?.(); this.encoders.delete(track); }

  remoteAudio() { return this.mix.stream; }

  // --- sending ---
  private sendQ: Promise<unknown> = Promise.resolve();
  private send(kind: number, keyframe: boolean, timestamp: number, data: Bytes) {
    this.sendQ = this.sendQ.then(async () => {
      const key = this.keys.get('me')?.get(this.myKid);
      if (!key) return;
      const header = new Uint8Array(7);
      header[0] = kind; header[1] = keyframe ? 1 : 0; header[2] = this.myKid;
      new DataView(header.buffer).setUint32(3, timestamp >>> 0);
      const body = await seal(key, data, header);
      const out = new Uint8Array(header.length + body.length);
      out.set(header); out.set(body, header.length);
      this.sig.sendRaw('*', out);
    }).catch(console.error);
  }

  private encodeVideo(track: MediaStreamTrack, _stream: MediaStream, kind: number) {
    const grabber = this.grab(track);
    const enc = new VideoEncoder({
      output: chunk => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); this.send(kind, chunk.type === 'key', chunk.timestamp / 1000, d); },
      error: e => console.error('encoder', e),
    });
    const screen = kind === SCREEN;
    const maxRate = screen ? 1_500_000 : 600_000;
    let bitrate = maxRate, width = 0, height = 0, calm = 0;
    const configure = () => {
      ({width = 640, height = 360} = track.getSettings());
      enc.configure({codec: 'vp8', width, height, bitrate, framerate: screen ? 10 : 20, latencyMode: 'realtime'});
      this.forceKey.add(kind);
    };
    configure();
    // Rate control on the socket backlog, the only congestion signal TCP gives us:
    // back off fast when it grows, creep up after a few calm seconds.
    const control = setInterval(() => {
      const backlog = this.sig.buffered;
      if (backlog > 64 * 1024) { calm = 0; if (bitrate > 150_000) { bitrate = Math.max(150_000, bitrate * 0.7); configure(); } }
      else if (++calm >= 3 && bitrate < maxRate) { calm = 0; bitrate = Math.min(maxRate, bitrate * 1.2); configure(); }
    }, 1000);
    const timer = setInterval(() => {
      if (enc.state !== 'configured') return;
      if (this.sig.buffered > BACKLOG_DROP && !this.forceKey.has(kind)) return;   // congested: drop this frame
      const s = track.getSettings();
      if (s.width !== width || s.height !== height) configure();   // camera was rescaled for room size
      const frame = grabber.frame();
      if (!frame) return;
      enc.encode(frame, {keyFrame: this.forceKey.delete(kind)});
      frame.close();
    }, screen ? 100 : 50);
    return () => { clearInterval(timer); clearInterval(control); enc.close(); grabber.stop(); };
  }

  private encodeAudio(stream: MediaStream) {
    const enc = new AudioEncoder({
      output: chunk => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); this.send(AUDIO, true, chunk.timestamp / 1000, d); },
      error: e => console.error('audio encoder', e),
    });
    enc.configure({codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 32_000});
    let node: AudioWorkletNode | undefined, src: MediaStreamAudioSourceNode | undefined;
    this.ready.then(() => {
      src = this.ac.createMediaStreamSource(stream);
      node = new AudioWorkletNode(this.ac, 'capture');
      node.port.onmessage = ({data}: MessageEvent<Float32Array<ArrayBuffer>>) => {
        if (enc.state !== 'configured') return;
        const a = new AudioData({format: 'f32', sampleRate: 48000, numberOfFrames: data.length, numberOfChannels: 1, timestamp: performance.now() * 1000, data});
        enc.encode(a); a.close();
      };
      const mute = this.ac.createGain(); mute.gain.value = 0;
      src.connect(node).connect(mute).connect(this.ac.destination);   // keeps the graph running, outputs silence
      this.ac.resume();
    });
    return () => { enc.close(); node?.disconnect(); src?.disconnect(); };
  }

  // --- receiving ---
  private async receive(from: number, payload: Bytes) {
    const kind = payload[0]!, keyframe = (payload[1]! & 1) === 1, kid = payload[2]!, timestamp = new DataView(payload.buffer, payload.byteOffset).getUint32(3) * 1000;
    const key = this.keys.get(String(from))?.get(kid);
    const d = this.decoders.get(from) ?? this.decoders.set(from, {video: new Map(), lastReq: 0}).get(from)!;
    if (!key) return this.requestKeyframe(from, d);
    if (!fresh(this.last, from, kind, kid, timestamp)) return;   // the relay resending an old frame
    let data: Bytes;
    try { data = await open(key, payload.subarray(7), payload.subarray(0, 7)); } catch { return; }
    this.last.set(from + ':' + kind, {kid, ts: timestamp});
    if (kind === AUDIO) return this.playAudio(d, timestamp, data);
    let v = d.video.get(kind);
    if (!v || v.dec.state === 'closed') {
      if (!keyframe) return this.requestKeyframe(from, d);   // a decoder must start on a keyframe
      const video: Video = {dec: null as unknown as VideoDecoder, gotKey: false};
      video.dec = new VideoDecoder({
        output: frame => { if (video.sink) video.sink(frame); else frame.close(); },
        error: () => { this.closeVideo(from, kind); },   // next keyframe recreates it
      });
      video.dec.configure({codec: 'vp8'});
      v = video;
      d.video.set(kind, v);
      const source: FrameSource = {subscribe: sink => { video.sink = sink; }};
      this.onTrack?.(from, kind === SCREEN ? 'screen' : 'cam', kind === SCREEN, source);
    }
    if (keyframe) v.gotKey = true;
    if (!v.gotKey) return this.requestKeyframe(from, d);
    v.dec.decode(new EncodedVideoChunk({type: keyframe ? 'key' : 'delta', timestamp, data}));
  }

  private closeVideo(id: number, kind: number) {
    const d = this.decoders.get(id), v = d?.video.get(kind);
    if (v?.dec.state !== 'closed') v?.dec.close();
    d?.video.delete(kind);
  }

  private requestKeyframe(from: number, d: Decoder) {
    if (performance.now() - d.lastReq < 1000) return;
    d.lastReq = performance.now();
    this.sig.send(from, {t: 'kf'});
  }

  private async playAudio(d: Decoder, timestamp: number, data: Bytes) {
    if (!d.audio) {
      await this.ready;
      d.speaker = new AudioWorkletNode(this.ac, 'playback');
      d.speaker.connect(this.ac.destination);
      d.speaker.connect(this.mix);
      const speaker = d.speaker;
      d.audio = new AudioDecoder({
        output: a => { const pcm = new Float32Array(a.numberOfFrames); a.copyTo(pcm, {planeIndex: 0, format: 'f32-planar'}); a.close(); speaker.port.postMessage(pcm, [pcm.buffer]); },
        error: e => console.error('audio decoder', e),
      });
      d.audio.configure({codec: 'opus', sampleRate: 48000, numberOfChannels: 1});
      this.ac.resume();
    }
    if (d.audio.state === 'configured') d.audio.decode(new EncodedAudioChunk({type: 'key', timestamp, data}));
  }

  private dropPeer(id: number) {
    const d = this.decoders.get(id);
    for (const kind of d?.video.keys() ?? []) this.closeVideo(id, kind);
    d?.audio?.close(); d?.speaker?.disconnect();
    this.decoders.delete(id);
    this.keys.delete(String(id));
  }
}
