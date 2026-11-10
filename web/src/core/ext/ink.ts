// Annotations, logic only: strokes per author, tagged with the PDF page, broadcast on pen-up,
// re-sent to late joiners. The UI owns the canvas and pointer events.
// Bus: emits 'fit' when the pen turns on (and broadcasts ink-fit) so every viewer shows whole pages.
import type {Core} from '../ext.js';

export type Stroke = {page: number; pts: number[]; color: string};   // pts: x0,y0,x1,y1,... in 0..1 of the overlay box
export const MAX_POINTS = 4000;

export class Ink {
  readonly color = `hsl(${Math.floor(Math.random() * 360)} 80% 50%)`;
  onChange?: () => void;
  private strokes = new Map<string, Stroke[]>();   // 'me' | peer id -> strokes

  constructor(private core: Core) {
    const {sig, bus} = core;
    sig.on('ink', (id, m) => { if (Array.isArray(m.pts) && m.pts.length <= MAX_POINTS * 2) this.store(String(id), {page: Number(m.page), pts: (m.pts as unknown[]).map(Number), color: String(m.color).slice(0, 40)}); });
    sig.on('ink-clear', id => { this.strokes.delete(String(id)); this.onChange?.(); });
    sig.on('ink-fit', () => bus.emit('fit'));
    core.sync.register('ink', {
      get: () => [...this.strokes].map(([who, list]) => [who === 'me' ? core.sig.myId : Number(who), list]),
      set: v => { for (const [who, list] of v as [number, Stroke[]][]) this.strokes.set(String(who), list); this.onChange?.(); },
    });
  }

  /** The pen was turned on: everyone should see whole pages so strokes line up. */
  penOn() { this.core.bus.emit('fit'); this.core.sig.send('*', {t: 'ink-fit'}); }

  add(stroke: Stroke) { this.store('me', stroke); this.core.sig.send('*', {t: 'ink', ...stroke}); }

  clearMine() { this.strokes.delete('me'); this.core.sig.send('*', {t: 'ink-clear'}); this.onChange?.(); }

  strokesFor(page: number): Stroke[] {
    const out: Stroke[] = [];
    for (const list of this.strokes.values()) for (const s of list) if (s.page === page) out.push(s);
    return out;
  }

  private store(who: string, s: Stroke) {
    const list = this.strokes.get(who) ?? [];
    list.push(s);
    this.strokes.set(who, list);
    this.onChange?.();
  }
}
