// Raise hand, logic: who has a hand up, in the order they raised it.
import type {Core} from '../ext.js';

export class Hand {
  readonly up = new Map<number | 'me', number>();   // peer -> time raised
  onChange?: () => void;

  constructor(private core: Core) {
    const {sig} = core;
    sig.on('hand', (id, m) => { m.up ? this.up.set(id, Number(m.at) || Date.now()) : this.up.delete(id); this.onChange?.(); });
    core.sync.register('hand', {
      get: () => [...this.up].map(([id, at]) => [core.sync.idOf(id), at]),
      set: v => { for (const [id, at] of v as [number, number][]) this.up.set(id, at); this.onChange?.(); },
    });
  }

  get mine() { return this.up.has('me'); }

  toggle() {
    if (this.mine) this.up.delete('me'); else this.up.set('me', Date.now());
    this.core.sig.send('*', {t: 'hand', up: this.mine, at: this.up.get('me')});
    this.onChange?.();
  }

  /** Peers with a hand up, oldest first. */
  order(): (number | 'me')[] { return [...this.up.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id); }
}
