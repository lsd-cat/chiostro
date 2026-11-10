// The landing page: what the tools are, and one fresh meeting key that opens each of them.
import {t} from '../../core/i18n.js';
import {start, config, linkTo} from '../shell.js';
import {$, el, css, icon} from '../dom.js';

const ICONS: Record<string, string> = {meet: 'phone', when: 'calendar', pad: 'doc', share: 'clip', form: 'inbox'};
css('/css/home.css');
start();
$('toolbar').hidden = true;   // nothing to copy or renew here: the cards carry the key
$('brand').hidden = true;     // the page's own heading is the one h1
$('tagline').textContent = config.tagline || t('homeTagline');
$('homename').textContent = config.name;
for (const app of config.apps) {
  const card = el('a', undefined, 'tool'); card.href = linkTo(app);
  const disc = el('span', undefined, 'icon'); disc.append(icon(ICONS[app] ?? 'doc'));
  card.append(disc, el('b', t('app_' + app)), el('span', t('desc_' + app)));
  $('toolgrid').append(card);
}
$('keynote').textContent = t('homeKey');
if (config.logo) { const logo = $<HTMLImageElement>('homelogo'); logo.src = config.logo; logo.hidden = false; }
if (config.intro) { $('intro').textContent = config.intro; $('intro').hidden = false; }
if (config.links.length) { $('homelinks').append(...config.links.map(l => { const a = el('a', l.label); a.href = l.url; if (!l.url.startsWith('/')) a.rel = 'noopener'; return a; })); $('homelinks').hidden = false; }
