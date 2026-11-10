// Scheduling logic, no DOM. crab.fit's time model (GPL-3.0, github.com/GRA0007/crab.fit) ported
// from Temporal to Intl/Date: an event is dates + an hour range in one zone; each 15-minute slot
// is a UTC instant, so any viewer zone lays the same slots out on its own grid.
export type Event = {name: string; dates: string[]; start: number; end: number; tz: string; by?: string; len?: number};   // dates YYYY-MM-DD, hours 0..24 in tz; by: answer deadline YYYY-MM-DD; len: meeting minutes
export type Person = {name: string; avail: string};   // one '0'/'1' per slot of slots(event), in order
export type Cell = {slot: number; i: number} | null;  // slot: UTC minutes, i: index into slots(); null: no slot here
export type Table = {rows: (number | null)[]; cols: ({date: string; cells: Cell[]} | null)[]};   // rows: minute of day, null = gap
import {deadline} from '../answers.js';
import {wall, toUtc, pad} from '../time.js';

const range = (a: number, b: number) => Array.from({length: Math.max(0, b - a)}, (_, i) => a + i);

/** Every 15-minute slot of the event as UTC minutes, sorted and unique. */
export function slots(ev: Event): number[] {
  const hours = ev.start > ev.end ? [...range(0, ev.end), ...range(ev.start, 24)] : range(ev.start, ev.end);   // start > end: overnight
  const out = new Set<number>();
  for (const date of ev.dates) {
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    for (const h of hours) for (const q of [0, 15, 30, 45]) out.add(toUtc(ev.tz, y, m, d, h, q) / 60000);
  }
  return [...out].sort((a, b) => a - b);
}

/** Lay the slots out for a viewer zone: one column per local date, one row per local quarter hour.
 *  Gaps get null spacers (two rows between time blocks, one column between date runs), and each
 *  time block ends with a cap row that only carries a label, like crab.fit. */
export function table(slotList: number[], tz: string): Table {
  const at = new Map<string, number>();
  const dates = new Set<string>(), times = new Set<number>();
  slotList.forEach((s, i) => {
    const w = wall(tz, s * 60000), date = `${w.y}-${pad(w.m)}-${pad(w.d)}`, t = w.h * 60 + w.min;
    dates.add(date); times.add(t); at.set(`${date}|${t}`, i);
  });
  const rows: (number | null)[] = [];
  const ts = [...times].sort((a, b) => a - b);
  ts.forEach((t, i) => { const prev = ts[i - 1]; if (prev != null && prev + 15 !== t) rows.push(prev + 15, null, null); rows.push(t); });
  if (ts.length) rows.push(ts[ts.length - 1]! + 15);
  const cols: Table['cols'] = [];
  const ds = [...dates].sort();
  ds.forEach((date, i) => {
    if (i > 0 && nextDay(ds[i - 1]!) !== date) cols.push(null);
    cols.push({date, cells: rows.map(t => { const j = t == null ? undefined : at.get(`${date}|${t}`); return j == null ? null : {slot: slotList[j]!, i: j}; })});
  });
  return {rows, cols};
}
const nextDay = (date: string) => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);

/** Who is available at each slot index. */
export const tally = (people: Person[], n: number): string[][] => Array.from({length: n}, (_, i) => people.filter(p => p.avail[i] === '1').map(p => p.name));

// --- blobs are untrusted input: anyone with the link can write anything ---
const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en', {timeZone: tz}); return true; } catch { return false; } };
export function isEvent(x: unknown): x is Event {
  const e = x as Event;
  return !!e && typeof e === 'object' && typeof e.name === 'string' && e.name.length <= 100
    && Array.isArray(e.dates) && e.dates.length > 0 && e.dates.length <= 100 && e.dates.every(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    && Number.isInteger(e.start) && Number.isInteger(e.end) && e.start >= 0 && e.start <= 24 && e.end >= 0 && e.end <= 24 && e.start !== e.end
    && typeof e.tz === 'string' && validTz(e.tz)
    && (e.by === undefined || (typeof e.by === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.by)))
    && (e.len === undefined || (Number.isInteger(e.len) && e.len >= 15 && e.len <= 480));
}
/** Last instant (UTC ms) answers are accepted: end of the deadline day in the event zone. */
export const closesAt = (ev: Event): number => deadline(ev.by, ev.tz);

/** Consecutive slots where exactly `n` people are free, as [startMin, endMin, names] ranges. */
export function bestRanges(slotList: number[], who: string[][], n: number): [number, number, string[]][] {
  const out: [number, number, string[]][] = [];
  slotList.forEach((s, i) => {
    if (who[i]!.length !== n) return;
    const last = out[out.length - 1];
    if (last && last[1] === s && last[2].join() === who[i]!.join()) last[1] = s + 15; else out.push([s, s + 15, who[i]!]);
  });
  return out;
}
export function isPerson(x: unknown, n: number): x is Person {
  const p = x as Person;
  return !!p && typeof p === 'object' && typeof p.name === 'string' && !!p.name.trim() && p.name.length <= 40 && typeof p.avail === 'string' && p.avail.length === n && /^[01]*$/.test(p.avail);
}
