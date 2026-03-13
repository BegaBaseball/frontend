import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SITE_URL,
  buildCanonicalUrl,
  getSeoRouteRule,
} from './routeSeo';

test('indexable route has index,follow and canonical url', () => {
  const rule = getSeoRouteRule('/cheer');
  assert.equal(rule.isIndexable, true);
  assert.equal(rule.robots, 'index,follow');
  assert.equal(rule.canonicalUrl, `${SITE_URL}/cheer`);
});

test('noindex prefix route has noindex,nofollow', () => {
  const rule = getSeoRouteRule('/login');
  assert.equal(rule.isIndexable, false);
  assert.equal(rule.robots, 'noindex,nofollow');
});

test('noindex regex route has noindex,nofollow', () => {
  const rule = getSeoRouteRule('/cheer/12345');
  assert.equal(rule.isIndexable, false);
  assert.equal(rule.robots, 'noindex,nofollow');
});

test('canonical url normalizes trailing slash', () => {
  assert.equal(buildCanonicalUrl('/home/'), `${SITE_URL}/home`);
  assert.equal(buildCanonicalUrl('/'), SITE_URL);
});
