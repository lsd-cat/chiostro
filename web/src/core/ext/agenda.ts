// Agenda and timer, logic: a shared checklist and one shared countdown. Anyone may edit; the
// whole state is broadcast on every change (last writer wins), and re-sent to late joiners.
import type {Core} from '../ext.js';

export type Item = {text: string; done: boolean};

export class Agenda {
  items: Item[] = [];
  timerEnd: number | null = null;   // epoch ms, or null when stopped
  onChange?: () => void;

  constructor(private core: Core) {
    const {sig} = core;
    sig.on('agenda', (_id, m) => {
      if (!Array.isArray(m.items)) return;
      this.items = (m.items as unknown[]).slice(0, 50).map(i => ({text: String((i as Item).text).slice(0, 200), done: !!(i as Item).done}));
      this.onChange?.();
    });
    sig.on('timer', (_id, m) => { this.timerEnd = typeof m.end === 'number' ? m.end : null; this.onChange?.(); });
    core.sync.register('agenda', {
      get: () => ({items: this.items, timerEnd: this.timerEnd}),
      set: v => { const s = v as {items: Item[]; timerEnd: number | null}; this.items = s.items ?? []; this.timerEnd = s.timerEnd ?? null; this.onChange?.(); },
    });
  }

  add(text: string) { this.items.push({text, done: false}); this.publish(); }
  toggle(i: number) { const it = this.items[i]; if (it) { it.done = !it.done; this.publish(); } }
  remove(i: number) { this.items.splice(i, 1); this.publish(); }
  startTimer(minutes: number) { this.timerEnd = Date.now() + minutes * 60_000; this.core.sig.send('*', {t: 'timer', end: this.timerEnd}); this.onChange?.(); }
  stopTimer() { this.timerEnd = null; this.core.sig.send('*', {t: 'timer', end: null}); this.onChange?.(); }

  private publish() { this.core.sig.send('*', {t: 'agenda', items: this.items}); this.onChange?.(); }
}
