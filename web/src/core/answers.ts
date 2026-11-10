// Write-once answers in a room (polls, forms): every answer is one sealed blob, anyone with the
// link reads them all, a deadline is judged by the server's write time. One answer per browser
// is the UI's promise (it remembers locally); the server cannot tell people apart.
import {Store, randomSlot, type Entry} from './store.js';
import {toUtc} from './time.js';

/** Last instant (UTC ms) answers count: the end of the deadline day in the given zone; Infinity without a deadline. */
export const deadline = (by: string | undefined, tz: string): number => { if (!by) return Infinity; const [y, m, d] = by.split('-').map(Number) as [number, number, number]; return toUtc(tz, y, m, d + 1, 0, 0); };

export class Answers<T> {
  constructor(private store: Store, private valid: (x: unknown) => x is T, private closes = Infinity) {}
  /** Everyone's answers in submission order, late ones excluded. `skip` is the definition's slot. */
  async all(skip: string): Promise<(T & {at: number})[]> {
    const entries = (await this.store.list()).filter(e => e.slot !== skip && !e.slot.includes('.') && e.at <= this.closes);
    const got = await Promise.all(entries.map(async e => ({e, v: await this.store.get(e.slot)})));
    return got.filter((g): g is {e: Entry; v: T} => this.valid(g.v)).map(g => ({...g.v, at: g.e.at}));
  }
  /** 201 when stored. */
  submit(answer: T): Promise<number> { return this.store.put(randomSlot(), answer); }
  get closed() { return Date.now() > this.closes; }
}
