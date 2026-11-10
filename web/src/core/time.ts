// Wall-clock time in a zone, with Intl and Date only (no Temporal): the two conversions every
// date-bound tool needs.
const fmts = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => { let f = fmts.get(tz); if (!f) fmts.set(tz, f = new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'})); return f; };

/** Wall-clock parts of a UTC instant (ms) in `tz`. */
export function wall(tz: string, ms: number) {
  const p: Record<string, number> = {};
  for (const {type, value} of fmt(tz).formatToParts(ms)) if (type !== 'literal') p[type] = +value;
  return {y: p['year']!, m: p['month']!, d: p['day']!, h: p['hour']! % 24, min: p['minute']!};
}

/** UTC ms of a wall-clock time in `tz`. A time skipped by a DST jump lands next to the gap. */
export function toUtc(tz: string, y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = (ms: number) => { const w = wall(tz, ms); return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min) - ms; };
  const ms = guess - off(guess);
  const o2 = off(ms);
  return guess - o2 === ms ? ms : guess - o2;   // crossed a DST boundary: resolve once more
}

export const pad = (n: number) => String(n).padStart(2, '0');
