// PDF sharing, UI: consent bar, panel, native viewer in an iframe, keys, full screen.
// Native viewers ignore fragment-only changes (Chrome) or rewrite their own hash while the user
// scrolls (Firefox), so each page turn is a fresh document: new object URL, new iframe. Brief flash.
import {PdfShare, type PdfOffer} from '../../core/ext/pdf.js';
import {t} from '../../core/i18n.js';
import {$, css, translate, type UiCtx} from '../dom.js';

export class PdfUi {
  private url?: string;
  private shown?: {id: string; page: number; fit: boolean};   // what the frame currently shows

  constructor(private pdf: PdfShare, private ui: UiCtx) {
    css('/ext/pdf.css');
    ui.bar.insertAdjacentHTML('beforeend', `<button id="pdfb" data-i18n-aria="sharePdf"><svg class="i" aria-hidden="true"><use href="#i-file"/></svg><span data-i18n="pdf">PDF</span></button><input id="pdffile" type="file" accept="application/pdf" hidden>`);
    ui.stage.insertAdjacentHTML('afterbegin', `
      <div id="pdfask" hidden role="alert"><span id="pdfask-text"></span><button id="pdfyes" data-i18n="accept">Accept</button><button id="pdfno" data-i18n="decline">Decline</button></div>
      <section id="pdf" hidden data-i18n-aria="sharedPdf">
        <div id="pdfbar">
          <span id="pdfname"></span>
          <button id="pdfprev" data-i18n-aria="prevPage"><span aria-hidden="true">◀</span></button><span id="pdfpage" role="status" aria-live="polite">1</span><button id="pdfnext" data-i18n-aria="nextPage"><span aria-hidden="true">▶</span></button>
          <button id="pdffull" data-i18n-aria="fullScreen"><span aria-hidden="true">⛶</span></button><button id="pdfclose" data-i18n-aria="closePdf"><span aria-hidden="true">✕</span></button>
        </div>
        <div id="pdfview"></div>
      </section>`);
    translate(ui.stage); translate(ui.bar);
    $('pdfb').onclick = () => $('pdffile').click();
    $<HTMLInputElement>('pdffile').onchange = async () => {
      const input = $<HTMLInputElement>('pdffile'), file = input.files?.[0];
      input.value = '';
      if (file && !(await pdf.share(file))) alert(t('pdfTooLarge'));
    };
    $('pdfprev').onclick = () => pdf.gotoPage(pdf.state!.page - 1);
    $('pdfnext').onclick = () => pdf.gotoPage(pdf.state!.page + 1);
    $('pdffull').onclick = () => $('pdf').requestFullscreen();
    $('pdfclose').onclick = () => pdf.close();
    $('pdfno').onclick = () => { $('pdfask').hidden = true; };
    document.addEventListener('fullscreenchange', () => this.render(true));
    // Presenter keys. Only reach us while the page, not the viewer iframe, has focus.
    document.addEventListener('keydown', e => {
      if (!pdf.state?.mine || (e.target as HTMLElement).matches('input')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); pdf.gotoPage(pdf.state.page + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); pdf.gotoPage(pdf.state.page - 1); }
    });
    pdf.onChange = () => this.render();
    pdf.onOffer = o => this.ask(o);
    pdf.onProgress = (name, pct) => { $('pdfask-text').textContent = t('receiving', {name, pct}); $('pdfyes').hidden = $('pdfno').hidden = true; $('pdfask').hidden = pct >= 100; };
  }

  private ask(o: PdfOffer) {
    $('pdfask-text').textContent = t('wantsToShare', {who: this.ui.roster.nameOf(o.from), name: o.name, size: (o.size / 1e6).toFixed(1)});
    $('pdfyes').hidden = $('pdfno').hidden = false;
    $('pdfask').hidden = false;
    $('pdfyes').onclick = () => this.pdf.accept(o);
    $('pdfyes').focus();
  }
  private render(force = false) {
    const s = this.pdf.state;
    $('pdf').hidden = !s;
    if (!s) {
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = undefined; this.shown = undefined;
      $('pdfview').replaceChildren();
      this.ui.bus.emit('pdf:view', {page: 0, container: null});
      return;
    }
    $('pdfname').textContent = s.name;
    $('pdfpage').textContent = String(s.page);
    $('pdfprev').hidden = $('pdfnext').hidden = !s.mine;
    const fit = this.pdf.fit || !!document.fullscreenElement;
    if (!force && this.shown && this.shown.id === s.id && this.shown.page === s.page && this.shown.fit === fit) return;
    this.shown = {id: s.id, page: s.page, fit};
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(s.blob);
    // Mobile Chromium has no inline PDF viewer: an iframe would freeze or download. Offer a link instead.
    if (navigator.pdfViewerEnabled === false) {
      $('pdfview').replaceChildren(Object.assign(document.createElement('a'), {id: 'pdfopen', href: this.url, download: s.name, textContent: t('openPdf', {page: s.page})}));
    } else {
      const frame = Object.assign(document.createElement('iframe'), {id: 'pdfframe', title: 'PDF'});
      frame.src = `${this.url}#page=${s.page}${fit ? '&zoom=page-fit&view=Fit' : ''}`;   // pdf.js / Chrome spellings
      $('pdfview').replaceChildren(frame);
    }
    if (s.mine) $('pdfnext').focus();   // keep keys with the page
    this.ui.bus.emit('pdf:view', {page: s.page, container: $('pdfview')});
  }
}
