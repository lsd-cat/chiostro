// Operational transformation for plain text, the shape Etherpad and ot.js use: an op is a list of
// components that walk the whole document: retain n (n > 0), delete n (n < 0), insert "s".
export type Op = (number | string)[];

export function apply(text: string, op: Op): string {
  let i = 0, out = '';
  for (const c of op) {
    if (typeof c === 'string') out += c;
    else if (c > 0) { out += text.slice(i, i + c); i += c; }
    else i -= c;
  }
  if (i !== text.length) throw new Error('op does not span the document');
  return out;
}

/** The op turning `a` into `b`: common prefix and suffix kept, one replacement in between. */
export function diff(a: string, b: string): Op {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const op: Op = [];
  if (p) op.push(p);
  if (a.length - p - s) op.push(-(a.length - p - s));
  if (b.length - p - s) op.push(b.slice(p, b.length - s));
  if (s) op.push(s);
  return op;
}

/** Transform two ops made on the same document into [a', b'] such that
 *  apply(apply(d, a), b') === apply(apply(d, b), a'). Inserts at the same spot: a's text comes first. */
export function transform(a: Op, b: Op): [Op, Op] {
  const a2: Op = [], b2: Op = [];
  const push = (op: Op, c: number | string) => {   // merge adjacent components of the same kind
    if (c === 0 || c === '') return;
    const last = op[op.length - 1];
    if (typeof c === 'string' && typeof last === 'string') op[op.length - 1] = last + c;
    else if (typeof c === 'number' && typeof last === 'number' && (c > 0) === (last > 0)) op[op.length - 1] = last + c;
    else op.push(c);
  };
  let i = 0, j = 0, x = a[0], y = b[0];
  while (x !== undefined || y !== undefined) {
    if (typeof x === 'string') { push(a2, x); push(b2, x.length); x = a[++i]; continue; }
    if (typeof y === 'string') { push(b2, y); push(a2, y.length); y = b[++j]; continue; }
    if (x === undefined || y === undefined) throw new Error('ops span different documents');
    const n = Math.min(Math.abs(x), Math.abs(y));
    if (x > 0 && y > 0) { push(a2, n); push(b2, n); }
    else if (x < 0 && y > 0) push(a2, -n);   // a deletes what b kept: a' still deletes, b' has nothing left to retain
    else if (x > 0 && y < 0) push(b2, -n);
    x = x > 0 ? x - n : x + n; y = y > 0 ? y - n : y + n;   // both deleting the same text: it is gone either way
    if (x === 0) x = a[++i];
    if (y === 0) y = b[++j];
  }
  return [a2, b2];
}

/** Where a cursor at `pos` lands after `op` (text inserted at the cursor pushes it right). */
export function mapPos(pos: number, op: Op): number {
  let idx = 0, out = pos;
  for (const c of op) {
    if (idx > pos) break;
    if (typeof c === 'string') out += c.length;
    else if (c > 0) idx += c;
    else { out -= Math.min(-c, Math.max(0, pos - idx)); idx -= c; }
  }
  return out;
}

/** Apply `op` to an array parallel to the text (one entry per character), filling inserts with `value`. */
export function annotate<T>(attrs: T[], op: Op, value: T): T[] {
  const out: T[] = [];
  let i = 0;
  for (const c of op) {
    if (typeof c === 'string') for (let k = 0; k < c.length; k++) out.push(value);
    else if (c > 0) { for (let k = 0; k < c; k++) out.push(attrs[i + k]!); i += c; }
    else i -= c;
  }
  return out;
}
