// Syntax tokens for the editor layer: markdown structure and inline marks, fences swallowing their content, LaTeX commands, environments, comments and math.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tokens, classes} from '../dist/core/highlight.js';

const kinds = (text, mode) => tokens(text, mode).map(([s, e, c]) => c + ':' + text.slice(s, e));

test('markdown', () => {
  const md = '---\naccent: #c00\n---\n# Title\n\n- item with **bold** and `code` and [a link](https://x.example)\n\n> quote\n\n```js\n# not a heading\n```\n\n---\n';
  const k = kinds(md, 'md');
  assert.ok(k.includes('meta:---\naccent: #c00\n---\n')); assert.ok(k.includes('h:# Title')); assert.ok(k.includes('list:- ')); assert.ok(k.includes('strong:**bold**'));
  assert.ok(k.includes('code:`code`')); assert.ok(k.includes('link:[a link](https://x.example)')); assert.ok(k.includes('url:https://x.example')); assert.ok(k.includes('quote:> '));
  assert.ok(k.includes('code:```js\n# not a heading\n```'), 'a fence swallows its lines'); assert.ok(!k.includes('h:# not a heading')); assert.ok(k.includes('hr:---'));
  const cls = classes(md, 'md'); assert.equal(cls[md.indexOf('Title')], 'h'); assert.equal(cls[md.indexOf('x.example')], 'url', 'the url wins inside the link');
});

test('latex', () => {
  const tex = '\\documentclass{article} % a comment\n\\begin{document}\nText $x^2$ and \\emph{em} \\\\ {group}\n\\end{document}\n';
  const k = kinds(tex, 'tex');
  assert.ok(k.includes('cmd:\\documentclass')); assert.ok(k.includes('comment:% a comment')); assert.ok(k.includes('env:\\begin{document}')); assert.ok(k.includes('math:$x^2$')); assert.ok(k.includes('cmd:\\emph')); assert.ok(k.includes('cmd:\\\\')); assert.ok(k.includes('brace:{'));
  assert.equal(classes(tex, 'tex').length, tex.length);
});
