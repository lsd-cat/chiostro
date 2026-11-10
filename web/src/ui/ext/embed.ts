// Embed a web page, UI: URL form, consent bar naming the origin, a sandboxed iframe with the URL
// and a warning above it. The page is someone else's: not encrypted, and it sees your IP.
import {Embeds, type Embed} from '../../core/ext/embed.js';
import {t} from '../../core/i18n.js';
import {$, css, translate, type UiCtx} from '../dom.js';

export class EmbedUi {
  constructor(private embeds: Embeds, private ui: UiCtx) {
    css('/ext/embed.css');
    ui.bar.insertAdjacentHTML('beforeend', `<button id="embedb" data-i18n-aria="embed" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-globe"/></svg><span data-i18n="embedLabel">Page</span></button>`);
    ui.stage.insertAdjacentHTML('afterbegin', `
      <form id="embedform" class="panel" hidden><div class="row"><input id="embedurl" type="url" data-i18n-ph="embedUrl" required><button type="submit" data-i18n="embedShare">Share</button><button type="button" id="embedcancel" data-i18n="cancel">Cancel</button></div><small data-i18n="embedWarn"></small></form>
      <div id="embedask" class="panel" hidden role="alert"><span id="embedask-text"></span><div class="row"><button id="embedyes" data-i18n="open">Open</button><button id="embedno" data-i18n="decline">Decline</button></div></div>
      <section id="embed" hidden data-i18n-aria="embedLabel"><div id="embedbar"><span id="embedlink"></span><a id="embedopen" target="_blank" rel="noopener noreferrer" data-i18n="openTab">Open in a new tab</a><button id="embedclose" data-i18n-aria="closeEmbed"><span aria-hidden="true">✕</span></button></div><small id="embednote"><span data-i18n="embedWarn"></span> <span data-i18n="embedBlank"></span></small><div id="embedview"></div></section>`);
    translate(ui.stage); translate(ui.bar);
    $('embedb').onclick = () => { $('embedform').hidden = !$('embedform').hidden; if (!$('embedform').hidden) $('embedurl').focus(); };
    $('embedcancel').onclick = () => { $('embedform').hidden = true; };
    $<HTMLFormElement>('embedform').onsubmit = e => { e.preventDefault(); if (embeds.share($<HTMLInputElement>('embedurl').value)) { $('embedform').hidden = true; } else $('embedurl').setAttribute('aria-invalid', 'true'); };
    $('embedno').onclick = () => { $('embedask').hidden = true; };
    $('embedclose').onclick = () => embeds.close();
    embeds.onOffer = o => this.ask(o);
    embeds.onChange = () => this.render();
  }

  private ask(o: Embed) {
    const origin = new URL(o.url).origin;
    $('embedask-text').textContent = t('wantsToEmbed', {who: this.ui.roster.nameOf(o.owner as number), origin});
    $('embedask').hidden = false;
    $('embedyes').onclick = () => { $('embedask').hidden = true; this.embeds.accept(o); };
    $('embedyes').focus();
  }

  private render() {
    const e = this.embeds.current;
    $('embed').hidden = !e;
    $('embedb').ariaPressed = String(!!e);
    if (!e) { $('embedview').replaceChildren(); return; }
    $('embedlink').textContent = e.url;
    $<HTMLAnchorElement>('embedopen').href = e.url;
    const frame = document.createElement('iframe');
    frame.title = new URL(e.url).origin;
    frame.referrerPolicy = 'no-referrer';
    // Isolated: may run its own scripts and forms, may not touch this page, open popups, or use devices.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    frame.src = e.url;
    $('embedview').replaceChildren(frame);
  }
}
