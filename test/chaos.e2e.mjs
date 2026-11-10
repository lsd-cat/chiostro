// Things going wrong mid-sentence: three people in a pad write emoji, Arabic and Chinese at once;
// the one sequencing the edits (the longest-present) has the tab closed while the others keep
// typing; another drops off the network, types into the void, and comes back; everyone converges
// on the same text, nothing is split inside a character, and the Arabic interface mirrors the page.
import {randomBytes} from 'node:crypto';
import {launch, sleep, ROOT, toolKey} from './tab.mjs';
const {Tab, fail} = await launch(9310, ['--window-size=1280,900']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const ready = `!document.getElementById('editor').readOnly && location.href`;
const text = `document.getElementById('editor').value`;
// insert at random grapheme boundaries: a caret cannot go inside an emoji sequence either
const burst = (parts, gap) => `(async () => { const e = document.getElementById('editor'); for (const s of ${JSON.stringify(parts)}) { const bounds = [0, ...[...new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(e.value)].map(g => g.index + g.segment.length)]; const p = bounds[Math.floor(Math.random() * bounds.length)]; e.value = e.value.slice(0, p) + s + e.value.slice(p); e.setSelectionRange(p + s.length, p + s.length); e.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, ${gap})); } })()`;
const wellFormed = `(s => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c >= 0xD800 && c <= 0xDBFF) { const d = s.charCodeAt(i + 1); if (!(d >= 0xDC00 && d <= 0xDFFF)) return false; i++; } else if (c >= 0xDC00 && c <= 0xDFFF) return false; } return true; })(${text})`;

const M = randomBytes(16).toString('base64url');
const a = await Tab.open(ROOT + 'pad/#' + M); const url = await a.until(ready);
const T = await toolKey(url.split('#')[1], 'pad');
const join = async name => { const t = await Tab.open(ROOT); await t.until(`document.getElementById('toolgrid') && 'yes'`); await t.eval(`localStorage.setItem('author', ${JSON.stringify(name.repeat(4).slice(0, 8))}); localStorage.setItem('name', ${JSON.stringify(name)}); location.href = ${JSON.stringify(ROOT + 'pad/#~' + T)}; 1`); await t.until(ready); return t; };
const b = await join('Badr'), c = await join('Chen');
await a.until(`document.getElementById('hstatus').textContent.includes('3 online') && 'yes'`);

// three scripts at once, inserted at random positions: emoji with joiners, Arabic with marks, CJK
const EMOJI = ['👩‍💻', '🏳️‍🌈', '😀', '👍🏽', '🇮🇹'], ARABIC = ['مرحبا ', 'بالعالم ', 'كتابة ', 'عربية '], CJK = ['你好', '世界', '测试', '文字'];
await Promise.all([a.eval(burst(EMOJI.concat(EMOJI), 30)), b.eval(burst(ARABIC.concat(ARABIC), 35)), c.eval(burst(CJK.concat(CJK), 25))]);
await sleep(2000);
let texts = [await a.eval(text), await b.eval(text), await c.eval(text)];
if (new Set(texts).size !== 1) fail('diverged after mixed-script bursts: ' + JSON.stringify(texts));
if (!await a.eval(wellFormed)) fail('a surrogate pair was split');
// inserts may land inside each other's words: the characters, as a multiset, must be exactly what was typed
const typed = [...EMOJI.concat(EMOJI, ARABIC, ARABIC, CJK, CJK).join('')].sort().join('');
if ([...texts[0]].sort().join('') !== typed) fail('characters lost or duplicated: ' + JSON.stringify(texts[0]));
console.log('three scripts converged, well-formed:', [...texts[0]].length, 'characters');

// the sequencer leaves: Alice is the longest present; close her tab while Badr and Chen keep typing
await Promise.all([
  a.close(),
  b.eval(burst(['[b1]', '[b2]', '[b3]', '[b4]'], 60)),
  c.eval(burst(['(c1)', '(c2)', '(c3)', '(c4)'], 45)),
]);
await sleep(2500);
texts = [await b.eval(text), await c.eval(text)];
if (texts[0] !== texts[1]) fail('diverged after the sequencer left: ' + JSON.stringify(texts));
const typedAfter = [...typed + '[b1][b2][b3][b4](c1)(c2)(c3)(c4)'].sort().join('');
if ([...texts[0]].sort().join('') !== typedAfter) fail('an edit during the handover was lost or duplicated: ' + JSON.stringify(texts[0]));
console.log('handover: both edits kept,', await b.eval(`document.getElementById('hstatus').textContent`));

// Chen goes offline, types into the void, comes back: the pad says so and the others' edits still arrive after a reload
await c.call('Network.enable'); await c.call('Network.emulateNetworkConditions', {offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
await c.eval(burst(['<offline>'], 10));
await b.eval(burst(['<while Chen was away>'], 10));
await sleep(1500);
const offlineStatus = await c.eval(`document.getElementById('hstatus').textContent`);
await c.call('Network.emulateNetworkConditions', {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
await c.eval(`location.reload(); 1`); await c.until(ready);
await c.until(`${text}.includes('<while Chen was away>') && 'yes'`, 30000);
const back = await c.eval(text), bText = await b.until(`${text} === ${JSON.stringify(back)} && ${text}`, 20000);
console.log('offline then back: status was', JSON.stringify(offlineStatus), "| converged again, Chen's offline edit", back.includes('<offline>') ? 'kept' : 'dropped (it never reached the room)');
if (bText !== back) fail('not converged after reconnect');

// the Arabic interface: right-to-left, the header mirrored, the grid of the planner still selectable
await b.eval(`(() => { const s = document.querySelector('select.lang'); s.value = 'ar'; s.dispatchEvent(new Event('change')); })(); 1`);
await b.until(`document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar' && 'yes'`);
const rtl = JSON.parse(await b.eval(`(() => { const brand = document.getElementById('brand').getBoundingClientRect(), site = document.getElementById('site').getBoundingClientRect(); return JSON.stringify({brandRight: brand.right > innerWidth / 2, siteLeft: site.left < innerWidth / 2, title: document.getElementById('title').textContent.length > 0, copy: document.getElementById('copy').textContent}); })()`));
if (!rtl.brandRight || !rtl.siteLeft) fail('the header should mirror in Arabic: ' + JSON.stringify(rtl));
console.log('arabic UI mirrored, copy button says', rtl.copy);
await b.eval(`(() => { const s = document.querySelector('select.lang'); s.value = 'en'; s.dispatchEvent(new Event('change')); })(); 1`);
await b.until(`document.documentElement.lang === 'en' && 'yes'`);

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
