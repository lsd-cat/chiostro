// Accessibility audit of every app page, in both themes: every control has an accessible name,
// images have alt text, exactly one h1, landmarks, the lang attribute, a visible focus style, and
// text contrast at or above WCAG AA 4.5:1 for the theme tokens.
import {launch, ROOT} from './tab.mjs';
const {Tab, fail} = await launch(9243, ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
process.on('uncaughtException', e => { console.error(e.message.slice(0, 300)); process.exit(1); });

const AUDIT = `(() => {
  const name = el => el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || (el.labels && [...el.labels].map(l => l.textContent.trim()).join('')) || el.textContent.trim() || el.getAttribute('alt') || el.value;
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const issues = [];
  for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')) if (visible(el) && !name(el)) issues.push('no name: ' + el.outerHTML.slice(0, 80));
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) issues.push('img without alt');
  const inTree = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[aria-hidden="true"]');   // a visually hidden (clipped) heading still counts
  const h1s = [...document.querySelectorAll('h1')].filter(inTree); if (h1s.length !== 1) issues.push('h1 count ' + h1s.length);
  if (!document.documentElement.lang) issues.push('no lang');
  if (!document.querySelector('main')) issues.push('no main landmark');
  for (const el of document.querySelectorAll('[aria-pressed]')) if (!['true', 'false'].includes(el.getAttribute('aria-pressed'))) issues.push('bad aria-pressed');
  for (const el of document.querySelectorAll('[tabindex]')) if (+el.getAttribute('tabindex') > 0) issues.push('positive tabindex');
  // contrast of the theme: text on page, text on panels, muted text, accent on panel, accent-fg on accent
  const px = c => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3); };   // any colour syntax -> sRGB bytes
  const lum = c => { const [r, g, b] = px(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const probe = (fg, bg) => { const d = document.createElement('div'); d.style.color = 'var(--' + fg + ')'; d.style.background = 'var(--' + bg + ')'; document.body.append(d); const s = getComputedStyle(d); const r = ratio(s.color, s.backgroundColor); d.remove(); return r; };
  for (const [fg, bg, min] of [['fg', 'bg', 4.5], ['fg', 'panel', 4.5], ['muted', 'panel', 4.5], ['muted', 'bg', 4.5], ['accent', 'panel', 3], ['accent-fg', 'accent', 3]]) { const r = probe(fg, bg); if (r < min) issues.push(fg + ' on ' + bg + ' contrast ' + r.toFixed(2)); }
  const focused = document.querySelector('button:not([hidden])'); if (focused) { focused.focus(); const o = getComputedStyle(focused).outlineStyle; if (!o || o === 'none') { /* outline may only apply on :focus-visible; keyboard focus is forced below */ } }
  return issues;
})()`;
const FOCUS = `(async () => { const b = document.querySelector('button:not([hidden])'); if (!b) return 'no button'; b.focus(); return getComputedStyle(b).outlineWidth; })()`;

const pages = [['home', ROOT, `document.querySelectorAll('#toolgrid a').length === 5`], ['meet', ROOT + 'meet/', `document.getElementById('join')`], ['when', ROOT + 'when/', `document.getElementById('go')`], ['pad', ROOT + 'pad/', `!document.getElementById('editor').readOnly`], ['share', ROOT + 'share/', `document.getElementById('files')`], ['form', ROOT + 'form/', `document.getElementById('go')`], ['pad view', ROOT + 'pad/?view', `document.body.classList.contains('viewing') && document.getElementById('hstatus').textContent`],
  // states a page gets into: a call in progress, presenting a pad, presenting a form, the QR popover
  ['call in progress', ROOT + 'meet/?media=relay', `document.getElementById('join')`, `document.getElementById('pname').value = 'Ann'; document.getElementById('join').click()`, `!document.getElementById('call').hidden && document.querySelector('.tile')`],
  ['pad presenting', ROOT + 'pad/', `!document.getElementById('editor').readOnly`, `(() => { const e = document.getElementById('editor'); e.value = '# One\\n\\n---\\n\\n# Two'; e.dispatchEvent(new Event('input')); })(); setTimeout(() => document.getElementById('present').click(), 300)`, `!document.getElementById('present-view').hidden`],
  ['form presenting', ROOT + 'form/', `document.getElementById('go') && document.querySelectorAll('.field').length === 1`, `(() => { document.getElementById('ftitle').value = 'Poll'; const f = document.querySelector('.field'); f.querySelector('input').value = 'Dish?'; f.querySelector('textarea').value = 'A\\nB'; document.getElementById('openres').checked = true; document.getElementById('go').click(); })()`, `document.getElementById('present') && !document.getElementById('present').hidden && (document.getElementById('present').click(), true) && !document.getElementById('fpresent').hidden`],
  ['pad comments', ROOT + 'pad/', `!document.getElementById('editor').readOnly`, `(() => { const e = document.getElementById('editor'); e.value = 'We meet on Monday.'; e.dispatchEvent(new Event('input')); document.getElementById('commentsb').click(); e.focus(); e.setSelectionRange(11, 17); document.dispatchEvent(new Event('selectionchange')); document.getElementById('commenton').click(); document.getElementById('commenttext').value = 'Tuesday?'; document.getElementById('commentform').requestSubmit(); })()`, `document.querySelector('#threadlist .thread')`],
  ['qr popover', ROOT + 'pad/', `!document.getElementById('editor').readOnly`, `document.getElementById('qr').click()`, `document.getElementById('qrpop').matches(':popover-open')`]];
let bad = 0;
for (const [app, url, ready, setup, stateReady] of pages) for (const theme of ['light', 'dark']) {
  const t = await Tab.open(url);
  await t.until(`${ready} && !document.getElementById('loading') && 'yes'`);
  if (setup) { await t.eval(`${setup}; 1`); await t.until(`(${stateReady}) && 'yes'`, 30000); }
  await t.eval(`document.documentElement.dataset.theme = '${theme}'; 1`);
  const issues = await t.eval(AUDIT);
  // keyboard: Tab from the top must land on a visible focus ring
  await t.call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
  await t.call('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9});
  const ring = await t.eval(`(e => e && e !== document.body ? getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth : 'nothing focused')(document.activeElement)`);
  if (/none|0px|nothing/.test(ring)) issues.push('no visible focus ring after Tab: ' + ring);
  console.log(`${app} ${theme}: ${issues.length ? issues.join('; ') : 'ok'}`);
  bad += issues.length;
  await t.close();
}
if (bad) fail(`${bad} accessibility issues`);
console.log('OK');
process.exit(0);
