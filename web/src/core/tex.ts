// Markdown to LaTeX, for tstex in the browser: notes as an article, slides as a beamer deck. Works
// on the same node tree the pad renders, so nothing from the text reaches TeX unescaped; the
// only files the engine sees are this source and the PNG/JPEG attachments it refers to. The
// minimal TeX bundle has Computer Modern only, so characters outside Latin become "?".
import {render, slides, frontMatter, title as mdTitle, type Node} from './md.js';

export type Attachment = {name: string; type: string; bytes: Uint8Array};
export type TexDoc = {source: string; files: Record<string, Uint8Array>};

// The minimal bundle has no text-companion (TS1) fonts, so the few symbols LaTeX takes from there are
// written another way: the dollar in roman, the euro in roman, degree and copyright as symbols, ~ as an accent.
const ESC: Record<string, string> = {'\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '{\\rmfamily\\$}', '&': '\\&', '#': '\\#', '^': '\\^{}', '_': '\\_', '%': '\\%', '~': '\\~{}', '€': '{\\rmfamily\\texteuro}', '°': '$^\\circ$', '©': '\\copyright{}'};
/** Text in a TeX document: specials escaped, characters the fonts lack replaced. */
export const esc = (s: string) => s.replace(/[\\{}$&#^_%~€°©]/g, c => ESC[c]!).replace(/[^\x20-\x7E\n\u00A0-\u024F\u2010-\u2027]/gu, '?');
const url = (u: string) => u.replace(/[\\{}]/g, '').replace(/([%#])/g, '\\$1');   // a URL inside \href
const hex = (accent?: string) => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(accent ?? ''); if (!m) return '2F6FED'; const h = m[1]!; return (h.length === 3 ? [...h].map(c => c + c).join('') : h).toUpperCase(); };

const pdfString = (s: string) => s.replace(/[^\x20-\x7E]|[\\()]/g, '_');   // a (string) in PDF syntax, written through TeX: ASCII only, no parentheses or backslashes
/** `files` resolves an attachment id, or the URL of a hot-linked image, to bytes the caller fetched and decrypted (null if it could not). */
export function toTeX(md: string, files: (key: string) => Attachment | null, asSlides: boolean, bodyOnly = false): TexDoc {
  const {vars, body} = frontMatter(md);
  const out: Record<string, Uint8Array> = {};
  let fragile = false;   // the current frame holds verbatim text
  const add = (f: Attachment, ext: string, key = '') => { const name = `${/^[0-9a-f]{32}$/.test(key) ? key : 'f' + Object.keys(out).length}.${ext}`; out[name] = f.bytes; return name; };   // an attachment keeps its id as its TeX file name, so a converted pad can go on referring to it
  /** A picture on the page (PNG, JPEG, or the first page of a PDF); anything else is attached to the PDF with a paperclip. */
  const figure = (key: string, alt: string, tall: string): string => {
    const f = files(key);
    if (!f) return esc(alt || key);
    const ext = f.type === 'image/png' ? 'png' : f.type === 'image/jpeg' ? 'jpg' : f.type === 'application/pdf' ? 'pdf' : null;
    if (!ext) return attach(f, alt, key);
    return `\\begin{center}\\includegraphics[width=\\linewidth,height=${tall},keepaspectratio]{${add(f, ext, key)}}\\end{center}`;
  };
  /** The file itself, embedded in the PDF behind a paperclip, with its name as text; viewers list and save it. */
  const attach = (f: Attachment, text: string, key = ''): string => {
    fragile = true;   // a beamer frame reads << >> as overlay marks unless it is fragile
    const name = add(f, f.name.split('.').pop()?.replace(/[^\w]/g, '').slice(0, 8) || 'bin', key), shown = pdfString(f.name);
    return `\\immediate\\pdfobj stream attr {/Type /EmbeddedFile} file {${name}}\\pdfannot width 1.2em height 1em depth 0pt {/Subtype /FileAttachment /FS << /Type /Filespec /F (${shown}) /UF (${shown}) /EF << /F \\the\\pdflastobj\\space 0 R >> >> /Name /Paperclip /Contents (${shown})}\\texttt{${esc(text || f.name)}}`;
  };
  const inline = (nodes: Node[]): string => nodes.map(n => {
    if (typeof n === 'string') return esc(n);
    const a = n.a ?? {}, c = () => inline(n.c);
    switch (n.t) {
      case 'em': return `\\emph{${c()}}`;
      case 'strong': return `\\textbf{${c()}}`;
      case 'del': return c();
      case 'code': return `\\texttt{${c()}}`;
      case 'br': return '\\\\ ';
      case 'a': { if (!a['data-file']) return `\\href{${url(a['href'] ?? '')}}{${c()}}`; const f = files(a['data-file']); return f ? attach(f, n.c.map(x => typeof x === 'string' ? x : '').join(''), a['data-file']) : c(); }
      case 'img': { const tall = asSlides ? '.6\\textheight' : '.45\\textheight'; if (a['data-file']) return figure(a['data-file'], a['alt'] ?? '', tall); if (a['src']) return files(a['src']) ? figure(a['src'], a['alt'] ?? '', tall) : `\\href{${url(a['src'])}}{${esc(a['alt'] || a['src'])}}`; return esc(a['alt'] ?? ''); }
      case 'iframe': return `\\texttt{${esc(a['title'] ?? a['data-app'] ?? '')}}`;
      case 'input': return a['checked'] !== undefined ? '$\\checkmark$' : '$\\square$';   // the tree carries the space after it
      default: return c();
    }
  }).join('');
  const BLOCK = /^(h[1-6]|p|ul|ol|blockquote|pre|hr|table|div)$/;
  let shift = 0;   // 1 when the first heading became the title: the document's ## is then a \section
  const block = (n: Exclude<Node, string>): string => {
    const kids = n.c;
    switch (n.t) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = +n.t[1]! - shift, text = inline(kids);
        if (asSlides) return `\\textbf{\\large ${text}}\\par\n`;
        return (level <= 1 ? '\\section' : level === 2 ? '\\subsection' : level === 3 ? '\\subsubsection' : '\\paragraph') + `{${text}}\n`;
      }
      case 'p': return inline(kids) + '\n\n';
      case 'ul': case 'ol': return `\\begin{${n.t === 'ul' ? 'itemize' : 'enumerate'}}\n` + kids.map(li => typeof li === 'string' ? '' : '\\item ' + blocks(li.c).trim() + '\n').join('') + `\\end{${n.t === 'ul' ? 'itemize' : 'enumerate'}}\n`;
      case 'blockquote': return `\\begin{quote}\n${blocks(kids)}\\end{quote}\n`;
      case 'pre': { fragile = true; const code = kids.map(k => typeof k === 'string' ? k : k.c.join('')).join('').replace(/\\end\{verbatim\}/g, '\\end {verbatim}'); return `\\begin{verbatim}\n${code}\n\\end{verbatim}\n`; }
      case 'hr': return asSlides ? '' : '\\par\\noindent\\hrulefill\\par\n';
      case 'table': {
        const rows = kids.flatMap(sec => typeof sec === 'string' ? [] : sec.c).filter((r): r is Exclude<Node, string> => typeof r !== 'string');
        const cols = Math.max(1, ...rows.map(r => r.c.length));
        const line = (r: Exclude<Node, string>, head: boolean) => r.c.map(cell => typeof cell === 'string' ? esc(cell) : head ? `\\textbf{${inline(cell.c)}}` : inline(cell.c)).join(' & ') + ' \\\\\n';
        return `\\begin{center}\\begin{tabular}{${'l'.repeat(cols)}}\\toprule\n${rows.map((r, i) => line(r, i === 0) + (i === 0 ? '\\midrule\n' : '')).join('')}\\bottomrule\\end{tabular}\\end{center}\n`;
      }
      default: return n.a?.['class'] === 'fedi' ? inline(kids) + '\n\n' : blocks(kids);   // div
    }
  };
  /** Blocks in order; runs of inline nodes between them (a list item's own text) become one line. */
  const blocks = (nodes: Node[]): string => {
    let out = '', run: Node[] = [];
    const flush = () => { if (run.length) { out += inline(run) + '\n'; run = []; } };
    for (const n of nodes) { if (typeof n !== 'string' && BLOCK.test(n.t)) { flush(); out += block(n); } else run.push(n); }
    flush(); return out;
  };

  const accent = hex(vars['accent']), title = esc(mdTitle(body)), common = '\\usepackage{graphicx}\\usepackage{xcolor}\\usepackage{booktabs}\\usepackage{amssymb}\\usepackage{microtype}\n' + `\\definecolor{accent}{HTML}{${accent}}\n`;
  if (bodyOnly) return {source: blocks(render(body)), files: out};   // for \input into another document: sections, no preamble
  if (!asSlides) {
    const tree = render(body);
    const first = tree[0]; if (first && typeof first !== 'string' && first.t === 'h1' && title) { tree.shift(); shift = 1; }   // the title is the first heading
    const source = '\\documentclass[a4paper,10pt]{article}\\usepackage[margin=2.2cm]{geometry}\n' + common + '\\usepackage[colorlinks=true,allcolors=accent]{hyperref}\n\\setlength{\\parskip}{.5em}\\setlength{\\parindent}{0pt}\n' +
      `\\title{${title}}\\author{}\\date{}\n\\begin{document}\n${title ? '\\maketitle\n' : ''}${blocks(tree)}\\end{document}\n`;
    return {source, files: out};
  }
  const frames = slides(body).map(s => {
    const tree = render(s); fragile = false;
    const first = tree[0], head = first && typeof first !== 'string' && /^h[1-6]$/.test(first.t) ? inline((tree.shift() as Exclude<Node, string>).c) : '';
    const content = blocks(tree);
    return `\\begin{frame}${fragile ? '[fragile]' : ''}${head ? `{${head}}` : ''}\n${content}\n\\end{frame}\n`;   // \end{frame} on its own line: beamer needs that for fragile frames
  });
  const source = '\\documentclass[aspectratio=169,10pt]{beamer}\n' + common + '\\usetheme{default}\\setbeamertemplate{navigation symbols}{}\\setbeamertemplate{itemize items}[square]\\hypersetup{colorlinks=true,allcolors=accent}\n' +
    '\\setbeamercolor{structure}{fg=accent}\\setbeamercolor{title}{fg=accent}\\setbeamercolor{frametitle}{fg=accent}\n' +
    `\\title{${title}}\\date{}\n\\begin{document}\n${title ? '\\begin{frame}\\titlepage\n\\end{frame}\n' : ''}${frames.join('')}\\end{document}\n`;
  return {source, files: out};
}
