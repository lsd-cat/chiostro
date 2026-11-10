// Syntax colours for the editor's layer: cheap tokens by regular expression, markdown or LaTeX.
// Tokens are [start, end, class]; later ones win where they overlap, so inline marks colour
// inside a heading. Nothing here changes glyph widths: the layer must stay aligned with the textarea.
export type Tok = [number, number, string];

export function tokens(text: string, mode: 'md' | 'tex'): Tok[] {
  const out: Tok[] = [];
  const scan = (re: RegExp, cls: (m: RegExpExecArray) => string, from = 0, to = text.length) => {
    re.lastIndex = from;
    for (let m: RegExpExecArray | null; (m = re.exec(text)) && m.index < to;) { const e = Math.min(to, m.index + m[0].length); out.push([m.index, e, cls(m)]); if (!m[0].length) re.lastIndex++; }
  };
  if (mode === 'tex') {
    scan(/(%[^\n]*)|(\\(?:begin|end)\{[^}\n]*\})|(\\[A-Za-z@]+\*?|\\[^A-Za-z@\s])|(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)|([{}[\]])/g, m => m[1] ? 'comment' : m[2] ? 'env' : m[3] ? 'cmd' : m[4] ? 'math' : 'brace');
    return out;
  }
  // front matter, then fenced code; the rest is scanned line by line between the fences
  let pos = 0;
  const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  if (fm) { out.push([0, fm[0].length, 'meta']); pos = fm[0].length; }
  const fence = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\1[^\n]*|$)/gm;
  const prose = (from: number, to: number) => {
    scan(/^#{1,6} [^\n]*/gm, () => 'h', from, to);
    scan(/^[ \t]*(?:[-*+]|\d+\.) (?:\[[ xX]\] )?/gm, () => 'list', from, to);
    scan(/^>[ ]?/gm, () => 'quote', from, to);
    scan(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, () => 'hr', from, to);
    scan(/`+[^`\n]+`+/g, () => 'code', from, to);
    scan(/\*\*[^*\n]+\*\*|__[^_\n]+__/g, () => 'strong', from, to);
    scan(/~~[^~\n]+~~/g, () => 'del', from, to);
    scan(/!?\[[^\]\n]*\]\(([^)\s]+)\)/g, () => 'link', from, to);
    scan(/(?<=!?\[[^\]\n]*\]\()[^)\s]+(?=\))/g, () => 'url', from, to);
  };
  fence.lastIndex = pos;
  for (let m: RegExpExecArray | null; (m = fence.exec(text));) { prose(pos, m.index); out.push([m.index, m.index + m[0].length, 'code']); pos = m.index + m[0].length; }
  prose(pos, text.length);
  return out;
}

/** One class per character, from the tokens (later tokens win). */
export function classes(text: string, mode: 'md' | 'tex'): string[] {
  const cls: string[] = new Array(text.length).fill('');
  for (const [s, e, c] of tokens(text, mode)) for (let i = s; i < e; i++) cls[i] = c;
  return cls;
}
