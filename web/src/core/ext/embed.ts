// Embed a web page for everyone, logic: one shared URL at a time, consent per participant,
// owner closes. Only https URLs (http on localhost); the UI shows the origin before anyone accepts.
import type {Core} from '../ext.js';

export type Embed = {id: string; url: string; owner: number | 'me'};

export class Embeds {
  current: Embed | null = null;           // what this participant has accepted and is showing
  onChange?: () => void;
  onOffer?: (e: Embed) => void;

  constructor(private core: Core) {
    const {sig} = core;
    sig.on('embed', (id, m) => { const url = Embeds.clean(m.url); if (url) this.onOffer?.({id: String(m.id), url, owner: id}); });
    sig.on('embed-close', (id, m) => { if (this.current && m.id === this.current.id && id === this.current.owner) { this.current = null; this.onChange?.(); } });
    core.sync.register('embed', {
      get: () => { const e = this.current; return e && {id: e.id, url: e.url, owner: core.sync.idOf(e.owner)}; },
      set: v => { const e = v as Embed | null; if (e && Embeds.clean(e.url)) this.onOffer?.(e); },
    });
  }

  static clean(raw: unknown): string | null {
    try { const u = new URL(String(raw)); return (u.protocol === 'https:' || (u.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(u.hostname))) && u.href.length <= 2000 ? u.href : null; } catch { return null; }   // plain http only for a local dev server
  }

  share(url: string): boolean {
    const clean = Embeds.clean(url);
    if (!clean) return false;
    this.close();
    this.current = {id: crypto.randomUUID(), url: clean, owner: 'me'};
    this.core.sig.send('*', {t: 'embed', id: this.current.id, url: clean});
    this.onChange?.();
    return true;
  }

  accept(e: Embed) { this.current = e; this.onChange?.(); }

  /** Owner: close for everyone. Others: close locally. */
  close() {
    const e = this.current;
    if (!e) return;
    if (e.owner === 'me') this.core.sig.send('*', {t: 'embed-close', id: e.id});
    this.current = null;
    this.onChange?.();
  }
}
