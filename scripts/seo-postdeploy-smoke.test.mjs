import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  escapeHtml,
  indexableRoutes,
  siteUrl,
} from './seo-policy.mjs';
import { buildSeoHeadMarkup } from './prerender-seo.mjs';
import {
  summarizeHtmlContract,
  validatePrerenderedHtmlContract,
} from './seo-postdeploy-smoke.mjs';

const route = indexableRoutes.find((entry) => entry.path === '/cheer');
const homeRoute = indexableRoutes.find((entry) => entry.path === '/');

const buildHtml = (
  routeConfig,
  siteVerification = { googleSiteVerification: '', naverSiteVerification: '' },
) => [
  '<!DOCTYPE html>',
  '<html lang="ko">',
  '<head>',
  `<title>${escapeHtml(routeConfig.title)}</title>`,
  buildSeoHeadMarkup(routeConfig, siteVerification),
  '</head>',
  '<body>',
  '<div id="root">',
  '<main data-seo-prerender="true">',
  `<h1>${escapeHtml(routeConfig.heading)}</h1>`,
  `<p>${escapeHtml(routeConfig.description)}</p>`,
  '</main>',
  '</div>',
  '</body>',
  '</html>',
].join('\n');

test('postdeploy smoke accepts exact prerendered HTML contract', () => {
  const siteVerification = {
    googleSiteVerification: 'google-token<&"\'',
    naverSiteVerification: 'naver-token',
  };
  const html = buildHtml(route, siteVerification);

  assert.deepEqual(
    validatePrerenderedHtmlContract(html, route, {
      expectedSiteUrl: siteUrl,
      ...siteVerification,
    }),
    [],
  );
});

test('postdeploy smoke report summary exposes observed static SEO contract values', () => {
  const html = buildHtml(route);

  assert.deepEqual(summarizeHtmlContract(html), {
    title: route.title,
    description: route.description,
    robots: 'index,follow',
    canonical: `${siteUrl}${route.path}`,
    h1: route.heading,
    jsonLdCount: 1,
    hasPrerenderMarker: true,
  });
});

test('postdeploy smoke rejects generic tags with wrong route policy values', () => {
  const html = buildHtml(route)
    .replace(
      `<title>${escapeHtml(route.title)}</title>`,
      '<title>Wrong but present</title>',
    )
    .replace(
      `<meta name="description" content="${escapeHtml(route.description)}">`,
      '<meta name="description" content="Wrong but present">',
    );

  const failures = validatePrerenderedHtmlContract(html, route, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('title 값 불일치')));
  assert.ok(failures.some((failure) => failure.includes('description 값 불일치')));
});

test('postdeploy smoke rejects duplicate singleton SEO tags', () => {
  const html = buildHtml(route).replace(
    '</head>',
    `<meta name="description" content="${escapeHtml(route.description)}">\n</head>`,
  );

  const failures = validatePrerenderedHtmlContract(html, route, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('description 태그 수 불일치')));
});

test('postdeploy smoke rejects missing prerender marker and wrong JSON-LD shape', () => {
  const html = buildHtml(homeRoute)
    .replace('data-seo-prerender="true"', 'data-seo-prerender="false"')
    .replace(
      /<script type="application\/ld\+json" data-seo-jsonld="0">[\s\S]*?<\/script>/,
      '<script type="application/ld+json" data-seo-jsonld="0">{"@type":"Thing"}</script>',
    );

  const failures = validatePrerenderedHtmlContract(html, homeRoute, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('SEO 프리렌더 본문 마커 누락')));
  assert.ok(failures.some((failure) => failure.includes('JSON-LD[0] 값 불일치')));
});
