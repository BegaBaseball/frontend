import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdownToHtml } from './simpleMarkdown';

test('raw HTML is escaped before dangerouslySetInnerHTML receives it', () => {
  const html = renderMarkdownToHtml('<script>alert(1)</script>\n<img src=x onerror=alert(1)>');

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('unsafe markdown links are rendered as text, not href attributes', () => {
  const html = renderMarkdownToHtml('[click me](javascript:alert)');

  assert.doesNotMatch(html, /href=/i);
  assert.match(html, /click me \(javascript:alert\)/);
});

test('table and list cells escape event-handler HTML payloads', () => {
  const html = renderMarkdownToHtml([
    '| 지표 | 값 |',
    '| --- | --- |',
    '| OPS | <img src=x onerror=alert> |',
    '',
    '- <svg onload=alert>',
  ].join('\n'));

  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /<svg/i);
  assert.match(html, /&lt;img src=x onerror=alert&gt;/);
  assert.match(html, /&lt;svg onload=alert&gt;/);
});

test('code block language is escaped before becoming an attribute', () => {
  const html = renderMarkdownToHtml('```js" onmouseover="alert\nconsole.log(1)\n```');

  assert.doesNotMatch(html, /data-language="[^"]*"\s+onmouseover=/i);
  assert.match(html, /data-language="js&quot; onmouseover=&quot;alert"/);
});
