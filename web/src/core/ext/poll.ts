// Polls, logic: one poll at a time, created by anyone, closed by its owner. Everyone sees the
// tally; who voted what stays in memory only to count once per peer.
import type {Core} from '../ext.js';

export type Poll = {id: string; owner: number | 'me'; question: string; options: string[]; votes: Map<number | 'me', number>; closed: boolean; dismissed?: boolean};

export class Polls {
  current: Poll | null = null;
  onChange?: () => void;

  constructor(private core: Core) {
    const {sig} = core;
    sig.on('poll', (id, m) => {
      const options = Array.isArray(m.options) ? (m.options as unknown[]).map(o => String(o).slice(0, 80)).slice(0, 10) : [];
      if (options.length < 2) return;
      this.current = {id: String(m.id), owner: id, question: String(m.question).slice(0, 200), options, votes: new Map(), closed: false};
      this.onChange?.();
    });
    sig.on('vote', (id, m) => { const p = this.current; if (p && m.id === p.id && !p.closed && Number.isInteger(m.choice) && Number(m.choice) < p.options.length) { p.votes.set(id, Number(m.choice)); this.onChange?.(); } });
    sig.on('poll-close', (id, m) => { const p = this.current; if (p && m.id === p.id && id === p.owner) { p.closed = true; this.onChange?.(); } });
    core.sync.register('poll', {
      get: () => { const p = this.current; return p && {...p, dismissed: false, owner: core.sync.idOf(p.owner), votes: [...p.votes].map(([id, c]) => [core.sync.idOf(id), c])}; },
      set: v => { const p = v as (Omit<Poll, 'votes'> & {votes: [number, number][]}) | null; this.current = p && {...p, votes: new Map(p.votes)}; this.onChange?.(); },
    });
  }

  create(question: string, options: string[]) {
    const id = crypto.randomUUID();
    this.current = {id, owner: 'me', question, options, votes: new Map(), closed: false};
    this.core.sig.send('*', {t: 'poll', id, question, options});
    this.onChange?.();
  }

  vote(choice: number) {
    const p = this.current;
    if (!p || p.closed) return;
    p.votes.set('me', choice);
    this.core.sig.send('*', {t: 'vote', id: p.id, choice});
    this.onChange?.();
  }

  close() {
    const p = this.current;
    if (!p || p.owner !== 'me') return;
    p.closed = true;
    this.core.sig.send('*', {t: 'poll-close', id: p.id});
    this.onChange?.();
  }

  /** Hide a closed poll locally; it stays in memory so a newcomer syncing from us still gets it. */
  dismiss() { if (this.current?.closed) { this.current.dismissed = true; this.onChange?.(); } }

  tally(): number[] { const p = this.current; const n = p ? p.options.map(() => 0) : []; if (p) for (const c of p.votes.values()) n[c]!++; return n; }
}
