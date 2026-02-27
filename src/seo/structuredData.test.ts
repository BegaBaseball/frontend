import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStructuredData } from './structuredData';
import { SITE_URL, getSeoRouteRule } from './routeSeo';

test('home route includes Organization, WebSite, WebPage schemas', () => {
  const rule = getSeoRouteRule('/');
  const jsonLd = buildStructuredData(rule, SITE_URL);
  assert.equal(jsonLd.length, 3);
  assert.deepEqual(
    jsonLd.map((item) => item['@type']),
    ['Organization', 'WebSite', 'WebPage'],
  );
});

test('general indexable route includes WebPage schema only', () => {
  const rule = getSeoRouteRule('/notice');
  const jsonLd = buildStructuredData(rule, SITE_URL);
  assert.equal(jsonLd.length, 1);
  assert.equal(jsonLd[0]['@type'], 'WebPage');
});

test('noindex route still builds stable WebPage schema payload', () => {
  const rule = getSeoRouteRule('/login');
  const jsonLd = buildStructuredData(rule, SITE_URL);
  assert.equal(jsonLd.length, 1);
  assert.equal(jsonLd[0]['@type'], 'WebPage');
  assert.equal(jsonLd[0].url, `${SITE_URL}/login`);
});
