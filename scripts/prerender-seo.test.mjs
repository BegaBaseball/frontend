import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildPerformanceRouteHeadMarkup,
  buildRootMarkup,
  buildSeoHeadMarkup,
  readSiteVerificationEnv,
} from './prerender-seo.mjs';
import { defaultOgImageUrl } from './seo-policy.mjs';

const route = {
  path: '/',
  title: 'BEGA SEO Test',
  description: 'Search verification metadata test route.',
  heading: 'BEGA SEO Test',
  schemaType: 'page',
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('performance-only route shell remains noindex without preload metadata', () => {
  const html = buildPerformanceRouteHeadMarkup({
    title: '승부예측 | BEGA',
    description: '경기 승부를 예측하세요.',
  });
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /<meta name="description" content="경기 승부를 예측하세요\.">/);
  assert.doesNotMatch(html, /modulepreload|ROUTE-MODULE-PRELOAD|index,follow/);
});

test('performance-only route root is a fixed paintable shell', () => {
  const html = buildRootMarkup({
    title: '승부예측 | BEGA',
    description: '경기 승부를 예측하세요.',
    heading: 'KBO 승부예측',
    performanceShell: true,
  });

  assert.match(html, /data-performance-prerender="true"/);
  assert.match(html, /style="position:fixed;inset:0;z-index:1;display:flex;/);
  assert.match(html, /<h1 style="margin:0;font-size:24px;/);
  assert.match(html, /<p style="margin:12px 0 0;/);
});

test('prerender SEO head includes escaped search verification meta tags', () => {
  const html = buildSeoHeadMarkup(route, {
    googleSiteVerification: 'google-token<&"\'',
    naverSiteVerification: 'naver-token',
  });

  assert.match(
    html,
    /<meta name="google-site-verification" content="google-token&lt;&amp;&quot;&#39;">/,
  );
  assert.match(
    html,
    /<meta name="naver-site-verification" content="naver-token">/,
  );
});

test('prerender SEO head uses policy default OG image', () => {
  const html = buildSeoHeadMarkup(route, {
    googleSiteVerification: '',
    naverSiteVerification: '',
  });
  const escapedOgImage = escapeRegExp(defaultOgImageUrl);

  assert.match(
    html,
    new RegExp(`<meta property="og:image" content="${escapedOgImage}">`),
  );
  assert.match(
    html,
    new RegExp(`<meta name="twitter:image" content="${escapedOgImage}">`),
  );
});

test('prerender SEO head omits search verification meta tags when env values are blank', () => {
  const html = buildSeoHeadMarkup(route, {
    googleSiteVerification: '',
    naverSiteVerification: '',
  });

  assert.doesNotMatch(html, /google-site-verification/);
  assert.doesNotMatch(html, /naver-site-verification/);
});

test('prerender SEO head uses repo root .env.prod fallback search verification values', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-prerender-root-'));
  const frontendRoot = path.join(repoRoot, 'bega_frontend');
  fs.mkdirSync(frontendRoot, { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, '.env.prod'),
    [
      'VITE_GOOGLE_SITE_VERIFICATION=repo-google-token<&"\'',
      'VITE_NAVER_SITE_VERIFICATION=repo-naver-token',
      '',
    ].join('\n'),
    'utf-8',
  );

  const html = buildSeoHeadMarkup(
    route,
    readSiteVerificationEnv({ env: {}, frontendRoot, repoRoot }),
  );

  assert.match(
    html,
    /<meta name="google-site-verification" content="repo-google-token&lt;&amp;&quot;&#39;">/,
  );
  assert.match(
    html,
    /<meta name="naver-site-verification" content="repo-naver-token">/,
  );
});
