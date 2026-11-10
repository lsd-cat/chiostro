// What the UI needs from a media mode. Mesh sends WebRTC to every peer; RelayMedia sends
// WebCodecs frames through the relay. Both get names, keys and join/leave from the Roster.
// Remote video arrives either as a MediaStream (mesh) or as decoded VideoFrames (relay);
// the UI decides how to show either.
export type FrameSource = {subscribe(sink: (frame: VideoFrame) => void): void};
export interface Media {
  onTrack?: (id: number, sid: string, screen: boolean, source: MediaStream | FrameSource) => void;
  /** A remote stream went away (screen share stopped). */
  onTrackEnd?: (id: number, sid: string) => void;
  addTrack(track: MediaStreamTrack, stream: MediaStream): void;
  removeTrack(track: MediaStreamTrack): void;
  /** Remote audio as one stream when the mode mixes it itself (relay mode); mesh has it per tile. */
  remoteAudio?(): MediaStream;
}
