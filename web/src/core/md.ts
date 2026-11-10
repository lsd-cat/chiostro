import {recognise} from './fedi.js';
// Markdown to a plain tree, no DOM and no HTML strings: the UI turns nodes into elements with
// textContent and setAttribute, so there is nothing to escape and nothing to inject. Covers what
// a HedgeDoc pad uses: headings, paragraphs, emphasis, code, links, images, lists with tasks,
// quotes, tables, rules. `---` on its own line also separates slides.
export type Node = string | {t: string; a?: Record<string, string>; c: Node[]};
const n = (t: string, c: Node[], a?: Record<string, string>): Node => a ? {t, a, c} : {t, c};
const url = (u: string) => /^(https?:|mailto:)/i.test(u) ? u : '#';   // nothing that runs or reaches local resources
const FILE = /^file:([0-9a-f]{32})$/;   // an attachment in the meeting's share room; the renderer resolves it
const APP = /^\/([a-z]+)\/#(~?[\w.-]{10,120})$/;   // another tool of this suite, same origin: the renderer embeds it

export function inline(s: string): Node[] {
  const out: Node[] = [];
  const re = /(`+)(.+?)\1|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|~~(.+?)~~/s;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index) out.push(s.slice(0, m.index));
    const [, , code, alt, src, text, href, b1, b2, i1, i2, del] = m;
    if (code !== undefined) out.push(n('code', [code]));
    else if (src !== undefined) out.push(FILE.test(src) ? n('img', [], {'data-file': src.slice(5), alt: alt ?? ''}) : APP.test(src) ? n('iframe', [], {'data-app': src, title: alt || src}) : recognise(src) ? n('div', [n('a', [alt || src], {href: url(src), target: '_blank', rel: 'noopener'})], {class: 'fedi', 'data-fedi': src}) : url(src) === '#' ? alt || src : n('img', [], {src, alt: alt ?? '', loading: 'lazy'}));   // a blocked image URL becomes its text: no request to '#'
    else if (href !== undefined) out.push(FILE.test(href) ? n('a', inline(text!), {'data-file': href.slice(5), href: '#'}) : n('a', inline(text!), {href: url(href), target: '_blank', rel: 'noopener'}));
    else if (del !== undefined) out.push(n('del', inline(del)));
    else if (b1 !== undefined || b2 !== undefined) out.push(n('strong', inline((b1 ?? b2)!)));
    else out.push(n('em', inline((i1 ?? i2)!)));
    s = s.slice(m.index + m[0].length);
  }
  if (s) out.push(s);
  return out;
}

const LIST = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;
const cells = (line: string) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

export function render(md: string): Node[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: Node[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i]!;
    if (!line.trim()) { i++; continue; }
    let m: RegExpMatchArray | null;
    if ((m = /^(`{3,}|~{3,})\s*(\w*)/.exec(line))) {   // fenced code
      const fence = m[1]!, body: string[] = [];
      for (i++; i < lines.length && !lines[i]!.startsWith(fence); i++) body.push(lines[i]!);
      out.push(n('pre', [n('code', [body.join('\n')], m[2] ? {class: 'lang-' + m[2]} : undefined)])); i++;
    } else if ((m = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line))) { out.push(n('h' + m[1]!.length, inline(m[2]!))); i++; }
    else if (RULE.test(line)) { out.push(n('hr', [])); i++; }
    else if (line.startsWith('>')) {
      const body: string[] = [];
      for (; i < lines.length && lines[i]!.startsWith('>'); i++) body.push(lines[i]!.replace(/^>\s?/, ''));
      out.push(n('blockquote', render(body.join('\n'))));
    } else if ((m = LIST.exec(line))) {
      const indent = m[1]!.length, ordered = /\d/.test(m[2]!), items: Node[] = [];
      while (i < lines.length && (m = LIST.exec(lines[i]!)) && m[1]!.length === indent) {
        const sub: string[] = [];
        for (i++; i < lines.length && lines[i]!.trim() && (LIST.exec(lines[i]!)?.[1]!.length ?? 0) > indent; i++) sub.push(lines[i]!.slice(indent + 2));
        const task = /^\[([ xX])\]\s+(.*)$/.exec(m[3]!);
        const c: Node[] = task ? [n('input', [], {type: 'checkbox', disabled: '', ...(task[1] !== ' ' && {checked: ''})}), ' ', ...inline(task[2]!)] : inline(m[3]!);
        items.push(n('li', [...c, ...render(sub.join('\n'))], task ? {class: 'task'} : undefined));
      }
      out.push(n(ordered ? 'ol' : 'ul', items));
    } else if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]!)) {
      const head = n('tr', cells(line).map(c => n('th', inline(c)))), rows: Node[] = [];
      for (i += 2; i < lines.length && lines[i]!.includes('|'); i++) rows.push(n('tr', cells(lines[i]!).map(c => n('td', inline(c)))));
      out.push(n('table', [n('thead', [head]), n('tbody', rows)]));
    } else {   // paragraph: consecutive plain lines; a line ending in two spaces breaks
      const body: Node[] = [];
      for (; i < lines.length && lines[i]!.trim() && !/^(#{1,6}\s|>|`{3}|~{3})/.test(lines[i]!) && !LIST.test(lines[i]!) && !RULE.test(lines[i]!); i++) {   // a rule right after a line ends the paragraph (and splits slides)
        if (body.length) body.push(/ {2}$/.test(lines[i - 1]!) ? n('br', []) : ' ');
        body.push(...inline(lines[i]!.trim()));
      }
      out.push(n('p', body));
    }
  }
  return out;
}

/** Slides: the document split on horizontal rules. */
export const slides = (md: string): string[] => frontMatter(md).body.replace(/\r\n?/g, '\n').split(/\n\s*-{3,}\s*\n/).map(s => s.trim()).filter(Boolean);

/** The first heading, for the page title. */
export const title = (md: string): string => /^#{1,6}\s+(.+?)\s*#*$/m.exec(md)?.[1]?.replace(/[*_`~]/g, '') ?? '';

/** A leading block of `key: value` lines between `---` fences: the page's own settings (theme
 *  variables, validated by the renderer). Returns the settings and the markdown without them. */
export function frontMatter(md: string): {vars: Record<string, string>; body: string} {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  if (!m) return {vars: {}, body: md};
  const vars: Record<string, string> = {};
  for (const line of m[1]!.split('\n')) { const kv = /^([\w-]+):\s*(.+?)\s*$/.exec(line); if (kv) vars[kv[1]!] = kv[2]!; }
  return {vars, body: md.slice(m[0].length)};
}
