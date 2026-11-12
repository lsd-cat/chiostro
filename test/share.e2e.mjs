// Files in headless Chrome: upload (chunked), the other tab sees it live, download matches,
// image preview; then the pad attaches a file and renders it inline from the share room.
import {writeFileSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {webcrypto} from 'node:crypto';
import {Store, storeKeys} from '../dist/core/store.js';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, profile, fail} = await launch(9241);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });

const big = Buffer.alloc(9 * 1024 * 1024); for (let i = 0; i < big.length; i += 4096) big.writeUInt32LE(i, i);   // 3 chunks
writeFileSync(join(profile, 'big.bin'), big);
// a 2x2 PNG
writeFileSync(join(profile, 'dot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4AWP4z8DwHwyBNIgDAEzeB/3dPz+0AAAAAElFTkSuQmCC', 'base64'));

const a = await Tab.open(ROOT + 'share/');
const url = await a.until(`document.getElementById('files') && !document.getElementById('file').disabled && location.href`);   // uploads are enabled once the room is joined
console.log('share', url);
const b = await Tab.open(url); await b.until(`document.getElementById('empty') && !document.getElementById('empty').hidden && 'yes'`);
await a.setFiles('#file', [join(profile, 'big.bin'), join(profile, 'dot.png')]);
console.log('A listed', await a.until(`document.querySelectorAll('#files li').length === 2 && document.getElementById('files').textContent`, 60000));
console.log('B sees live', await b.until(`document.querySelectorAll('#files li').length === 2 && 'yes'`, 20000));
if (!/9\.0 MB/.test(await a.eval(`document.getElementById('files').textContent`))) fail('size not shown');
// download the big one in B and compare bytes
await b.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await b.eval(`[...document.querySelectorAll('#files li')].find(li => li.textContent.includes('big.bin')).querySelector('button').click(); 1`);
let got; for (let i = 0; i < 120 && !got; i++) { got = readdirSync(profile).find(f => /^big(\s\(\d+\))?\.bin$/.test(f) && statSync(join(profile, f)).size === big.length); await sleep(250); }
if (!got) fail('download did not complete');
if (!readFileSync(join(profile, got)).equals(big)) fail('downloaded bytes differ');
console.log('B downloaded and verified', big.length, 'bytes');
// preview the image
await b.eval(`[...document.querySelectorAll('#files li')].find(li => li.textContent.includes('dot.png')).querySelectorAll('button')[1].click(); 1`);
console.log('B preview', await b.until(`(i => i && i.naturalWidth === 2 && 'rendered')(document.querySelector('#files img'))`));
// the pad of the same meeting attaches a file and shows it inline
const p = await Tab.open(ROOT + 'pad/' + url.slice(url.indexOf('#')));
await p.until(`!document.getElementById('editor').readOnly && 'yes'`);
await p.setFiles('#attachfile', [join(profile, 'dot.png')]);
console.log('pad text', JSON.stringify(await p.until(`/!\\[dot.png\\]\\(file:[0-9a-f]{32}\\)/.test(document.getElementById('editor').value) && document.getElementById('editor').value`, 30000)));
console.log('pad image', await p.until(`(i => i && i.naturalWidth === 2 && i.src.startsWith('blob:') && 'rendered')(document.querySelector('#preview img'))`));
if (await a.eval(`document.querySelectorAll('#files li').length`) !== 2) fail('pad attachments live in the pad room, not the files page');
// a video attachment becomes a player in the pad and on the files page (bytes are arbitrary: the element, not playback, is checked)
writeFileSync(join(profile, 'clip.webm'), Buffer.alloc(5000, 7));
await p.setFiles('#attachfile', [join(profile, 'clip.webm')]);
console.log('pad video', await p.until(`(v => v && v.src.startsWith('blob:') && v.controls && 'player')(document.querySelector('#preview video'))`, 30000));
// an editor removes the clip: a second editor's sidebar and text lose it live, the files page of the meeting is untouched
const p2 = await Tab.open(ROOT + 'pad/' + url.slice(url.indexOf('#'))); await p2.until(`!document.getElementById('editor').readOnly && 'yes'`);
await p2.eval(`document.getElementById('filesb').click(); 1`); await p2.until(`document.querySelectorAll('#padfilelist li').length === 2 && 'yes'`, 30000);
await p.eval(`window.confirm = () => true; document.getElementById('filesb').click(); [...document.querySelectorAll('#padfilelist li')].find(li => li.textContent.includes('clip.webm')).querySelector('button.link').click(); 1`);
console.log('removed', await p2.until(`document.querySelectorAll('#padfilelist li').length === 1 && !document.getElementById('editor').value.includes('clip.webm') && !document.querySelector('#preview video') && 'the other editor lost the clip, its reference and its player'`, 30000));
if (await p.eval(`document.getElementById('editor').value.includes('clip.webm')`)) fail('the remover\'s own text should drop the reference');
await a.setFiles('#file', [join(profile, 'clip.webm')]);
await a.until(`document.querySelectorAll('#files li').length === 3 && 'yes'`);
await a.eval(`[...document.querySelectorAll('#files li')].find(li => li.textContent.includes('clip.webm')).querySelectorAll('button')[1].click(); 1`);
console.log('share video', await a.until(`(v => v && v.src.startsWith('blob:') && 'player')(document.querySelector('#files video'))`));
// the view link: lists and downloads, cannot add; a manifest forged with the view keys is not listed anywhere
const Vb = await viewKey(await toolKey(url.split('#')[1], 'share'), 'share'), V = new Uint8Array(Buffer.from(Vb, 'base64url'));
const v = await Tab.open(ROOT + 'share/?view#~' + Vb);
console.log('viewer', await v.until(`document.body.classList.contains('viewing') && document.querySelectorAll('#files li').length === 3 && document.getElementById('hstatus').textContent`));
if (await v.eval(`!document.getElementById('drop').hidden || !!document.getElementById('viewlink')`)) fail('viewer must not be able to add files');
const roomId = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('share:' + Vb))).toString('hex');
const forged = new Store({app: 'share', roomId}, await storeKeys(V, 'share/store'), ROOT.replace(/\/$/, ''));
await forged.put('f'.repeat(32), {name: 'forged.txt', size: 0, type: 'text/plain', chunks: 0});
await sleep(1500);
if (await a.eval(`document.querySelectorAll('#files li').length`) !== 3 || await v.eval(`document.querySelectorAll('#files li').length`) !== 3) fail('an unsigned manifest must not be listed');
await v.call('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: profile});
await v.eval(`[...document.querySelectorAll('#files li')].find(li => li.textContent.includes('dot.png')).querySelector('button').click(); 1`);
let dot; for (let i = 0; i < 40 && !dot; i++) { dot = readdirSync(profile).find(f => /^dot(\s\(\d+\))?\.png$/.test(f)); await sleep(250); }
if (!dot) fail('viewer could not download');
console.log('viewer downloaded', dot);
for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
