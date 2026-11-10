// core/ must never touch the DOM: that is the UI layer's job.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
test('core has no DOM access and does not import ui', () => {
  // property access on globals, DOM types, and ui imports; plain words in translation strings are fine
  const bad = /\b(document|window|localStorage|location)\.|\b(HTMLElement|HTMLCanvasElement|HTMLVideoElement|getElementById|querySelector|alert)\s*[(<]|from '\.\.?\/ui\//;
  for (const f of walk('web/src/core')) {   // includes core/apps
    const hits = readFileSync(f, 'utf8').split('\n').map((l, i) => bad.test(l) ? `${f}:${i + 1}: ${l.trim().slice(0, 80)}` : null).filter(Boolean);
    assert.deepEqual(hits, [], 'DOM access in core');
  }
});
