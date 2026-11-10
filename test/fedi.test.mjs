// Fediverse adapters: URL shapes of the four platforms, HTML to text, and one card per JSON shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import {recognise, htmlToText, toCard, isCard} from '../dist/core/fedi.js';

test('recognise public URLs of the four platforms, nothing else', () => {
  assert.deepEqual(recognise('https://mastodon.social/@Mastodon/117466985005297414'), {platform: 'mastodon', api: 'https://mastodon.social/api/v1/statuses/117466985005297414', url: 'https://mastodon.social/@Mastodon/117466985005297414'});
  assert.equal(recognise('https://framatube.org/w/c74b5a48-8f96-4742-ae29-d0dd2ae78d23').api, 'https://framatube.org/api/v1/videos/c74b5a48-8f96-4742-ae29-d0dd2ae78d23');
  assert.equal(recognise('https://mobilizon.fr/events/15b76a8f-ed63-4aec-b2e7-ea12eb9acb69').platform, 'mobilizon');
  assert.equal(recognise('https://mastodon.cisti.org/@ballalloi@livellosegreto.it').api, 'https://mastodon.cisti.org/api/v1/accounts/lookup?acct=ballalloi%40livellosegreto.it', 'a remote account seen on an instance');
  assert.equal(recognise('https://m.example/@ann/').api, 'https://m.example/api/v1/accounts/lookup?acct=ann');
  assert.equal(recognise('https://demo.gancio.org/event/after-party').api, 'https://demo.gancio.org/api/event/detail/after-party');
  // Gancio's API shape, as gancio.cisti.org answers it
  const g = toCard(recognise('https://g.example/event/polveriera'), {id: 7526, title: 'Polveriera totale', slug: 'polveriera', description: '<h3>Sesto numero</h3><p>4 euro</p>', start_datetime: 1793833200, end_datetime: 1794437700, place: {name: 'Circolo', address: 'Via Roma 1', latitude: null}, tags: []});
  assert.deepEqual(g, {url: 'https://g.example/event/polveriera', platform: 'gancio', kind: 'event', title: 'Polveriera totale', text: 'Sesto numero\n\n4 euro', at: new Date(1793833200000).toISOString(), end: new Date(1794437700000).toISOString(), place: 'Circolo, Via Roma 1'});
  assert.equal(toCard(recognise('https://g.example/event/x'), {type: 'Event', name: 'AP shape is not what the API serves'}), null);
  assert.equal(recognise('https://example.org/photo.png'), null);
  assert.equal(recognise('http://evil.example/@x/1'), null, 'plain http only on localhost');
  assert.equal(recognise('javascript:alert(1)'), null);
});
test('html to text', () => {
  assert.equal(htmlToText('<p>Hi <b>there</b> &amp; you</p><p>Second<br>line</p><script>x()</script>'), 'Hi there & you\n\nSecond\nline\nx()');
});
test('cards from each platform shape', () => {
  const m = toCard(recognise('https://m.example/@a/1'), {content: '<p>hello</p>', created_at: '2026-10-19T09:59:05Z', account: {display_name: 'Ann', acct: 'ann'}});
  assert.deepEqual(m, {url: 'https://m.example/@a/1', platform: 'mastodon', kind: 'post', title: 'Ann', by: '@ann', text: 'hello', at: '2026-10-19T09:59:05Z'});
  const v = toCard(recognise('https://p.example/w/abc'), {name: 'Talk', description: 'd', publishedAt: 'x', channel: {displayName: 'Chan'}});
  assert.equal(v.kind, 'video'); assert.equal(v.by, 'Chan');
  const e = toCard(recognise('https://m.example/events/11111111-2222-3333-4444-555555555555'), {type: 'Event', name: 'Picnic', content: '<p>Bring food</p>', startTime: '2027-01-01T10:00:00Z', location: {name: 'Park', address: 'Main st'}});
  assert.equal(e.kind, 'event'); assert.equal(e.place, 'Park, Main st'); assert.equal(e.text, 'Bring food');
  const mob = toCard(recognise('https://mob.example/events/15b76a8f-ed63-4aec-b2e7-ea12eb9acb69'), {type: 'Event', name: 'N', startTime: 's', location: {name: 'X', address: {locality: 'Lyon', country: 'FR'}}});
  assert.equal(mob.place, 'X, Lyon, FR');
  assert.equal(toCard(recognise('https://g.example/event/x'), {type: 'Note'}), null, 'wrong shape is refused');
  const pr = toCard(recognise('https://m.example/@ann'), {acct: 'ann@livellosegreto.it', display_name: 'Ann 🍉', note: '<p>Hi</p><p>she/her</p>', created_at: '2025-01-31T00:00:00.000Z', followers_count: 3});
  assert.deepEqual(pr, {url: 'https://m.example/@ann', platform: 'mastodon', kind: 'profile', title: 'Ann 🍉', by: '@ann@livellosegreto.it', text: 'Hi\n\nshe/her', at: '2025-01-31T00:00:00.000Z'});
  assert.ok(isCard(m) && isCard(pr) && !isCard({kind: 'post'}));
});
