// One meeting through every tool, in headless Chrome: the landing page hands out one key; the
// plan links the call; a form is built, then embedded in the pad next to the plan and answered
// from inside the pad; the owner sees that answer; the pad's theme and attachment render; the
// pad's read-only link is shown inside a call by the Page tool; the files page shares the key.
// Needs OpenResty running (openresty -p openresty -c nginx.conf) and Chrome; no npm deps.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {launch, sleep, ROOT, toolKey, viewKey} from './tab.mjs';
const {Tab, profile, fail} = await launch(9281, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); for (const t of Tab.all) console.error('tab:', t.violations); process.exit(1); });
const click = id => `document.getElementById('${id}').click(); 1`;
const nav = `[...document.querySelectorAll('#nav a')].map(a => a.getAttribute('href'))`;

// 1. landing page: every tool card carries the same fresh key, and so does the header everywhere
const home = await Tab.open(ROOT); await home.until(`document.querySelectorAll('#toolgrid a').length === 5 && 'yes'`);
const cards = await home.eval(`[...document.querySelectorAll('#toolgrid a')].map(a => a.getAttribute('href'))`);
const K = cards[0].split('#')[1];
if (!/^[\w-]{22}$/.test(K) || !cards.every(h => h.endsWith('#' + K))) fail('landing cards should share one key: ' + cards.join(' '));
console.log('key', K, 'cards', cards.join(' '));
await home.close();
const sameKey = async (t, who) => { const links = await t.eval(nav); if (!links.every(h => h.endsWith('#' + K))) fail(`${who}: header links lost the key: ${links}`); };

// 2. plan: an event in this meeting; its header links the call and the pad of the same meeting
const when = await Tab.open(ROOT + 'when/#' + K);
await when.until(`!document.getElementById('create').hidden && document.querySelectorAll('#days button').length > 20`);
await when.eval(`(() => { const d = [...document.querySelectorAll('#days button')]; const ev = (el, type) => el.dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1})); ev(d[0], 'pointerdown'); ev(window, 'pointerup'); ev(d[1], 'pointerdown'); ev(window, 'pointerup'); document.getElementById('ename').value = 'Sync'; document.getElementById('go').click(); })()`);
await when.until(`!document.getElementById('event').hidden && document.querySelectorAll('#editor .cell').length > 0 && 'yes'`);
await sameKey(when, 'plan');
console.log('plan links', await when.eval(nav));

// 3. form: built by the owner (the owner link adds a private key after a dot, the meeting key stays)
const form = await Tab.open(ROOT + 'form/#' + K);
await form.until(`document.getElementById('go') && !document.getElementById('build').hidden && document.querySelectorAll('.field').length === 1 && 'yes'`);
await form.eval(`(() => { document.getElementById('ftitle').value = 'Vote'; const f = document.querySelector('.field'); f.querySelector('input').value = 'Dish?'; f.querySelector('textarea').value = 'Pizza\\nPasta'; document.getElementById('go').click(); })()`);
const ownerUrl = await form.until(`document.getElementById('questions')?.children.length === 1 && location.href`);
const T = Object.fromEntries(await Promise.all(['form', 'when', 'pad', 'share'].map(async a => [a, await toolKey(K, a)])));
if (!ownerUrl.includes('#~' + T.form + '.')) fail('owner link should be the form\'s own link plus the private key: ' + ownerUrl);
console.log('form owner', ownerUrl);

// 4. pad: theme, the plan and the form embedded from markdown, an attached image
writeFileSync(join(profile, 'dot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4AWP4z8DwHwyBNIgDAEzeB/3dPz+0AAAAAElFTkSuQmCC', 'base64'));
const pad = await Tab.open(ROOT + 'pad/#' + K);
await pad.until(`!document.getElementById('editor').readOnly && 'yes'`);
await sameKey(pad, 'pad');
await pad.eval(`(() => { const e = document.getElementById('editor'); e.value = '---\\naccent: #00aa55\\n---\\n# Sync\\n\\n![Vote](/form/#${K})\\n\\n![When](/when/#${K})\\n'; e.dispatchEvent(new Event('input')); })(); 1`);
console.log('pad title', await pad.until(`document.querySelector('#preview h2')?.textContent === 'Sync' && document.title`));
console.log('pad theme', await pad.until(`document.getElementById('preview').style.getPropertyValue('--accent') === '#00aa55' && 'accent applied'`));
const frames = `[...document.querySelectorAll('#preview iframe.embed')]`;
console.log('pad embeds', await pad.until(`(f => f.length === 2 && f.every(x => parseInt(x.style.height) > 120) && f.map(x => x.src.replace(location.origin, '')).join(' '))(${frames})`, 30000));
// the meeting links typed into the pad were swapped for each tool's own link before anyone else saw them
if (!await pad.eval(`${frames}.map(f => f.src).join(' ')`).then(u => u.includes('/form/?embed#~' + T.form) && u.includes('/when/?embed#~' + T.when))) fail('embeds must carry tool links, not the meeting secret');
if (await pad.eval(`document.getElementById('editor').value.includes(${JSON.stringify(K)})`)) fail('the meeting secret must not be in the pad text');
await pad.setFiles('#attachfile', [join(profile, 'dot.png')]);
console.log('pad image', await pad.until(`(i => i && i.naturalWidth === 2 && i.src.startsWith('blob:') && 'rendered from the pad room')(document.querySelector('#preview img'))`, 30000));

// the link as a QR code: a tool link ("~" + the pad's own secret), drawn on open, decoded by the browser's own detector where it has one
const toolUrl = ROOT + 'pad/#~' + await toolKey(K, 'pad');
await pad.eval(click('qr'));
console.log('qr', await pad.until(`(c => c && c.width > 100 && document.getElementById('qrtext').textContent === ${JSON.stringify(toolUrl)} && 'drawn, ' + c.width + 'px, a tool link')(document.getElementById('qrcanvas'))`));
if (await pad.eval(`'BarcodeDetector' in window`)) {
  const decoded = await pad.eval(`new BarcodeDetector({formats: ['qr_code']}).detect(document.getElementById('qrcanvas')).then(r => r[0]?.rawValue ?? 'none', e => 'error ' + e.message)`);
  console.log('qr decodes to', decoded);
  if (decoded !== toolUrl && !decoded.startsWith('error')) fail('QR should decode to the tool link');
} else console.log('no BarcodeDetector in this Chrome, decode skipped');
await pad.eval(`document.getElementById('qrpop').hidePopover(); 1`);
const alone = await Tab.open(toolUrl); await alone.until(`!document.getElementById('editor').readOnly && 'yes'`);
console.log('tool link', await alone.eval(`document.getElementById('nav').hidden && document.querySelector('#preview h2')?.textContent === 'Sync' && 'opens the same pad, no navigation to the rest'`));
if (!await alone.eval(`document.getElementById('nav').hidden`)) fail('a tool link must not expose the meeting');
await alone.close();

// 5. the form is answered from inside the pad; the owner's page counts it
await pad.until(`(d => d && d.querySelector('input[name="q0"][value="Pasta"]') && 'yes')(${frames}[0].contentDocument)`, 20000);
await pad.eval(`(d => { d.querySelector('input[name="q0"][value="Pasta"]').checked = true; d.getElementById('answer').requestSubmit(); })(${frames}[0].contentDocument); 1`);
console.log('answered in the pad', await pad.until(`(d => d.getElementById('sent').textContent.length > 0 && d.getElementById('sent').textContent)(${frames}[0].contentDocument)`));
console.log('owner sees it', await form.until(`document.getElementById('rcount').textContent.includes('1 answer') && [...document.querySelectorAll('.tally b')].map(b => b.textContent).join('/')`));
if (await form.eval(`[...document.querySelectorAll('.tally b')].map(b => b.textContent).join('/')`) !== 'Dish?/0/1') fail('tally should be 0 Pizza, 1 Pasta');

// 6. the pad's read-only link, derived from the meeting key, renders the same page (embeds included) for a viewer
const V = await viewKey(await toolKey(K, 'pad'), 'pad');
await pad.until(`document.getElementById('hstatus').textContent.endsWith('Saved') && 'yes'`, 30000);
const viewUrl = ROOT + 'pad/?view#~' + V;
const viewer = await Tab.open(viewUrl);
console.log('viewer', await viewer.until(`document.body.classList.contains('viewing') && document.querySelector('#preview h2')?.textContent === 'Sync' && document.querySelectorAll('#preview iframe.embed').length === 2 && document.querySelector('#preview img') && 'page, embeds and image'`, 30000));
if (await viewer.eval(`!document.getElementById('editor').readOnly`)) fail('a viewer must not edit');
await viewer.close();

// 7. call: two people join with the meeting key; the Page tool shows the pad's read-only link on the stage
const callReady = `location.hash.length > 1 && document.getElementById('join')?.onclick && location.href`;
const a = await Tab.open(ROOT + 'meet/?media=relay#' + K); await a.until(callReady);
const b = await Tab.open(ROOT + 'meet/?media=relay#' + K); await b.until(callReady);
await sameKey(a, 'call');
for (const [t, name] of [[a, 'Alice'], [b, 'Bob']]) await t.eval(`document.getElementById('pname').value = '${name}'; ${click('join')}`);
console.log('call', await b.until(`document.querySelectorAll('.tile').length === 2 && document.getElementById('status').textContent`, 30000));
if (await a.eval(`!!document.getElementById('embedb')`)) {
  await a.eval(`document.getElementById('embedb').click(); document.getElementById('embedurl').value = ${JSON.stringify(viewUrl)}; document.getElementById('embedform').requestSubmit(); 1`);
  await b.until(`!document.getElementById('embedask').hidden && 'yes'`); await b.eval(click('embedyes'));
  console.log('pad in the call', await b.until(`(f => f && f.contentDocument?.querySelector('#preview h2')?.textContent === 'Sync' && f.contentDocument.body.classList.contains('viewing') && 'rendered read-only on the stage')(document.querySelector('#embedview iframe'))`, 30000));
  if (await b.eval(`document.querySelectorAll('#tiles .tile').length !== 2`)) fail('tiles should stay as a strip beside the page');
} else console.log('page tool disabled here, skipped');

// 8. files: the same key opens this meeting's files page; a file added there is listed live
const share = await Tab.open(ROOT + 'share/#' + K);
await share.until(`document.getElementById('files') && !document.getElementById('file').disabled && 'yes'`);
await sameKey(share, 'files');
await share.setFiles('#file', [join(profile, 'dot.png')]);
console.log('files', await share.until(`document.querySelectorAll('#files li').length === 1 && document.getElementById('files').textContent`, 30000));

for (const t of Tab.all) if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK, no CSP violations or errors');
process.exit(0);
