// Markdown: the tree the UI renders, and that nothing executable gets through.
import test from 'node:test';
import assert from 'node:assert/strict';
import {render, inline, slides, title, frontMatter} from '../dist/core/md.js';

test('blocks', () => {
  const t = render('# Title\n\nSome *em* and **bold** `code`.\n\n- a\n- [x] done\n  - nested\n\n1. one\n\n> quote\n\n```js\nlet x;\n```\n\n| h1 | h2 |\n|----|----|\n| a | b |\n\n---\n');
  assert.deepEqual(t.map(b => b.t), ['h1', 'p', 'ul', 'ol', 'blockquote', 'pre', 'table', 'hr']);
  assert.deepEqual(t[1].c, ['Some ', {t: 'em', c: ['em']}, ' and ', {t: 'strong', c: ['bold']}, ' ', {t: 'code', c: ['code']}, '.']);
  assert.equal(t[2].c[1].a.class, 'task'); assert.equal(t[2].c[1].c[0].a.checked, ''); assert.equal(t[2].c[1].c.at(-1).t, 'ul');
  assert.equal(t[5].c[0].a.class, 'lang-js'); assert.deepEqual(t[5].c[0].c, ['let x;']);
  assert.equal(t[6].c[1].c[0].c[1].c[0], 'b');
});
test('links and images are restricted to http(s) and mailto', () => {
  assert.equal(inline('[x](javascript:alert(1))')[0].a.href, '#');
  assert.deepEqual(inline('![x](data:text/html,oops)'), ['x'], 'a blocked image is its alt text');
  assert.equal(inline('[x](https://example.org)')[0].a.href, 'https://example.org');
  assert.deepEqual(inline('<script>alert(1)</script>'), ['<script>alert(1)</script>']);   // text stays text
});
test('slides and title', () => {
  assert.deepEqual(slides('# A\n\n---\n\n# B\n---\nc'), ['# A', '# B', 'c']);
  assert.equal(title('intro\n\n## **Hello** world\n'), 'Hello world');
});
test('front matter and embedded tools', () => {
  const {vars, body} = frontMatter('---\naccent: #c00\nfont: 16px Georgia, serif\nurl: javascript:x\n---\n# Hi\n');
  assert.deepEqual(vars, {accent: '#c00', font: '16px Georgia, serif', url: 'javascript:x'});   // the renderer validates names and values
  assert.equal(body, '# Hi\n');
  assert.deepEqual(frontMatter('no front matter').vars, {});
  assert.deepEqual(slides('---\naccent: #c00\n---\n# A\n\n---\n\n# B'), ['# A', '# B'], 'front matter is not a slide');
  assert.deepEqual(inline('![Vote](/form/#abcdefghijkl.mnop)')[0], {t: 'iframe', a: {'data-app': '/form/#abcdefghijkl.mnop', title: 'Vote'}, c: []});
  assert.deepEqual(inline('![x](/etc/passwd)'), ['x'], 'only app paths with a key embed; other paths are not fetched');
});

test('a rule right after a paragraph line is a rule, not part of the paragraph', () => {
  const t = render('![a](https://x.example/a.png)\n---\n\n## Next');
  assert.deepEqual(t.map(b => b.t), ['p', 'hr', 'h2']);
});

test('an image with a blocked URL is its alt text, not an img that fetches the page', () => {
  assert.deepEqual(inline('![pic](javascript:alert(1))')[0], 'pic');   // the trailing ')' of alert(1) is text after it
  assert.deepEqual(inline('![](data:image/svg+xml,<svg>)'), ['data:image/svg+xml,<svg>']);
  assert.deepEqual(inline('![ok](https://x.example/a.png)')[0].a.src, 'https://x.example/a.png');
});
