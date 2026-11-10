// The store in bucket mode: a second relay, booted here with a store.conf that points /_s3/ at the
// fake S3 (which checks every signature), must behave exactly like the disk store from the
// client's side: write once, streamed gets, the listing as the index, the room announced; and
// expire.lua must delete a room whose newest object is old, keep a fresh one, and prune checkpoints.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fakeS3} from './fakes3.mjs';
import {removalFlow} from './fixtures.mjs';

const S3_PORT = 9900, PORT = 8089, ROOT = process.cwd(), DIR = `/tmp/chiostro-s3-${process.pid}`, BASE = `http://127.0.0.1:${PORT}/`;
const s3 = fakeS3({bucket: 'test', key: 'AKIATEST', secret: 'testsecret', region: 'eu-test'});
const room = () => randomBytes(32).toString('hex'), sleep = ms => new Promise(r => setTimeout(r, ms));
let nginx;
test.before(async () => {
  await s3.listen(S3_PORT);
  mkdirSync(DIR + '/data/tmp', {recursive: true}); mkdirSync(DIR + '/logs');
  for (const f of ['relay.lua', 's3.lua', 'expire.lua', 'vendor']) symlinkSync(`${ROOT}/openresty/${f}`, `${DIR}/${f}`);
  writeFileSync(DIR + '/nginx.conf', readFileSync(ROOT + '/openresty/nginx.conf', 'utf8').replace('listen 127.0.0.1:8080', 'listen 127.0.0.1:' + PORT));
  writeFileSync(DIR + '/store.conf', `set $data ""; set $s3_host "127.0.0.1:${S3_PORT}"; set $s3_bucket "test"; set $s3_region "eu-test"; set $s3_key "AKIATEST"; set $s3_secret "testsecret";
location ^~ /_s3/ { internal; proxy_pass http://127.0.0.1:${S3_PORT}/test/; proxy_http_version 1.1; proxy_set_header Host 127.0.0.1:${S3_PORT}; proxy_set_header Connection ""; proxy_hide_header Content-Type; proxy_hide_header Content-Disposition; add_header Content-Type application/octet-stream always; add_header Content-Disposition attachment always; add_header X-Content-Type-Options nosniff always; add_header Cache-Control "private, max-age=31536000, immutable"; }\n`);
  nginx = spawn('openresty', ['-p', DIR, '-c', 'nginx.conf'], {stdio: ['ignore', 'ignore', 'pipe']}); nginx.stderr.on('data', d => process.stderr.write('[nginx] ' + d));
  for (let i = 0; i < 40; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }
});
test.after(async () => { spawn('openresty', ['-p', DIR, '-c', 'nginx.conf', '-s', 'stop']); await sleep(300); await s3.close(); rmSync(DIR, {recursive: true, force: true}); });

test('bucket store: write once, get, listing as index, 405 on index', async () => {
  const r = room(), url = s => `${BASE}blob/share/${r}/${s}`, slot = 'a'.repeat(32), bytes = randomBytes(70000);
  assert.equal((await fetch(url(slot), {method: 'PUT', body: bytes})).status, 201);
  assert.equal((await fetch(url(slot), {method: 'PUT', body: bytes})).status, 409, 'write once');
  assert.equal((await fetch(url('index'), {method: 'PUT', body: 'x'})).status, 405);
  const got = await fetch(url(slot)); assert.equal(got.status, 200); assert.ok(Buffer.from(await got.arrayBuffer()).equals(bytes), 'the bytes come back through the bucket');
  assert.match(got.headers.get('cache-control') ?? '', /immutable/);
  assert.equal((await fetch(url('b'.repeat(32)))).status, 404);
  assert.match(await (await fetch(url('index'))).text(), /^\d{13} a{32} 70000\n$/, 'the listing is the index');
  assert.ok(s3.objects.has(`share/${r}.${slot}`), 'stored under the same name the disk would use');
  await removalFlow(url, assert);
  // a blob is bytes whatever the uploader says: text/html must not come back as a page on this origin
  assert.equal((await fetch(url('e'.repeat(32)), {method: 'PUT', body: '<script>alert(1)</script>', headers: {'content-type': 'text/html'}})).status, 201);
  const page = await fetch(url('e'.repeat(32)));
  assert.equal(s3.objects.get(`share/${r}.${'e'.repeat(32)}`).type, 'application/octet-stream', 'the bucket never learns the uploader\'s type');
  assert.equal(page.headers.get('content-type'), 'application/octet-stream'); assert.equal(page.headers.get('content-disposition'), 'attachment'); assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  // write once under concurrency: twenty puts to one slot at the same instant, exactly one lands
  const statuses = await Promise.all(Array.from({length: 20}, (_, i) => fetch(url('f'.repeat(32)), {method: 'PUT', body: 'body ' + i}).then(x => x.status)));
  assert.equal(statuses.filter(s => s === 201).length, 1, 'one 201: ' + statuses.join(','));
  assert.equal(statuses.filter(s => s === 409).length, 19, 'the rest 409: ' + statuses.join(','));
});

test('expire.lua: an old room goes, a fresh one stays, old pad checkpoints are pruned', async () => {
  const old = room(), fresh = room(), pad = room();
  for (const [r, slot] of [[old, 'c'.repeat(32)], [fresh, 'd'.repeat(32)]]) assert.equal((await fetch(`${BASE}blob/share/${r}/${slot}`, {method: 'PUT', body: 'x'})).status, 201);
  await fetch(`http://127.0.0.1:${S3_PORT}/_backdate?key=share/${old}.${'c'.repeat(32)}&days=40`, {method: 'POST'});
  for (let i = 0; i < 5; i++) assert.equal((await fetch(`${BASE}blob/pad/${pad}/0000${i.toString(16).padStart(28, '0')}`, {method: 'PUT', body: 'cp' + i})).status, 201);
  const out = await (await fetch(`${BASE}_expire?share=30&pad=90&keep=2`)).text();
  assert.match(out, /share: 1 objects of expired rooms deleted/); assert.match(out, /pad: 0 objects of expired rooms deleted, 3 old checkpoints pruned/);
  assert.equal((await fetch(`${BASE}blob/share/${old}/${'c'.repeat(32)}`)).status, 404); assert.equal((await fetch(`${BASE}blob/share/${fresh}/${'d'.repeat(32)}`)).status, 200);
  assert.equal((await (await fetch(`${BASE}blob/pad/${pad}/index`)).text()).split('\n').filter(Boolean).length, 2, 'the newest two checkpoints remain');
});
