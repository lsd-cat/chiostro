// Picture-in-picture for all videos at once. UI-only extension (no network state).
// Chromium: Document PiP moves the whole tile grid into an always-on-top window.
// Safari / other Chromium: every tile is composed onto one canvas and shown via video PiP.
// Firefox exposes no PiP API to pages: the button is hidden there.
import {compose, css, translate, type UiCtx} from '../dom.js';

type DocPip = {requestWindow(o: {width: number; height: number}): Promise<Window>};
const docPip = (window as unknown as {documentPictureInPicture?: DocPip}).documentPictureInPicture;
const videoPip = 'requestPictureInPicture' in HTMLVideoElement.prototype;

export class PipUi {
  private composer?: {stop: () => void};

  private tiles: () => HTMLElement;

  constructor(_logic: undefined, ui: UiCtx) {
    this.tiles = () => ui.stage.querySelector<HTMLElement>('#tiles')!;
    if (!docPip && !videoPip) return;
    css('/ext/pip.css');
    ui.settings.insertAdjacentHTML('beforeend', `<button id="pipb" data-i18n-aria="pip" aria-pressed="false"><span aria-hidden="true">⧉ </span><span data-i18n="pipLabel">PiP</span></button>`);
    translate(ui.settings);
    document.getElementById('pipb')!.onclick = () => (docPip ? this.documentPip() : this.videoPip()).catch(console.error);
  }

  private set(on: boolean) { document.getElementById('pipb')!.ariaPressed = String(on); }

  private async documentPip() {
    const grid = this.tiles(), home = grid.parentElement!, next = grid.nextSibling;
    const win = await docPip!.requestWindow({width: 480, height: 320});
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) win.document.head.append(l.cloneNode());
    win.document.body.className = 'pip';
    win.document.body.append(grid);
    this.set(true);
    win.addEventListener('pagehide', () => { home.insertBefore(grid, next); this.set(false); });
  }

  private async videoPip() {
    if (this.composer) { await document.exitPictureInPicture().catch(() => {}); return; }
    const {canvas, stop} = compose(() => [...this.tiles().querySelectorAll<HTMLVideoElement | HTMLCanvasElement>('video, canvas')]);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.srcObject = canvas.captureStream();
    await v.play();
    await v.requestPictureInPicture();
    this.composer = {stop: () => { stop(); v.srcObject = null; this.composer = undefined; this.set(false); }};
    this.set(true);
    v.addEventListener('leavepictureinpicture', () => this.composer?.stop());
  }
}
