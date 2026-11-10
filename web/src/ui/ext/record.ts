// Local recording, UI: composes every tile onto a canvas, mixes all audio in an AudioContext,
// records with MediaRecorder and offers the file when stopped. Others see who is recording.
import {Recording} from '../../core/ext/record.js';
import {t} from '../../core/i18n.js';
import {$, compose, css, translate, download, type UiCtx} from '../dom.js';

export class RecordUi {
  private rec?: {recorder: MediaRecorder; stop: () => void};

  constructor(private logic: Recording, private ui: UiCtx) {
    if (typeof MediaRecorder === 'undefined') return;
    css('/ext/record.css');
    ui.bar.insertAdjacentHTML('beforeend', `<button id="recb" data-i18n-aria="record" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-record"/></svg><span data-i18n="recLabel">Rec</span></button>`);
    ui.stage.insertAdjacentHTML('afterbegin', `<div id="recnote" class="panel" hidden role="status"></div>`);
    translate(ui.bar);
    $('recb').onclick = () => (this.rec ? this.stop() : this.start().catch(console.error));
    logic.onChange = () => this.render();
  }

  private render() {
    const others = [...this.logic.recording].filter(id => id !== 'me') as number[];
    $('recnote').hidden = !others.length;
    $('recnote').textContent = others.map(id => t('recordingBy', {who: this.ui.roster.nameOf(id)})).join(' · ');
    $('recb').ariaPressed = String(!!this.rec);
    $('recb').ariaLabel = t(this.rec ? 'stopRecording' : 'record');
  }

  private async start() {
    const {canvas, stop} = compose(() => [...this.ui.stage.querySelectorAll<HTMLVideoElement | HTMLCanvasElement>('.tile video, .tile canvas')]);
    // Audio: every audio track reachable from the tiles (mesh: remote streams; local mic) plus
    // the relay mode's mixed remote audio, summed into one track.
    const ac = new AudioContext(), dest = ac.createMediaStreamDestination(), seen = new Set<string>();
    const addStream = (s: MediaStream | null | undefined) => { if (s?.getAudioTracks().length && !seen.has(s.id)) { seen.add(s.id); ac.createMediaStreamSource(s).connect(dest); } };
    for (const v of this.ui.stage.querySelectorAll<HTMLVideoElement>('.tile video')) addStream(v.srcObject as MediaStream | null);
    addStream(this.ui.remoteAudio?.());
    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, {mimeType: ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m))});
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      download(new Blob(chunks, {type: recorder.mimeType}), `meet-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${recorder.mimeType.includes('mp4') ? 'mp4' : 'webm'}`);
      stop(); ac.close();
    };
    recorder.start(1000);
    this.rec = {recorder, stop: () => recorder.stop()};
    this.logic.set(true);
    this.render();
  }

  private stop() { this.rec?.stop(); this.rec = undefined; this.logic.set(false); this.render(); }
}
