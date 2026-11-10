// Text OT: diff/apply round-trip, the transformation property on random concurrent edits, cursor mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import {apply, diff, transform, mapPos, annotate} from '../dist/core/ot.js';

let seed = 7;
const rnd = n => (seed = (seed * 48271) % 2147483647) % n;
const randomEdit = text => {   // random replacement somewhere
  const a = rnd(text.length + 1), b = Math.min(text.length, a + rnd(4));
  const ins = rnd(3) ? 'xyz'.slice(0, rnd(4)) : '';
  return text.slice(0, a) + ins + text.slice(b);
};
test('diff produces an op that apply turns back into the new text', () => {
  for (let k = 0; k < 500; k++) { const a = 'hello world'.slice(rnd(12)), b = randomEdit(a); assert.equal(apply(a, diff(a, b)), b); }
  assert.deepEqual(diff('abc', 'abc'), [3]);
  assert.deepEqual(diff('abc', 'aXc'), [1, -1, 'X', 1]);
});
test('transform converges for concurrent edits (TP1)', () => {
  for (let k = 0; k < 2000; k++) {
    const d = 'the quick brown fox'.slice(rnd(20));
    const a = diff(d, randomEdit(d)), b = diff(d, randomEdit(d));
    const [a2, b2] = transform(a, b);
    assert.equal(apply(apply(d, a), b2), apply(apply(d, b), a2), JSON.stringify({d, a, b}));
  }
  assert.deepEqual(transform(['A'], ['B']), [['A', 1], [1, 'B']]);   // same spot: a first
});
test('cursor follows remote edits', () => {
  assert.equal(mapPos(5, ['ab', 10]), 7);        // insert before: shifts
  assert.equal(mapPos(5, [5, 'ab', 5]), 7);      // insert at the cursor: shifts
  assert.equal(mapPos(5, [7, 'ab', 3]), 5);      // insert after: stays
  assert.equal(mapPos(5, [2, -2, 6]), 3);        // delete before: shifts back
  assert.equal(mapPos(5, [3, -4, 3]), 3);        // delete across the cursor: lands at the cut
});
test('authorship follows ops', () => {
  let a = annotate([], ['hello'], 'A');
  assert.deepEqual(a, ['A', 'A', 'A', 'A', 'A']);
  a = annotate(a, [5, ' world'], 'B');
  assert.deepEqual(a.join(''), 'AAAAABBBBBB');
  a = annotate(a, [2, -4, 'X', 5], 'C');          // C replaces "llo " with X
  assert.deepEqual(a.join(''), 'AACBBBBB');
});
