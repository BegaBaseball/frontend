import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultOgImagePath,
  escapeHtml,
  indexableRoutes,
  robotsDisallow,
  siteUrl as defaultSiteUrl,
} from './seo-policy.mjs';

const args = process.argv.slice(2);
const argMap = new Map();
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (!key.startsWith('--')) {
    continue;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    argMap.set(key, 'true');
    continue;
  }
  argMap.set(key, value);
  index += 1;
}

const normalizeSiteUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizePublicPath = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '/favicon.png';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};
const normalizePathname = (value) => {
  if (!value || value === '/') {
    return '/';
  }
  return String(value).replace(/\/+$/, '');
};
const buildUrl = (baseUrl, routePath) => (
  normalizePathname(routePath) === '/' ? baseUrl : `${baseUrl}${normalizePathname(routePath)}`
);
const buildPublicAssetUrl = (baseUrl, assetPath) => (
  `${normalizeSiteUrl(baseUrl)}${normalizePublicPath(assetPath)}`
);
const isLoopbackBaseUrl = (value) => {
  try {
    const hostname = new URL(value).hostname.replace(/^\[/, '').replace(/\]$/, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};
const buildRouteCandidates = (baseUrl, routePath) => {
  const normalized = normalizePathname(routePath);
  if (normalized === '/') {
    return [baseUrl, `${baseUrl}/index.html`];
  }

  const withSlash = `${baseUrl}${normalized}/`;
  const withIndex = `${baseUrl}${normalized}/index.html`;
  return [`${baseUrl}${normalized}`, withSlash, withIndex];
};
const reportPath = path.resolve(
  process.cwd(),
  argMap.get('--report') || 'reports/seo-postdeploy-smoke.json',
);
const timeoutMs = Number(argMap.get('--timeout-ms') || 15000);
const baseUrl = normalizeSiteUrl(argMap.get('--base-url') || process.env.VITE_SITE_URL || defaultSiteUrl);
const expectedSiteUrl = normalizeSiteUrl(
  argMap.get('--expected-site-url') || process.env.VITE_SITE_URL || defaultSiteUrl,
);
const googleSiteVerification = String(process.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
const naverSiteVerification = String(process.env.VITE_NAVER_SITE_VERIFICATION || '').trim();

const checks = [];
const failures = [];
const warnings = [];
const routeChecks = [];

const addCheck = (message) => checks.push(message);
const addFailure = (message) => failures.push(message);
const addWarning = (message) => warnings.push(message);
const ORGANIZATION_LOGO_PATH = '/favicon.png';

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        'user-agent': 'bega-seo-postdeploy-smoke/1.0',
      },
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

export const describeHttpStatusFailure = (response) => {
  const location = response.headers.get('location');
  if (location && response.status >= 300 && response.status < 400) {
    return `HTTP ${response.status} redirect location=${location}`;
  }
  return `HTTP ${response.status}`;
};

export const resolveRedirectLocation = (candidateUrl, location) => {
  if (!location) {
    return '';
  }

  try {
    return new URL(location, candidateUrl).toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
};

export const isRedirectToExpectedCanonical = (response, candidateUrl, canonicalUrl) => {
  if (response.status < 300 || response.status >= 400) {
    return false;
  }

  const location = response.headers.get('location');
  return resolveRedirectLocation(candidateUrl, location) === normalizeSiteUrl(canonicalUrl);
};

const readTextOrFail = async (response, label) => {
  if (!response.ok) {
    addFailure(`${label} 요청 실패: ${describeHttpStatusFailure(response)}`);
    return '';
  }
  return response.text();
};

const parseAttributes = (tag) => {
  const openTag = tag.match(/^<[^>]+>/)?.[0] ?? tag;
  const attrSource = openTag
    .replace(/^<\s*\/?\s*[^\s>/]+/i, '')
    .replace(/\/?\s*>$/i, '');
  const attrs = new Map();
  const attrRegex = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attrRegex.exec(attrSource)) !== null) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attrs;
};

const findVoidTags = (html, tagName) => (
  [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((match) => match[0])
);

const findElementTags = (html, tagName) => (
  [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi'))].map((match) => match[0])
);

const getAttr = (tag, attrName) => parseAttributes(tag).get(attrName.toLowerCase()) ?? '';

const findMetaByName = (html, name) => (
  findVoidTags(html, 'meta').filter((tag) => getAttr(tag, 'name').toLowerCase() === name.toLowerCase())
);

const findMetaByProperty = (html, property) => (
  findVoidTags(html, 'meta').filter((tag) => getAttr(tag, 'property').toLowerCase() === property.toLowerCase())
);

const findCanonicalLinks = (html) => (
  findVoidTags(html, 'link').filter((tag) => (
    getAttr(tag, 'rel').split(/\s+/).map((value) => value.toLowerCase()).includes('canonical')
  ))
);

const assertSingleTagValue = (messages, tags, label, attrName, expectedValue) => {
  if (tags.length !== 1) {
    messages.push(`${label} 태그 수 불일치(expected=1, actual=${tags.length})`);
    return;
  }

  const actualValue = getAttr(tags[0], attrName);
  if (actualValue !== expectedValue) {
    messages.push(`${label} 값 불일치(expected=${expectedValue}, actual=${actualValue})`);
  }
};

const stableJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const buildExpectedJsonLd = (route, expectedSiteUrl) => {
  const canonicalUrl = buildUrl(expectedSiteUrl, route.path);
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonicalUrl,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'BEGA',
      url: expectedSiteUrl,
    },
  };

  if (route.schemaType === 'home') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'BEGA',
        url: expectedSiteUrl,
        logo: buildPublicAssetUrl(expectedSiteUrl, ORGANIZATION_LOGO_PATH),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'BEGA',
        url: expectedSiteUrl,
        inLanguage: 'ko-KR',
      },
      webPage,
    ];
  }

  return [webPage];
};

const getElementInnerHtml = (tag) => tag.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/i, '');

const getSingleElementText = (html, tagName) => {
  const tags = findElementTags(html, tagName);
  return tags.length === 1 ? getElementInnerHtml(tags[0]).trim() : null;
};

const getSingleMetaContent = (html, name) => {
  const tags = findMetaByName(html, name);
  return tags.length === 1 ? getAttr(tags[0], 'content') : null;
};

export const summarizeHtmlContract = (html) => {
  const canonicalLinks = findCanonicalLinks(html);
  const jsonLdTags = findElementTags(html, 'script').filter(
    (tag) => getAttr(tag, 'type').toLowerCase() === 'application/ld+json',
  );

  return {
    title: getSingleElementText(html, 'title'),
    description: getSingleMetaContent(html, 'description'),
    robots: getSingleMetaContent(html, 'robots'),
    canonical: canonicalLinks.length === 1 ? getAttr(canonicalLinks[0], 'href') : null,
    h1: getSingleElementText(html, 'h1'),
    jsonLdCount: jsonLdTags.length,
    hasPrerenderMarker: html.includes('data-seo-prerender="true"'),
  };
};

export const validatePrerenderedHtmlContract = (html, route, options = {}) => {
  const messages = [];
  const contractSiteUrl = normalizeSiteUrl(options.expectedSiteUrl || expectedSiteUrl);
  const canonical = buildUrl(contractSiteUrl, route.path);
  const ogImage = buildPublicAssetUrl(contractSiteUrl, defaultOgImagePath);
  const googleVerification = String(options.googleSiteVerification ?? googleSiteVerification).trim();
  const naverVerification = String(options.naverSiteVerification ?? naverSiteVerification).trim();

  if (html.includes('SEO_HEAD_SLOT') || html.includes('SEO_ROOT_SLOT')) {
    messages.push('SEO 슬롯 문자열 잔존');
  }

  const titleTags = findElementTags(html, 'title');
  if (titleTags.length !== 1) {
    messages.push(`title 태그 수 불일치(expected=1, actual=${titleTags.length})`);
  } else {
    const title = getElementInnerHtml(titleTags[0]).trim();
    if (title !== escapeHtml(route.title)) {
      messages.push(`title 값 불일치(expected=${route.title}, actual=${title})`);
    }
  }

  assertSingleTagValue(messages, findMetaByName(html, 'description'), 'description', 'content', escapeHtml(route.description));
  assertSingleTagValue(messages, findMetaByName(html, 'robots'), 'robots', 'content', 'index,follow');
  assertSingleTagValue(messages, findCanonicalLinks(html), 'canonical', 'href', canonical);
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:type'), 'og:type', 'content', 'website');
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:title'), 'og:title', 'content', escapeHtml(route.title));
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:description'), 'og:description', 'content', escapeHtml(route.description));
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:url'), 'og:url', 'content', canonical);
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:image'), 'og:image', 'content', ogImage);
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:site_name'), 'og:site_name', 'content', 'BEGA');
  assertSingleTagValue(messages, findMetaByProperty(html, 'og:locale'), 'og:locale', 'content', 'ko_KR');
  assertSingleTagValue(messages, findMetaByName(html, 'twitter:card'), 'twitter:card', 'content', 'summary_large_image');
  assertSingleTagValue(messages, findMetaByName(html, 'twitter:title'), 'twitter:title', 'content', escapeHtml(route.title));
  assertSingleTagValue(messages, findMetaByName(html, 'twitter:description'), 'twitter:description', 'content', escapeHtml(route.description));
  assertSingleTagValue(messages, findMetaByName(html, 'twitter:image'), 'twitter:image', 'content', ogImage);

  const jsonLdTags = findElementTags(html, 'script').filter(
    (tag) => getAttr(tag, 'type').toLowerCase() === 'application/ld+json',
  );
  const expectedJsonLd = buildExpectedJsonLd(route, contractSiteUrl);
  if (jsonLdTags.length !== expectedJsonLd.length) {
    messages.push(`JSON-LD 태그 수 불일치(expected=${expectedJsonLd.length}, actual=${jsonLdTags.length})`);
  }
  jsonLdTags.forEach((tag, index) => {
    try {
      const parsed = JSON.parse(getElementInnerHtml(tag).trim());
      if (expectedJsonLd[index] && stableJson(parsed) !== stableJson(expectedJsonLd[index])) {
        messages.push(`JSON-LD[${index}] 값 불일치`);
      }
    } catch (error) {
      messages.push(`JSON-LD[${index}] 파싱 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  if (!html.includes('data-seo-prerender="true"')) {
    messages.push('SEO 프리렌더 본문 마커 누락');
  }

  const h1Tags = findElementTags(html, 'h1');
  if (h1Tags.length !== 1) {
    messages.push(`h1 태그 수 불일치(expected=1, actual=${h1Tags.length})`);
  } else {
    const h1 = getElementInnerHtml(h1Tags[0]).trim();
    if (h1 !== escapeHtml(route.heading)) {
      messages.push(`h1 값 불일치(expected=${route.heading}, actual=${h1})`);
    }
  }

  if (googleVerification) {
    assertSingleTagValue(
      messages,
      findMetaByName(html, 'google-site-verification'),
      'google-site-verification',
      'content',
      escapeHtml(googleVerification),
    );
  }

  if (naverVerification) {
    assertSingleTagValue(
      messages,
      findMetaByName(html, 'naver-site-verification'),
      'naver-site-verification',
      'content',
      escapeHtml(naverVerification),
    );
  }
  return messages;
};

const validateSitemapSet = (sitemapContent) => {
  const expected = new Set(indexableRoutes.map((route) => buildUrl(expectedSiteUrl, route.path)));
  const found = new Set(
    [...sitemapContent.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1].trim()),
  );

  for (const expectedUrl of expected) {
    if (!found.has(expectedUrl)) {
      addFailure(`sitemap 누락 URL: ${expectedUrl}`);
    }
  }
  for (const foundUrl of found) {
    if (!expected.has(foundUrl)) {
      addFailure(`sitemap 예상 외 URL: ${foundUrl}`);
    }
  }
  if (expected.size === found.size && failures.every((message) => !message.startsWith('sitemap'))) {
    addCheck('sitemap URL 집합이 SEO 정책과 일치');
  }
};

const main = async () => {
  if (!/^https?:\/\//.test(baseUrl)) {
    addFailure(`유효하지 않은 base URL: ${baseUrl}`);
  }

  const robotsUrl = `${baseUrl}/robots.txt`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  try {
    const robotsResponse = await fetchWithTimeout(robotsUrl);
    const robotsContent = await readTextOrFail(robotsResponse, 'robots.txt');
    if (robotsContent) {
      if (!robotsContent.includes('User-agent: *')) {
        addFailure('robots.txt User-agent 누락');
      }
      const sitemapLine = `Sitemap: ${expectedSiteUrl}/sitemap.xml`;
      if (!robotsContent.includes(sitemapLine)) {
        addFailure(`robots.txt sitemap 누락: ${sitemapLine}`);
      }
      for (const disallow of robotsDisallow) {
        const line = `Disallow: ${disallow}`;
        if (!robotsContent.includes(line)) {
          addFailure(`robots.txt Disallow 누락: ${line}`);
        }
      }
      addCheck('robots.txt 정책 검증');
    }
  } catch (error) {
    addFailure(`robots.txt 요청 예외: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const sitemapResponse = await fetchWithTimeout(sitemapUrl);
    const sitemapContent = await readTextOrFail(sitemapResponse, 'sitemap.xml');
    if (sitemapContent) {
      validateSitemapSet(sitemapContent);
    }
  } catch (error) {
    addFailure(`sitemap.xml 요청 예외: ${error instanceof Error ? error.message : String(error)}`);
  }

  for (const route of indexableRoutes) {
    const candidates = buildRouteCandidates(baseUrl, route.path);
    const canonicalUrl = buildUrl(expectedSiteUrl, route.path);
    const routeResult = { path: route.path, url: candidates[0], ok: false, status: 0, failures: [], candidates: [] };

    for (const [candidateIndex, candidateUrl] of candidates.entries()) {
      const candidateResult = {
        url: candidateUrl,
        finalUrl: candidateUrl,
        ok: false,
        status: 0,
        failures: [],
      };

      try {
        const response = await fetchWithTimeout(candidateUrl);
        candidateResult.status = response.status;
        candidateResult.finalUrl = response.url;
        if (!response.ok) {
          if (candidateIndex > 0 && isRedirectToExpectedCanonical(response, candidateUrl, canonicalUrl)) {
            candidateResult.ok = true;
            candidateResult.finalUrl = normalizeSiteUrl(canonicalUrl);
            candidateResult.redirectToCanonical = true;
            routeResult.candidates.push(candidateResult);
            continue;
          }

          candidateResult.failures.push(describeHttpStatusFailure(response));
          routeResult.candidates.push(candidateResult);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('text/html')) {
          candidateResult.failures.push(`content-type 불일치: ${contentType || '<empty>'}`);
          routeResult.candidates.push(candidateResult);
          continue;
        }

        const html = await response.text();
        candidateResult.htmlSummary = summarizeHtmlContract(html);
        const htmlFailures = validatePrerenderedHtmlContract(html, route, {
          expectedSiteUrl,
          googleSiteVerification,
          naverSiteVerification,
        });
        if (htmlFailures.length > 0) {
          candidateResult.failures.push(...htmlFailures);
          routeResult.candidates.push(candidateResult);
          continue;
        }

        candidateResult.ok = true;
        routeResult.candidates.push(candidateResult);
      } catch (error) {
        candidateResult.failures.push(error instanceof Error ? error.message : String(error));
        routeResult.candidates.push(candidateResult);
      }
    }

    routeResult.ok = routeResult.candidates.length === candidates.length &&
      routeResult.candidates.every((candidate) => candidate.ok);
    routeResult.status = routeResult.candidates[0]?.status || 0;
    routeResult.url = routeResult.candidates[0]?.finalUrl || candidates[0];

    if (!routeResult.ok) {
      routeResult.failures = routeResult.candidates.flatMap((candidate) => (
        candidate.failures.map((failure) => `${candidate.url} -> ${failure}`)
      ));
    }

    routeChecks.push(routeResult);
    if (!routeResult.ok) {
      for (const failure of routeResult.failures) {
        addFailure(`[${route.path}] ${failure}`);
      }
    }
  }

  if (routeChecks.every((route) => route.ok)) {
    addCheck('indexable route HTML contract가 SEO 정책/프리렌더 산출물과 일치');
  }

  addWarning('Post-deploy smoke는 단기 상태 점검이며, CWV 평가는 별도 기준선 리포트를 사용합니다.');
  if (baseUrl !== expectedSiteUrl) {
    addWarning(`baseUrl(${baseUrl})과 expectedSiteUrl(${expectedSiteUrl})이 다릅니다.`);
  }
  if (isLoopbackBaseUrl(baseUrl)) {
    addWarning(
      '로컬 Vite preview는 Cloudflare Worker/static asset routing과 다르게 no-slash 경로를 root SPA HTML로 응답할 수 있습니다. route alias 검증은 wrangler/prod smoke를 기준으로 판단하세요.',
    );
  }

  const result = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    baseUrl,
    expectedSiteUrl,
    timeoutMs,
    checks,
    failures,
    warnings,
    routes: routeChecks,
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

  if (!result.ok) {
    console.error('[seo:smoke:prod] FAILED');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    console.error(`[seo:smoke:prod] report: ${reportPath}`);
    process.exit(1);
  }

  console.log('[seo:smoke:prod] PASSED');
  for (const check of checks) {
    console.log(`- ${check}`);
  }
  for (const warning of warnings) {
    console.log(`- WARN: ${warning}`);
  }
  console.log(`[seo:smoke:prod] report: ${reportPath}`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[seo:smoke:prod] unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
