import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildPerformanceRouteHeadMarkup,
  buildRouteModulePreloadMarkup,
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

const manifestFixture = {
  '_Landing-fixture.js': { file: 'assets/Landing-fixture.js', name: 'Landing' },
  'src/components/Layout.tsx': { file: 'assets/Layout-fixture.js', name: 'Layout' },
  'src/components/AppQueryProvider.tsx': { file: 'assets/AppQueryProvider-fixture.js', name: 'AppQueryProvider' },
  '_Prediction-fixture.js': { file: 'assets/Prediction-fixture.js', name: 'Prediction' },
  'src/components/Cheer.tsx': { file: 'assets/Cheer-fixture.js', name: 'Cheer' },
  'src/components/CheerRuntime.tsx': { file: 'assets/CheerRuntime-fixture.js', name: 'CheerRuntime' },
  'src/components/CheerComposerRuntime.tsx': { file: 'assets/CheerComposerRuntime-fixture.js', name: 'CheerComposerRuntime' },
  'src/components/CheerFeedRuntimeContent.tsx': { file: 'assets/CheerFeedRuntimeContent-fixture.js', name: 'CheerFeedRuntimeContent' },
  'src/components/MatePage.tsx': { file: 'assets/MatePage-fixture.js', name: 'MatePage' },
};

test('prerender injects only the current route LCP module preloads', () => {
  const cheerMarkup = buildRouteModulePreloadMarkup('/cheer', manifestFixture);
  assert.match(cheerMarkup, /href="\/assets\/Layout-fixture\.js"/);
  assert.match(cheerMarkup, /href="\/assets\/AppQueryProvider-fixture\.js"/);
  assert.match(cheerMarkup, /href="\/assets\/Cheer-fixture\.js"/);
  assert.match(cheerMarkup, /href="\/assets\/CheerRuntime-fixture\.js"/);
  assert.match(cheerMarkup, /href="\/assets\/CheerComposerRuntime-fixture\.js"/);
  assert.match(cheerMarkup, /href="\/assets\/CheerFeedRuntimeContent-fixture\.js"/);
  assert.doesNotMatch(cheerMarkup, /Prediction-fixture|MatePage-fixture|Landing-fixture/);

  const predictionMarkup = buildRouteModulePreloadMarkup('/prediction', manifestFixture);
  assert.match(predictionMarkup, /href="\/assets\/Prediction-fixture\.js"/);
  assert.doesNotMatch(predictionMarkup, /Cheer-fixture|MatePage-fixture|Landing-fixture/);
});

test('prerender route preload markup is managed and safely empty for other routes', () => {
  const rootMarkup = buildRouteModulePreloadMarkup('/', manifestFixture);
  assert.match(rootMarkup, /^<!-- ROUTE-MODULE-PRELOAD:START -->/);
  assert.match(rootMarkup, /href="\/assets\/Landing-fixture\.js"/);
  assert.match(rootMarkup, /<!-- ROUTE-MODULE-PRELOAD:END -->$/);
  assert.equal(buildRouteModulePreloadMarkup('/notice', manifestFixture), '');
});

test('performance-only route head is noindex and omits indexable metadata', () => {
  const html = buildPerformanceRouteHeadMarkup({
    path: '/prediction',
    title: '승부예측 | BEGA',
    description: '경기 승부를 예측하세요.',
  });
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(html, /<meta name="description" content="경기 승부를 예측하세요\.">/);
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json|index,follow/);
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
