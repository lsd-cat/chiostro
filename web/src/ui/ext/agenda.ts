// Agenda and timer, UI: a panel with the checklist, an add box, and a shared countdown.
import {pad} from '../../core/time.js';
import {Agenda} from '../../core/ext/agenda.js';
import {t} from '../../core/i18n.js';
import {$, css, translate, type UiCtx} from '../dom.js';

export class AgendaUi {
  constructor(private agenda: Agenda, ui: UiCtx) {
    css('/ext/agenda.css');
    ui.bar.insertAdjacentHTML('beforeend', `<button id="agendab" data-i18n-aria="agenda" aria-pressed="false"><svg class="i" aria-hidden="true"><use href="#i-list"/></svg><span data-i18n="agendaLabel">Agenda</span> <span id="agendatime"></span></button>`);
    ui.stage.insertAdjacentHTML('afterbegin', `
      <section id="agenda" class="panel" hidden data-i18n-aria="agenda">
        <ul id="agendalist"></ul>
        <form id="agendaform" class="row"><input id="agendanew" data-i18n-ph="agendaItem" maxlength="200" required><button type="submit" data-i18n="add">Add</button></form>
        <form id="timerform" class="row"><label><span data-i18n="timerMinutes">Minutes</span> <input id="timermin" type="number" min="1" max="600" value="5" required></label><button type="submit" id="timerstart" data-i18n="start">Start</button><button type="button" id="timerstop" data-i18n="stop" hidden>Stop</button><b id="timerleft" role="timer" aria-live="off"></b></form>
      </section>`);
    translate(ui.stage); translate(ui.bar);
    $('agendab').onclick = () => { $('agenda').hidden = !$('agenda').hidden; $('agendab').ariaPressed = String(!$('agenda').hidden); };
    $<HTMLFormElement>('agendaform').onsubmit = e => { e.preventDefault(); agenda.add($<HTMLInputElement>('agendanew').value.trim()); $<HTMLInputElement>('agendanew').value = ''; };
    $<HTMLFormElement>('timerform').onsubmit = e => { e.preventDefault(); agenda.startTimer(Number($<HTMLInputElement>('timermin').value)); };
    $('timerstop').onclick = () => agenda.stopTimer();
    agenda.onChange = () => this.render();
    window.setInterval(() => this.clock(), 500);
    this.render();
  }

  private render() {
    $('agendalist').replaceChildren(...this.agenda.items.map((it, i) => {
      const li = document.createElement('li'), cb = document.createElement('input'), text = document.createElement('span'), rm = document.createElement('button');
      cb.type = 'checkbox'; cb.checked = it.done; cb.onchange = () => this.agenda.toggle(i);
      text.textContent = it.text; if (it.done) text.className = 'done';
      rm.type = 'button'; rm.textContent = '✕'; rm.ariaLabel = t('remove'); rm.className = 'icon-btn'; rm.onclick = () => this.agenda.remove(i);
      li.append(cb, text, rm);
      return li;
    }));
    const running = !!this.agenda.timerEnd;
    $('timerstart').hidden = running; $('timerstop').hidden = !running;
    this.clock();
  }

  private clock() {
    const end = this.agenda.timerEnd;
    const left = end ? Math.max(0, Math.round((end - Date.now()) / 1000)) : 0;
    const text = end ? `${pad(Math.floor(left / 60))}:${pad(left % 60)}` : '';
    $('timerleft').textContent = text;
    $('agendatime').textContent = text;
    $('agendab').classList.toggle('over', !!end && left === 0);
  }
}
