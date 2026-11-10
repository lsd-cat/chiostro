// The landing page: five tool cards, every one carrying the same fresh meeting key.
import {launch, ROOT} from './tab.mjs';
const {Tab, fail} = await launch(9245);
const t = await Tab.open(ROOT);
const links = JSON.parse(await t.until(`document.querySelectorAll('#toolgrid a').length === 5 && JSON.stringify([...document.querySelectorAll('#toolgrid a')].map(a => a.getAttribute('href')))`));
if (await t.eval(`!document.getElementById('homelogo').hidden || !document.getElementById('intro').hidden || !document.getElementById('homelinks').hidden`)) throw new Error('logo, intro and links stay hidden when config.json sets none');
const keys = new Set(links.map(l => l.split('#')[1]));
if (keys.size !== 1 || ![...keys][0] || !links.includes('/pad/#' + [...keys][0])) fail('cards must share one key: ' + links);
if (await t.eval(`document.getElementById('nav').querySelectorAll('a[aria-current]').length`) !== 0) fail('no tool is current on the landing page');
if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK landing page', links[0]);
process.exit(0);
