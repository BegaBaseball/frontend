import fs from 'node:fs';
import path from 'node:path';
import {
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
const normalizePathname = (value) => {
  if (!value || value === '/') {
    return '/';
  }
  return String(value).replace(/\/+$/, '');
};
const buildUrl = (baseUrl, routePath) => (
  normalizePathname(routePath) === '/' ? baseUrl : `${baseUrl}${normalizePathname(routePath)}`
);
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

const checks = [];
const failures = [];
const warnings = [];
const routeChecks = [];

const addCheck = (message) => checks.push(message);
const addFailure = (message) => failures.push(message);
const addWarning = (message) => warnings.push(message);

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        'user-agent': 'bega-seo-postdeploy-smoke/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const readTextOrFail = async (response, label) => {
  if (!response.ok) {
    addFailure(`${label} 요청 실패: status=${response.status}`);
    return '';
  }
  return response.text();
};

const validateHeadTags = (html, routePath) => {
  const messages = [];
  const canonical = buildUrl(expectedSiteUrl, routePath);
  if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
    messages.push('title 누락');
  }
  if (!/<meta name="description" content="[^"]+"/i.test(html)) {
    messages.push('description 누락');
  }
  if (!new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`, 'i').test(html)) {
    messages.push('canonical 누락/불일치');
  }
  if (!/<meta property="og:title" content="[^"]+"/i.test(html)) {
    messages.push('og:title 누락');
  }
  if (!/<meta property="og:description" content="[^"]+"/i.test(html)) {
    messages.push('og:description 누락');
  }
  if (!/<meta property="og:image" content="[^"]+"/i.test(html)) {
    messages.push('og:image 누락');
  }
  if (!/<script type="application\/ld\+json"/i.test(html)) {
    messages.push('JSON-LD 누락');
  }
  if (!/<h1[\s>]/i.test(html)) {
    messages.push('h1 누락');
  }
  if (html.includes('SEO_HEAD_SLOT') || html.includes('SEO_ROOT_SLOT')) {
    messages.push('SEO 슬롯 문자열 잔존');
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
    const routeResult = { path: route.path, url: candidates[0], ok: false, status: 0, failures: [] };
    const candidateFailures = [];

    for (const candidateUrl of candidates) {
      try {
        const response = await fetchWithTimeout(candidateUrl);
        routeResult.status = response.status;
        if (!response.ok) {
          candidateFailures.push(`${candidateUrl} -> HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        const htmlFailures = validateHeadTags(html, route.path);
        if (htmlFailures.length > 0) {
          candidateFailures.push(`${candidateUrl} -> ${htmlFailures.join(', ')}`);
          continue;
        }

        routeResult.ok = true;
        routeResult.url = candidateUrl;
        routeResult.failures = [];
        break;
      } catch (error) {
        candidateFailures.push(`${candidateUrl} -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!routeResult.ok) {
      routeResult.failures = candidateFailures;
    }

    routeChecks.push(routeResult);
    if (!routeResult.ok) {
      for (const failure of routeResult.failures) {
        addFailure(`[${route.path}] ${failure}`);
      }
    }
  }

  addWarning('Post-deploy smoke는 단기 상태 점검이며, CWV 평가는 별도 기준선 리포트를 사용합니다.');
  if (baseUrl !== expectedSiteUrl) {
    addWarning(`baseUrl(${baseUrl})과 expectedSiteUrl(${expectedSiteUrl})이 다릅니다.`);
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

main().catch((error) => {
  console.error(`[seo:smoke:prod] unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
