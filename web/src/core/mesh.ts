// Full mesh: one RTCPeerConnection per pair, every track encrypted/decrypted by the worker.
// Only the newcomer offers; the existing peer adds its tracks when that offer arrives so the
// answer already carries them. Avoids glare + rollback, which breaks ICE between Chrome and
// Firefox. "Perfect negotiation" stays as the backstop for later renegotiations (screen share).
import type {Signaling} from './signaling.js';
import type {Roster} from './roster.js';
import type {Media} from './media.js';
import type {KeyMessage, TransformOptions} from './crypto.js';

type Rtc = {pc: RTCPeerConnection; polite: boolean; makingOffer: boolean; ignoreOffer: boolean; earlyIce: RTCIceCandidateInit[]; sending: boolean};

// Prefer VP8 so the clear-header rule in worker.ts matches what the depacketizer expects.
// Reorder rather than filter: Firefox emits broken SDP (dangling fmtp lines) when codecs are removed.
const isVp8 = (c: RTCRtpCodec) => (/^video\/(VP8|rtx)$/i.test(c.mimeType) ? 0 : 1);
const vp8First = [...(RTCRtpReceiver.getCapabilities('video')?.codecs ?? [])].sort((a, b) => isVp8(a) - isVp8(b));

export class Mesh implements Media {
  onTrack?: Media['onTrack'];
  onTrackEnd?: Media['onTrackEnd'];
  private conns = new Map<number, Rtc>();

  constructor(
    private sig: Signaling,
    private roster: Roster,
    private worker: Worker,
    private rtcConfig: RTCConfiguration,
    private localStreams: () => MediaStream[],
  ) {
    roster.onKey = (peer, kid, key) => worker.postMessage({peer, kid, key} satisfies KeyMessage);
    roster.onJoin = (id, initiator) => this.connect(id, initiator);
    roster.onLeave = id => { this.conns.get(id)?.pc.close(); this.conns.delete(id); };
    sig.on('sdp', (id, m) => this.onSdp(id, m.description as RTCSessionDescriptionInit));
    sig.on('ice', (id, m) => this.onIce(this.conn(id), m.candidate as RTCIceCandidateInit));
    sig.on('unscreen', (id, m) => this.onTrackEnd?.(id, String(m.sid)));
    roster.start();
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream) {
    for (const [id, c] of this.conns) this.addEncryptedTrack(id, c.pc, track, stream);
  }

  removeTrack(track: MediaStreamTrack) {
    for (const {pc} of this.conns.values()) for (const s of pc.getSenders()) if (s.track === track) pc.removeTrack(s);
  }

  private conn(id: number): Rtc { return this.conns.get(id) ?? this.connect(id, false); }

  private connect(id: number, initiator: boolean): Rtc {
    const existing = this.conns.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection(this.rtcConfig);
    const c: Rtc = {pc, polite: this.sig.myId > id, makingOffer: false, ignoreOffer: false, earlyIce: [], sending: false};
    this.conns.set(id, c);
    if (initiator) this.addLocalTracks(id, c);
    pc.onicecandidate = ({candidate}) => { if (candidate) this.sig.send(id, {t: 'ice', candidate: candidate.toJSON()}); };
    pc.onnegotiationneeded = async () => {
      try {
        c.makingOffer = true;
        await pc.setLocalDescription();
        this.sig.send(id, {t: 'sdp', description: pc.localDescription!.toJSON()});
      } finally { c.makingOffer = false; }
    };
    pc.ontrack = ({receiver, streams: [stream]}) => {
      if (!receiver.transform) receiver.transform = this.transform({op: 'decrypt', peer: String(id)});   // transceivers the remote offer created
      if (stream) this.onTrack?.(id, stream.id, this.roster.peer(id).screens.has(stream.id), stream);
    };
    return c;
  }

  private addLocalTracks(id: number, c: Rtc) {
    c.sending = true;
    for (const s of this.localStreams()) for (const t of s.getTracks()) this.addEncryptedTrack(id, c.pc, t, s);
  }

  private transform(o: TransformOptions) { return new RTCRtpScriptTransform(this.worker, o); }

  private addEncryptedTrack(id: number, pc: RTCPeerConnection, track: MediaStreamTrack, stream: MediaStream) {
    const sender = pc.addTrack(track, stream);
    sender.transform = this.transform({op: 'encrypt', peer: 'me'});
    const tr = pc.getTransceivers().find(t => t.sender === sender)!;
    // Chrome silently ignores a receiver transform set after a description touched the transceiver,
    // so attach it here, before negotiation. Firefox accepts either.
    if (!tr.receiver.transform) tr.receiver.transform = this.transform({op: 'decrypt', peer: String(id)});
    if (track.kind === 'video') tr.setCodecPreferences?.(vp8First);
  }

  private async onSdp(id: number, description: RTCSessionDescriptionInit) {
    const c = this.conn(id), {pc} = c;
    const collision = description.type === 'offer' && (c.makingOffer || pc.signalingState !== 'stable');
    c.ignoreOffer = !c.polite && collision;
    if (c.ignoreOffer) return;
    if (!c.sending) this.addLocalTracks(id, c);
    await pc.setRemoteDescription(description);
    for (const cand of c.earlyIce.splice(0)) pc.addIceCandidate(cand).catch(() => {});
    if (description.type === 'offer') {
      await pc.setLocalDescription();
      this.sig.send(id, {t: 'sdp', description: pc.localDescription!.toJSON()});
    }
  }

  private async onIce(c: Rtc, candidate: RTCIceCandidateInit) {
    // Firefox keeps candidates from an offer that lost the glare; hold them until the answer lands.
    if (!c.pc.remoteDescription) { c.earlyIce.push(candidate); return; }
    try { await c.pc.addIceCandidate(candidate); } catch (e) { if (!c.ignoreOffer) throw e; }
  }
}
