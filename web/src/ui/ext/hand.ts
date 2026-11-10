// Raise hand, UI: a toggle button with the count, and a ✋ badge on the tiles of raised hands.
import {Hand} from '../../core/ext/hand.js';
import {t} from '../../core/i18n.js';
import {css, translate, type UiCtx} from '../dom.js';

export class HandUi {
  constructor(private hand: Hand, private ui: UiCtx) {
    css('/ext/hand.css');
    ui.main.insertAdjacentHTML('beforeend', `<button id="handb" data-i18n-aria="raiseHand" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-hand"/></svg><span id="handcount"></span></button>`);
    translate(ui.main);
    document.getElementById('handb')!.onclick = () => hand.toggle();
    hand.onChange = () => this.render();
    this.render();
  }

  private render() {
    const btn = document.getElementById('handb')!, order = this.hand.order();
    btn.ariaPressed = String(this.hand.mine);
    btn.ariaLabel = t(this.hand.mine ? 'lowerHand' : 'raiseHand');
    document.getElementById('handcount')!.textContent = order.length ? String(order.length) : '';
    for (const tile of this.ui.stage.querySelectorAll<HTMLElement>('.tile')) {
      const peer = tile.dataset['peer'] === 'me' ? 'me' : Number(tile.dataset['peer']);
      const pos = order.indexOf(peer);
      tile.classList.toggle('hand', pos >= 0);
      tile.dataset['hand'] = pos >= 0 ? String(pos + 1) : '';
    }
  }
}
