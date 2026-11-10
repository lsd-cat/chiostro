// Two AudioWorklet processors. 'capture' posts 20 ms blocks of mono samples to the page.
// 'playback' queues blocks from the page and plays them, with a small target backlog as jitter buffer.
declare class AudioWorkletProcessor { readonly port: MessagePort; constructor(); }
declare function registerProcessor(name: string, cls: unknown): void;
declare const sampleRate: number;

const BLOCK = 960;   // 20 ms at 48 kHz, one Opus frame

class Capture extends AudioWorkletProcessor {
  private buf = new Float32Array(BLOCK);
  private n = 0;
  process(inputs: Float32Array[][]) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i]!;
      if (this.n === BLOCK) { this.port.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(BLOCK); this.n = 0; }
    }
    return true;
  }
}

class Playback extends AudioWorkletProcessor {
  private queue: Float32Array[] = [];
  private pos = 0;
  private primed = false;
  constructor() {
    super();
    this.port.onmessage = ({data}: MessageEvent<Float32Array>) => { this.queue.push(data); if (this.queue.length > 25) this.queue.splice(0, 10); };   // cap ~500 ms, drop oldest
  }
  process(_i: Float32Array[][], outputs: Float32Array[][]) {
    const out = outputs[0]?.[0];
    if (!out) return true;
    if (!this.primed) { if (this.queue.length < 3) return true; this.primed = true; }   // ~60 ms target backlog
    for (let i = 0; i < out.length; i++) {
      const cur = this.queue[0];
      if (!cur) { this.primed = false; break; }
      out[i] = cur[this.pos++]!;
      if (this.pos === cur.length) { this.queue.shift(); this.pos = 0; }
    }
    return true;
  }
}

registerProcessor('capture', Capture);
registerProcessor('playback', Playback);
