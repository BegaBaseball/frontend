import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_URL,
  SITE_URL,
  buildCanonicalUrl,
  getSeoRouteRule,
} from './routeSeo';

test('root route uses SEO policy copy and default OG image', () => {
  const rule = getSeoRouteRule('/');
  assert.equal(rule.title, 'BEGA | KBO 야구 플랫폼');
  assert.equal(rule.description, 'KBO 경기일정, 응원, 전력분석, 구장가이드를 한 곳에서 확인하세요.');
  assert.equal(rule.heading, 'KBO 야구 팬을 위한 BEGA');
  assert.equal(DEFAULT_OG_IMAGE_PATH, '/og/bega-og.png');
  assert.equal(rule.og.image, DEFAULT_OG_IMAGE_URL);
  assert.equal(rule.og.image, `${SITE_URL}/og/bega-og.png`);
});

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
