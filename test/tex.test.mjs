// Markdown to LaTeX: structure, escaping (nothing from the text reaches TeX as a command), slides
// as frames, images as figures; then the generated sources really compile with tstex in Node
// against the minimal bundle (skipped if the bundle is not linked at openresty/texmf).
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {toTeX, esc} from '../dist/core/tex.js';
import {png as makePng, pdfInfo} from './fixtures.mjs';

const png = new Uint8Array(makePng(64, 48));
const files = id => id === 'a'.repeat(32) ? {name: 'dot.png', type: 'image/png', bytes: png} : id === 'b'.repeat(32) ? {name: 'clip.webm', type: 'video/webm', bytes: png} : id === 'c'.repeat(32) ? {name: 'notes (v2).txt', type: 'text/plain', bytes: new TextEncoder().encode('hello attachment\n')} : id === 'https://x.example/logo.png' ? {name: 'logo.png', type: 'image/png', bytes: png} : null;
const MD = ['---', 'accent: #00aa55', '---', '# Field guide', '', 'Intro with **bold**, *em*, `code`, a [link](https://x.example/a?b=1&c=2#f) and 100% of $5 & #tags_here.', '', '## Setup', '', '- one', '- [x] done', '  - nested', '', '1. first', '', '> quoted', '', '```', 'npm run build \\end{verbatim} \\input{/etc/passwd}', '```', '', '| a | b |', '|---|---|', '| 1 | 2 |', '', '![dot](file:' + 'a'.repeat(32) + ')', '', '![clip](file:' + 'b'.repeat(32) + ')', '', 'See [the notes](file:' + 'c'.repeat(32) + ') and ![logo](https://x.example/logo.png) and ![far](https://far.example/x.png).', '', '---', '', '## Deploy', '', 'Last words with ünïcödé, “quotes” — and 你好 😀.'].join('\n');

test('notes: an article with the structure of the document', () => {
  const {source, files: out} = toTeX(MD, files, false);
  assert.match(source, /\\documentclass\[a4paper,10pt\]\{article\}/);
  assert.match(source, /\\definecolor\{accent\}\{HTML\}\{00AA55\}/);
  assert.match(source, /\\title\{Field guide\}/); assert.doesNotMatch(source, /\\section\{Field guide\}/, 'the first heading is the title, not a section');
  assert.match(source, /\\section\{Setup\}/); assert.match(source, /\\section\{Deploy\}/);
  assert.match(source, /\\textbf\{bold\}, \\emph\{em\}, \\texttt\{code\}/);
  assert.match(source, /\\href\{https:\/\/x\.example\/a\?b=1&c=2\\#f\}\{link\}/);
  assert.match(source, /100\\% of \{\\rmfamily\\\$\}5 \\& \\#tags\\_here\./, 'specials escaped');
  assert.match(source, /\\begin\{itemize\}\n\\item one\n\\item \$\\checkmark\$ done\n\\begin\{itemize\}\n\\item nested/);
  assert.match(source, /\\begin\{enumerate\}\n\\item first/);
  assert.match(source, /\\begin\{quote\}\nquoted/);
  assert.match(source, /\\begin\{verbatim\}\nnpm run build \\end \{verbatim\} \\input\{\/etc\/passwd\}\n\\end\{verbatim\}/, 'verbatim is verbatim, and cannot end itself early');
  assert.match(source, /\\begin\{tabular\}\{ll\}\\toprule\n\\textbf\{a\} & \\textbf\{b\} \\\\\n\\midrule\n1 & 2 \\\\\n\\bottomrule/);
  assert.match(source, /\\includegraphics\[[^\]]*\]\{aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\.png\}/); assert.deepEqual(Object.keys(out), ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webm', 'cccccccccccccccccccccccccccccccc.txt', 'f3.png'], 'attachments keep their id as file name; a fetched image is numbered');
  assert.match(source, /\\immediate\\pdfobj stream attr \{\/Type \/EmbeddedFile\} file \{cccccccccccccccccccccccccccccccc\.txt\}\\pdfannot [^}]*\{\/Subtype \/FileAttachment \/FS << \/Type \/Filespec \/F \(notes _v2_\.txt\)/, 'a linked file is attached inside the PDF');
  assert.match(source, /\\texttt\{the notes\}/); assert.match(source, /\\includegraphics\[[^\]]*\]\{f3\.png\}/, 'a hot-linked image with bytes is a figure'); assert.match(source, /\\href\{https:\/\/far\.example\/x\.png\}\{far\}/, 'one without stays a link');
  assert.match(source, /\\pdfannot [^}]*\{\/Subtype \/FileAttachment [^}]*\(clip\.webm\)/, 'a video is attached, not drawn');
  assert.match(source, /ünïcödé, “quotes” — and \?\? \?\./, 'characters the fonts lack become ?');
});

test('slides: one frame per slide, titled by its heading, fragile when it holds code', () => {
  const {source} = toTeX(MD, files, true);
  assert.match(source, /\\documentclass\[aspectratio=169,10pt\]\{beamer\}/);
  assert.match(source, /\\begin\{frame\}\\titlepage\n\\end\{frame\}/);
  assert.match(source, /\\begin\{frame\}\[fragile\]\{Field guide\}\n/, 'the first slide has the code block');
  assert.match(source, /\\begin\{frame\}\{Deploy\}\n/);
  assert.equal((source.match(/^\\end\{frame\}$/gm) ?? []).length, 3, 'every \\end{frame} on its own line');
  assert.doesNotMatch(source, /\\section/);
});

test('nothing from the text is a command: backslashes, braces, comment signs', () => {
  assert.equal(esc('\\input{x} 50% ~ ^ _ {y} 5€ 20° ©'), '\\textbackslash{}input\\{x\\} 50\\% \\~{} \\^{} \\_ \\{y\\} 5{\\rmfamily\\texteuro} 20$^\\circ$ \\copyright{}');
  const {source} = toTeX('# T\n\n\\documentclass{article} \\begin{document} \\write18{rm -rf /} %comment\n', files, false);
  assert.doesNotMatch(source, /[^\\]\\write18/); assert.match(source, /\\textbackslash\{\}write18\\\{rm -rf \/\\\}/); assert.match(source, /\\%comment/);
  assert.match(toTeX('[x](javascript:alert(1))', files, false).source, /\\href\{\\#\}\{x\}/, 'the markdown layer already blanks a script link');
});

test('the generated sources compile with tstex', {skip: !existsSync('openresty/texmf/fmt/latex.fmt') && 'no TeX bundle at openresty/texmf'}, async () => {
  const {createTeX} = await import('@lsd-cat/tstex');
  const tex = createTeX({texmf: 'openresty/texmf'});
  try {
    for (const asSlides of [false, true]) {
      const {source, files: out} = toTeX(MD, files, asSlides);
      const r = await tex.compile({files: {'main.tex': source, ...out}, main: 'main.tex', runs: 'auto', date: new Date(0)});
      assert.ok(r.ok && r.pdf?.length > 1000, (asSlides ? 'slides' : 'notes') + ' failed: ' + r.log.split('\n').filter(l => l.startsWith('!')).slice(0, 3).join(' | '));
      const {pages, attachments, text} = pdfInfo(r.pdf);
      assert.equal(attachments, 2, 'the text file and the clip ride inside the PDF'); assert.match(text, /hello attachment/, 'with their bytes');
      if (asSlides) assert.equal(pages, 3, 'title + two slides, got ' + pages); else assert.ok(pages >= 1, 'at least one page');
    }
  } finally { tex.dispose(); }
});

test('body only: sections without a preamble, for \\input into another document', () => {
  const {source} = toTeX('# Other\n\nText.\n', files, false, true);
  assert.doesNotMatch(source, /documentclass|begin\{document\}/); assert.match(source, /^\\section\{Other\}\nText\.\n/);
});
