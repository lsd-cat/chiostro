// Annotations, UI: a transparent canvas over the PDF view (or the stage), pointer drawing,
// buttons. Reads strokes from the Ink logic and redraws on change, resize or anchor change.
import {Ink, MAX_POINTS} from '../../core/ext/ink.js';
import {t} from '../../core/i18n.js';
import {css, translate, type UiCtx} from '../dom.js';

export class InkUi {
  private canvas = document.createElement('canvas');
  private drawing: number[] | null = null;
  private page = 0;

  constructor(private ink: Ink, ui: UiCtx) {
    css('/ext/ink.css');
    // One tool: Draw enters drawing mode; a strip above the stage holds its two actions.
    ui.bar.insertAdjacentHTML('beforeend', `<button id="inkb" data-i18n-aria="drawAria" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-pencil"/></svg><span data-i18n="draw">Draw</span></button>`);
    ui.stage.insertAdjacentHTML('afterbegin', `<div id="inkbar" class="panel" hidden><div class="row"><span data-i18n="drawing">Drawing on</span><button id="inkclear" data-i18n-aria="clearInk"><span aria-hidden="true">🧹 </span><span data-i18n="clearInkLabel">Clear mine</span></button><button id="inkdone" data-i18n="done">Done</button></div></div>`);
    translate(ui.bar); translate(ui.stage);
    const c = this.canvas, on = document.getElementById('inkb')!;
    c.id = 'ink'; c.ariaLabel = t('annotations');
    const setMode = (active: boolean) => {
      c.classList.toggle('on', active);
      on.ariaPressed = String(active);
      document.getElementById('inkbar')!.hidden = !active;
      if (active) ink.penOn();
    };
    on.onclick = () => setMode(!c.classList.contains('on'));
    document.getElementById('inkdone')!.onclick = () => setMode(false);
    document.getElementById('inkclear')!.onclick = () => ink.clearMine();
    c.onpointerdown = e => { try { c.setPointerCapture(e.pointerId); } catch {} this.drawing = [...this.norm(e)]; };
    c.onpointermove = e => { if (this.drawing && this.drawing.length < MAX_POINTS) { this.drawing.push(...this.norm(e)); this.redraw(); } };
    c.onpointerup = c.onpointercancel = () => {
      if (!this.drawing) return;
      const pts = this.drawing;
      this.drawing = null;
      ink.add({page: this.page, pts, color: ink.color});
    };
    new ResizeObserver(() => this.redraw()).observe(c);
    ink.onChange = () => this.redraw();
    // The PDF UI announces its view box; the overlay anchors there, or over the tiles when there is
    // no PDF. Never over the whole stage: that would cover the Draw strip's own buttons.
    const tiles = () => ui.stage.querySelector<HTMLElement>('#tiles')!;
    tiles().append(c);
    ui.bus.on('pdf:view', d => {
      const {page, container} = d as {page: number; container: HTMLElement | null};
      this.page = page;
      (container ?? tiles()).append(this.canvas);
      this.redraw();
    });
  }

  private norm(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }

  private redraw() {
    const c = this.canvas, r = c.getBoundingClientRect();
    if (c.width !== Math.round(r.width) || c.height !== Math.round(r.height)) { c.width = Math.round(r.width); c.height = Math.round(r.height); }
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 3; ctx.lineCap = ctx.lineJoin = 'round';
    const draw = (pts: number[], color: string) => {
      ctx.strokeStyle = color; ctx.beginPath();
      for (let i = 0; i + 1 < pts.length; i += 2) { const x = pts[i]! * c.width, y = pts[i + 1]! * c.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    };
    const strokes = this.ink.strokesFor(this.page);
    for (const s of strokes) draw(s.pts, s.color);
    if (this.drawing) draw(this.drawing, this.ink.color);
    c.dataset['strokes'] = String(strokes.length);
  }
}
