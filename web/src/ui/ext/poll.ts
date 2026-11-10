// Polls, UI: a form to create one, the live tally with vote buttons, close for the owner.
import {Polls} from '../../core/ext/poll.js';
import {t} from '../../core/i18n.js';
import {$, css, translate, type UiCtx} from '../dom.js';

export class PollUi {
  constructor(private polls: Polls, ui: UiCtx) {
    css('/ext/poll.css');
    ui.bar.insertAdjacentHTML('beforeend', `<button id="pollb" data-i18n-aria="poll" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-chart"/></svg><span data-i18n="pollLabel">Poll</span></button>`);
    ui.stage.insertAdjacentHTML('afterbegin', `
      <form id="pollform" class="panel" hidden>
        <input id="pollq" data-i18n-ph="pollQuestion" maxlength="200" required>
        <textarea id="pollopts" rows="3" data-i18n-ph="pollOptions" required></textarea>
        <div class="row"><button type="submit" data-i18n="pollStart">Start</button><button type="button" id="pollcancel" data-i18n="cancel">Cancel</button></div>
      </form>
      <section id="poll" class="panel" hidden data-i18n-aria="pollLabel"><b id="pollquestion"></b><div id="polloptions"></div><div class="row"><small id="pollvotes"></small><button id="pollclose" data-i18n="closePoll">Close poll</button><button id="polldismiss" data-i18n="dismiss" hidden>Dismiss</button></div></section>`);
    translate(ui.stage); translate(ui.bar);
    $('pollb').onclick = () => { $('pollform').hidden = !$('pollform').hidden; if (!$('pollform').hidden) $('pollq').focus(); };
    $('pollcancel').onclick = () => { $('pollform').hidden = true; };
    $<HTMLFormElement>('pollform').onsubmit = e => {
      e.preventDefault();
      const options = $<HTMLTextAreaElement>('pollopts').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 10);
      if (options.length < 2) return;
      polls.create($<HTMLInputElement>('pollq').value.trim(), options);
      $('pollform').hidden = true; $<HTMLFormElement>('pollform').reset();
    };
    $('pollclose').onclick = () => polls.close();
    $('polldismiss').onclick = () => polls.dismiss();
    polls.onChange = () => this.render();
  }

  private render() {
    const p = this.polls.current, tally = this.polls.tally(), total = tally.reduce((a, b) => a + b, 0);
    $('poll').hidden = !p || !!p.dismissed;
    if (!p) return;
    $('pollquestion').textContent = p.question + (p.closed ? ' · ' + t('closed') : '');
    const mine = p.votes.get('me');
    $('polloptions').replaceChildren(...p.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.disabled = p.closed; b.ariaPressed = String(mine === i); b.className = 'option';
      b.style.setProperty('--pct', `${total ? Math.round(100 * tally[i]! / total) : 0}%`);
      b.append(Object.assign(document.createElement('span'), {textContent: o}), Object.assign(document.createElement('b'), {textContent: String(tally[i])}));
      b.onclick = () => this.polls.vote(i);
      return b;
    }));
    $('pollvotes').textContent = t('votes', {n: total});
    $('pollclose').hidden = p.owner !== 'me' || p.closed;
    $('polldismiss').hidden = !p.closed;
  }
}
