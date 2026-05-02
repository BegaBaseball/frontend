import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeExternalUrl } from './safeExternalUrl';

test('sanitizeExternalUrl은 http/https 절대 URL만 허용한다', () => {
  assert.equal(sanitizeExternalUrl(' https://example.com/path '), 'https://example.com/path');
  assert.equal(sanitizeExternalUrl('http://example.com/news?id=1'), 'http://example.com/news?id=1');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html;base64,abc'), null);
  assert.equal(sanitizeExternalUrl('/relative/path'), null);
  assert.equal(sanitizeExternalUrl(''), null);
});
