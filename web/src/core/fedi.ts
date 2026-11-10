// Fediverse objects as cards: a public post, video or event, fetched by an editor's browser from
// the instance's public JSON (CORS allows it on Mastodon, PeerTube, Mobilizon and Gancio), then
// sealed into the pad's room as a snapshot everyone else renders. No DOM here: HTML content from
// the instance is reduced to text, which the UI sets with textContent.
export type Card = {kind: 'post' | 'video' | 'event' | 'profile'; title: string; text: string; by?: string; at?: string; end?: string; place?: string; url: string; platform: string};
export type Source = {platform: 'mastodon' | 'peertube' | 'mobilizon' | 'gancio'; api: string; url: string};

/** Which platform a public URL belongs to, by its shape, and where its JSON is. */
export function recognise(url: string): Source | null {
  let u: URL; try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && u.hostname === '127.0.0.1')) return null;   // plain http only for local tests
  const o = u.origin, p = u.pathname;
  let m: RegExpMatchArray | null;
  if ((m = /^\/@[\w.-]+\/(\d+)$/.exec(p)) || (m = /^\/users\/[\w.-]+\/statuses\/(\d+)$/.exec(p))) return {platform: 'mastodon', api: `${o}/api/v1/statuses/${m[1]}`, url};
  if ((m = /^\/@([\w.-]+(?:@[\w.-]+)?)\/?$/.exec(p))) return {platform: 'mastodon', api: `${o}/api/v1/accounts/lookup?acct=${encodeURIComponent(m[1]!)}`, url};   // a profile, local or remote to that instance
  if ((m = /^\/(?:w|videos\/watch)\/([\w-]+)$/.exec(p))) return {platform: 'peertube', api: `${o}/api/v1/videos/${m[1]}`, url};
  if (/^\/events\/[0-9a-f-]{36}$/.test(p)) return {platform: 'mobilizon', api: `${o}${p}`, url};
  if ((m = /^\/event\/([\w-]+)$/.exec(p))) return {platform: 'gancio', api: `${o}/api/event/detail/${m[1]}`, url};
  return null;
}

/** The instance's HTML reduced to plain text: tags dropped, paragraphs and breaks kept, entities decoded. */
export function htmlToText(html: string): string {
  return html.replace(/<\s*\/?\s*(p|div|br|li|h\d)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, m => ({'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' '})[m]!).replace(/\n{3,}/g, '\n\n').trim();
}
const str = (x: unknown, max = 4000) => typeof x === 'string' ? x.slice(0, max) : '';

/** One card from the platform's JSON; null if the shape is not what the platform publishes. */
export function toCard(src: Source, json: unknown): Card | null {
  const j = json as Record<string, any>;
  if (!j || typeof j !== 'object') return null;
  const base = {url: src.url, platform: src.platform};
  switch (src.platform) {
    case 'mastodon':
      if (typeof j['content'] !== 'string' && typeof j['acct'] === 'string') return {...base, kind: 'profile', title: str(j['display_name']) || str(j['acct']), by: '@' + str(j['acct'], 100), text: htmlToText(str(j['note'])), at: str(j['created_at'], 40)};
      if (typeof j['content'] !== 'string') return null;
      return {...base, kind: 'post', title: str(j['account']?.['display_name']) || str(j['account']?.['acct']), by: '@' + str(j['account']?.['acct'], 100), text: htmlToText(j['content']), at: str(j['created_at'], 40)};
    case 'peertube': if (typeof j['name'] !== 'string') return null;
      return {...base, kind: 'video', title: str(j['name'], 300), by: str(j['channel']?.['displayName'] || j['account']?.['displayName'], 100), text: str(j['description']), at: str(j['publishedAt'], 40)};
    case 'gancio': {   // Gancio's own API: title, html description, unix seconds, a place with name and address
      if (typeof j['title'] !== 'string' || typeof j['start_datetime'] !== 'number') return null;
      const iso = (t: unknown) => typeof t === 'number' && t > 0 ? new Date(t * 1000).toISOString() : '';
      const place = [j['place']?.['name'], j['place']?.['address']].filter((x): x is string => typeof x === 'string' && !!x);
      return {...base, kind: 'event', title: str(j['title'], 300), text: htmlToText(str(j['description'] || j['plain_description'])), at: iso(j['start_datetime']), end: iso(j['end_datetime']) || undefined,
        place: [...new Set(place)].join(', ').slice(0, 200) || undefined};
    }
    case 'mobilizon': if (j['type'] !== 'Event' || typeof j['name'] !== 'string') return null;
      return {...base, kind: 'event', title: str(j['name'], 300), text: htmlToText(str(j['content'] || j['summary'])), at: str(j['startTime'], 40), end: str(j['endTime'], 40),
        place: [j['location']?.['name'], j['location']?.['address']].map(x => typeof x === 'string' ? x : typeof x === 'object' && x ? Object.values(x).filter(v => typeof v === 'string').join(', ') : '').filter(Boolean).join(', ').slice(0, 200) || undefined};
  }
}
export const isCard = (x: unknown): x is Card => { const c = x as Card; return !!c && typeof c === 'object' && ['post', 'video', 'event', 'profile'].includes(c.kind) && typeof c.title === 'string' && typeof c.text === 'string' && typeof c.url === 'string' && typeof c.platform === 'string'; };
