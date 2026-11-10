// Scheduling logic: slots are UTC instants from dates + hours in the event zone; a viewer zone
// lays them out on its own grid with gaps; availability is per slot index.
import test from 'node:test';
import assert from 'node:assert/strict';
import {slots, table, tally, bestRanges, closesAt, isEvent, isPerson} from '../dist/core/apps/when.js';

const rome = {name: 'x', dates: ['2026-03-29'], start: 9, end: 17, tz: 'Europe/Rome'};   // DST starts that day: 09:00 is 07:00Z
test('slots are quarter hours as UTC minutes in the event zone', () => {
  const s = slots(rome);
  assert.equal(s.length, 32);
  assert.equal(new Date(s[0] * 60000).toISOString(), '2026-03-29T07:00:00.000Z');
  assert.equal(new Date(s[31] * 60000).toISOString(), '2026-03-29T14:45:00.000Z');
  assert.equal(new Date(slots({...rome, dates: ['2026-01-10']})[0] * 60000).toISOString(), '2026-01-10T08:00:00.000Z');   // winter: +1
  assert.equal(slots({...rome, start: 22, end: 2}).length, 16);   // overnight range wraps
});
test('a viewer zone splits one event day across two local dates with a gap', () => {
  const s = slots(rome), tb = table(s, 'Pacific/Auckland');   // 07:00Z = 20:00, 14:45Z = 03:45 next day
  assert.deepEqual(tb.cols.map(c => c?.date), ['2026-03-29', '2026-03-30']);
  assert.ok(tb.rows.includes(null), 'spacer rows between the two time blocks');
  const seen = tb.cols.flatMap(c => c.cells.filter(Boolean).map(c => c.i)).sort((a, b) => a - b);
  assert.deepEqual(seen, s.map((_, i) => i), 'every slot appears exactly once');
  assert.equal(table(s, 'Europe/Rome').cols.length, 1);
  assert.equal(table(slots({...rome, dates: ['2026-03-29', '2026-03-31']}), 'Europe/Rome').cols[1], null, 'spacer column between non-adjacent dates');
});
test('tally and validation', () => {
  assert.deepEqual(tally([{name: 'a', avail: '101'}, {name: 'b', avail: '001'}], 3), [['a'], [], ['a', 'b']]);
  assert.ok(isEvent(rome) && !isEvent({...rome, tz: 'Mars/Olympus'}) && !isEvent({...rome, start: 9, end: 9}) && !isEvent({...rome, dates: []}));
  assert.ok(isPerson({name: 'a', avail: '01'}, 2) && !isPerson({name: 'a', avail: '01'}, 3) && !isPerson({name: ' ', avail: '01'}, 2) && !isPerson({name: 'a', avail: '02'}, 2));
});
test('deadline is the end of that day in the event zone; best ranges merge consecutive slots', () => {
  assert.equal(closesAt(rome), Infinity);
  assert.equal(new Date(closesAt({...rome, by: '2026-03-29'})).toISOString(), '2026-03-29T22:00:00.000Z');   // midnight CEST
  assert.ok(isEvent({...rome, by: '2026-03-29', len: 90}) && !isEvent({...rome, by: 'soon'}) && !isEvent({...rome, len: 5}));
  const s = [600, 615, 630, 700, 715];   // 10:00, 10:15, 10:30, then a gap, 11:40, 11:55
  assert.deepEqual(bestRanges(s, [['a'], ['a'], ['a', 'b'], ['a'], ['a']], 1), [[600, 630, ['a']], [700, 730, ['a']]]);
  assert.deepEqual(bestRanges(s, [['a'], ['a'], ['a', 'b'], ['a'], ['a']], 2), [[630, 645, ['a', 'b']]]);
});
