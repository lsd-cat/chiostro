// The landing page: five tool cards, every one carrying the same fresh meeting key.
import {launch, ROOT} from './tab.mjs';
const {Tab, fail} = await launch(9245);
const t = await Tab.open(ROOT);
const links = JSON.parse(await t.until(`document.querySelectorAll('#toolgrid a').length === 5 && JSON.stringify([...document.querySelectorAll('#toolgrid a')].map(a => a.getAttribute('href')))`));
{ const cfg = await (await fetch(ROOT + 'config.json')).json();   // the optional landing elements follow the served config: shown with a value, hidden without
  const shown = await t.eval(`JSON.stringify({logo: !document.getElementById('homelogo').hidden && document.getElementById('homelogo').naturalWidth > 0, intro: !document.getElementById('intro').hidden, links: !document.getElementById('homelinks').hidden})`);
  const want = JSON.stringify({logo: !!cfg.logo, intro: !!cfg.intro, links: !!(cfg.links && cfg.links.length)});
  if (shown !== want) throw new Error(`landing extras ${shown} should follow config.json ${want}`); }
const keys = new Set(links.map(l => l.split('#')[1]));
if (keys.size !== 1 || ![...keys][0] || !links.includes('/pad/#' + [...keys][0])) fail('cards must share one key: ' + links);
if (await t.eval(`document.getElementById('nav').querySelectorAll('a[aria-current]').length`) !== 0) fail('no tool is current on the landing page');
if (t.violations.length) fail(JSON.stringify(t.violations));
console.log('OK landing page', links[0]);
process.exit(0);
