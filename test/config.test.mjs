import test from 'node:test';
import assert from 'node:assert/strict';
import {validate, DEFAULTS} from '../dist/core/config.js';

test('config is validated as untrusted data', () => {
  assert.deepEqual(validate(null), DEFAULTS);
  const c = validate({name: '  0N OdV Meet ', server: 'wss://relay.example.org', iceServers: [{urls: 'turn:t:3478', username: 'u', credential: 'p'}, 'junk'],
    theme: {light: {accent: '#be1e2d', 'primary-bg': 'linear-gradient(135deg, #be1e2d, #c2410c)', font: '16px "Helvetica Neue", Arial, sans-serif',
                    bogus: '#000', bg: 'url(https://evil.example/x)', fg: '#fff; background: red', muted: '\\\\61 bc', panel: '@import "x"'}}});
  assert.equal(c.name, '0N OdV Meet');
  assert.equal(c.server, 'wss://relay.example.org');
  assert.equal(c.iceServers.length, 1);
  assert.deepEqual(Object.keys(c.theme.light).sort(), ['accent', 'font', 'primary-bg']);   // unknown vars and unsafe values dropped
  assert.equal(validate({server: 'javascript:alert(1)'}).server, '');
  assert.equal(validate({name: 'x'.repeat(100)}).name.length, 60);
  assert.equal(validate({media: 'p2p'}).media, 'p2p');
  assert.deepEqual(validate({extensions: {pip: true, agenda: 'yes', 'x y': true}}).extensions, {pip: true});
  assert.equal(validate({media: 'mesh'}).media, 'relay');
  const h = validate({logo: '/logo.svg', intro: ' Hello ', links: [{label: 'Org', url: 'https://example.org/'}, {label: 'bad', url: 'javascript:alert(1)'}, {label: '', url: '/x'}, 'junk']});
  assert.equal(h.logo, '/logo.svg'); assert.equal(h.intro, 'Hello'); assert.deepEqual(h.links, [{label: 'Org', url: 'https://example.org/'}]);
  assert.equal(validate({logo: 'http://x/logo.png'}).logo, ''); assert.equal(validate({logo: 'javascript:x'}).logo, ''); assert.equal(validate({logo: 'data:image/png;base64,AAAA'}).logo, '');
});
