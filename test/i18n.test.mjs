import test from 'node:test';
import assert from 'node:assert/strict';
import {LANGS} from '../dist/core/i18n.js';

test('every language has every key and the same placeholders', () => {
  const keys = Object.keys(LANGS.en);
  for (const [code, dict] of Object.entries(LANGS)) {
    assert.deepEqual(Object.keys(dict).sort(), keys.sort(), `${code}: key set differs`);
    for (const k of keys) {
      const ph = s => (s.match(/\{\w+\}/g) ?? []).sort();
      assert.deepEqual(ph(dict[k]), ph(LANGS.en[k]), `${code}.${k}: placeholders differ`);
    }
  }
});
