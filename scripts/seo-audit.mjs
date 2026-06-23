import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalUrlForPath,
  distDir,
  expectedNoindexPrefixes,
  expectedNoindexRegex,
  indexableRoutes,
  noindexPrefixes,
  noindexRegex,
  robotsDisallow,
  routeToOutputFile,
  seoPolicyPath,
  siteUrl,
} from './seo-policy.mjs';
import { createSeoRuntimeEnvReader } from './seo-runtime-env.mjs';

const args = process.argv.slice(2);
let reportPath = '';

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--report') {
    reportPath = args[index + 1] || '';
    index += 1;
  }
}

const failures = [];
const warnings = [];
const checks = [];

const addFailure = (message) => failures.push(message);
const addWarning = (message) => warnings.push(message);
const addCheck = (message) => checks.push(message);

const hasHangul = (value) => /[가-힣]/.test(value);
const plainTextLength = (value) => [...String(value || '').trim()].length;
const readEnvValue = createSeoRuntimeEnvReader();
const gaMeasurementId = readEnvValue('VITE_GA4_MEASUREMENT_ID').value;
const googleSiteVerification = readEnvValue('VITE_GOOGLE_SITE_VERIFICATION').value;
const naverSiteVerification = readEnvValue('VITE_NAVER_SITE_VERIFICATION').value;
const hasGaMeasurementId = Boolean(gaMeasurementId);
const hasGoogleSiteVerification = Boolean(googleSiteVerification);
const hasNaverSiteVerification = Boolean(naverSiteVerification);
const PLACEHOLDER_VERIFICATION_PATTERNS = [
  /replace-with-real/i,
  /placeholder/i,
  /example/i,
  /google-site-verification-token/i,
  /naver-site-verification-token/i,
];

const looksLikePlaceholder = (value) => (
  PLACEHOLDER_VERIFICATION_PATTERNS.some((pattern) => pattern.test(String(value || '')))
);

const readMetaContent = (html, metaName) => {
  const escapedMetaName = metaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagMatch = html.match(new RegExp(`<meta[^>]*name=["']${escapedMetaName}["'][^>]*>`, 'i'));
  if (!tagMatch) {
    return null;
  }
  const contentMatch = tagMatch[0].match(/content\s*=\s*["']([^"']*)["']/i);
  if (!contentMatch) {
    return '';
  }
  return contentMatch[1].trim();
};

const assertVerificationTag = (html, routePath, metaName, expectedValue, label) => {
  const actualValue = readMetaContent(html, metaName);
  if (actualValue === null) {
    addFailure(`[${routePath}] ${label} 메타 태그가 없습니다.`);
    return false;
  }
  if (actualValue !== expectedValue) {
    addFailure(`[${routePath}] ${label} 메타 값이 일치하지 않습니다.`);
    return false;
  }
  return true;
};

if (hasGoogleSiteVerification) {
  if (looksLikePlaceholder(googleSiteVerification)) {
    addWarning(`VITE_GOOGLE_SITE_VERIFICATION 값이 플레이스홀더로 보입니다.`);
  }
} else {
  addWarning('VITE_GOOGLE_SITE_VERIFICATION 미설정: dist HTML의 google-site-verification 검증을 건너뜁니다.');
}

if (hasNaverSiteVerification) {
  if (looksLikePlaceholder(naverSiteVerification)) {
    addWarning(`VITE_NAVER_SITE_VERIFICATION 값이 플레이스홀더로 보입니다.`);
  }
} else {
  addWarning('VITE_NAVER_SITE_VERIFICATION 미설정: dist HTML의 naver-site-verification 검증을 건너뜁니다.');
}

const readFile = (filePath) => fs.readFileSync(filePath, 'utf-8');

if (!fs.existsSync(distDir)) {
  addFailure('dist 디렉터리가 없습니다. 먼저 build를 실행하세요.');
}

const robotsPath = path.join(distDir, 'robots.txt');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const prerenderReportPath = path.join(distDir, 'seo-prerender-report.json');

if (!fs.existsSync(robotsPath)) {
  addFailure('dist/robots.txt 파일이 없습니다.');
}

if (!fs.existsSync(sitemapPath)) {
  addFailure('dist/sitemap.xml 파일이 없습니다.');
}

if (!fs.existsSync(prerenderReportPath)) {
  addFailure('dist/seo-prerender-report.json 파일이 없습니다.');
}

if (!failures.length) {
  const prerenderReportRaw = readFile(prerenderReportPath);
  let prerenderReport;
  try {
    prerenderReport = JSON.parse(prerenderReportRaw);
  } catch (error) {
    addFailure(`seo-prerender-report.json 파싱 실패: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (Array.isArray(prerenderReport)) {
    if (prerenderReport.length !== indexableRoutes.length) {
      addFailure(`프리렌더 리포트 route 수 불일치: expected=${indexableRoutes.length}, actual=${prerenderReport.length}`);
    } else {
      const reportPathSet = new Set(prerenderReport.map((entry) => entry?.path));
      for (const route of indexableRoutes) {
        if (!reportPathSet.has(route.path)) {
          addFailure(`프리렌더 리포트 path 누락: ${route.path}`);
        }
      }
      addCheck('seo-prerender-report.json route 수/경로 확인');
    }
  }

  const robotsContent = readFile(robotsPath);
  if (!robotsContent.includes('User-agent: *')) {
    addFailure('robots.txt에 User-agent 규칙이 없습니다.');
  } else {
    addCheck('robots.txt user-agent 규칙 확인');
  }

  const expectedSitemapLine = `Sitemap: ${siteUrl}/sitemap.xml`;
  if (!robotsContent.includes(expectedSitemapLine)) {
    addFailure(`robots.txt에 sitemap 경로가 누락되었습니다: ${expectedSitemapLine}`);
  } else {
    addCheck('robots.txt sitemap 링크 확인');
  }

  for (const disallow of robotsDisallow) {
    const line = `Disallow: ${disallow}`;
    if (!robotsContent.includes(line)) {
      addFailure(`robots.txt Disallow 누락: ${line}`);
    }
  }

  const sitemapContent = readFile(sitemapPath);
  for (const route of indexableRoutes) {
    const loc = `<loc>${canonicalUrlForPath(route.path)}</loc>`;
    if (!sitemapContent.includes(loc)) {
      addFailure(`sitemap.xml 경로 누락: ${route.path}`);
    }
  }
  addCheck('sitemap.xml indexable 라우트 확인');

  const assetsDir = path.join(distDir, 'assets');
  const requiredGaTokens = ['bega-ga4-script', '__BEGA_GA4_INITIALIZED__'];
  if (!hasGaMeasurementId) {
    addWarning('VITE_GA4_MEASUREMENT_ID 미설정: GA 중복 방어 토큰 검사를 건너뜁니다.');
  } else if (!fs.existsSync(assetsDir)) {
    addFailure('dist/assets 디렉터리가 없습니다. 번들 산출물을 확인하세요.');
  } else {
    const jsAssets = fs.readdirSync(assetsDir).filter((fileName) => fileName.endsWith('.js'));
    if (!jsAssets.length) {
      addFailure('dist/assets 하위에 JS 번들 파일이 없습니다.');
    } else {
      const tokenFoundMap = new Map(requiredGaTokens.map((token) => [token, false]));
      for (const fileName of jsAssets) {
        const content = readFile(path.join(assetsDir, fileName));
        for (const token of requiredGaTokens) {
          if (!tokenFoundMap.get(token) && content.includes(token)) {
            tokenFoundMap.set(token, true);
          }
        }
      }

      for (const token of requiredGaTokens) {
        if (!tokenFoundMap.get(token)) {
          addFailure(`GA 중복 방어 토큰 누락: ${token}`);
        }
      }
      addCheck('번들 내 GA 중복 방어 토큰 확인');
    }
  }

  for (const route of indexableRoutes) {
    const outputFile = routeToOutputFile(route.path);
    if (!fs.existsSync(outputFile)) {
      addFailure(`프리렌더 출력 누락: ${path.relative(distDir, outputFile)}`);
      continue;
    }

    const html = readFile(outputFile);
    if (html.includes('SEO_HEAD_SLOT') || html.includes('SEO_ROOT_SLOT')) {
      addFailure(`[${route.path}] SEO 슬롯 문자열이 결과 HTML에 남아 있습니다.`);
    }
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const titleLength = plainTextLength(title);
    if (!title) {
      addFailure(`[${route.path}] title 태그가 없습니다.`);
    } else if (hasHangul(title) && titleLength > 30) {
      addFailure(`[${route.path}] title 길이 초과(한글 기준): ${titleLength}자`);
    } else if (titleLength > 60) {
      addFailure(`[${route.path}] title 길이 초과(영문 기준): ${titleLength}자`);
    }

    const descriptionMatch = html.match(/<meta name="description" content="([^"]*)"/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    const descriptionLength = plainTextLength(description);
    if (!description) {
      addFailure(`[${route.path}] meta description 누락`);
    } else if (hasHangul(description) && descriptionLength > 60) {
      addFailure(`[${route.path}] description 길이 초과(한글 기준): ${descriptionLength}자`);
    } else if (descriptionLength > 160) {
      addFailure(`[${route.path}] description 길이 초과(영문 기준): ${descriptionLength}자`);
    }

    const canonical = canonicalUrlForPath(route.path);
    if (!new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`, 'i').test(html)) {
      addFailure(`[${route.path}] canonical 태그 누락 또는 값 불일치`);
    }

    if (!/<meta name="robots" content="index,follow">/i.test(html)) {
      addFailure(`[${route.path}] robots index,follow 누락`);
    }

    if (!/<meta property="og:title" content="/i.test(html)) {
      addFailure(`[${route.path}] og:title 누락`);
    }
    if (!/<meta property="og:description" content="/i.test(html)) {
      addFailure(`[${route.path}] og:description 누락`);
    }
    if (!/<meta property="og:image" content="/i.test(html)) {
      addFailure(`[${route.path}] og:image 누락`);
    }

    if (!/<script type="application\/ld\+json"/i.test(html)) {
      addFailure(`[${route.path}] JSON-LD 구조화데이터 누락`);
    }

    if (!/<h1[\s>]/i.test(html)) {
      addFailure(`[${route.path}] 프리렌더 본문 h1 누락`);
    }

    if (hasGoogleSiteVerification) {
      assertVerificationTag(html, route.path, 'google-site-verification', googleSiteVerification, 'Google Search Console 검증');
    }
    if (hasNaverSiteVerification) {
      assertVerificationTag(html, route.path, 'naver-site-verification', naverSiteVerification, 'Naver 웹마스터 검증');
    }
  }
  addCheck('프리렌더 HTML 메타/구조화데이터 검증');
}

for (const prefix of expectedNoindexPrefixes) {
  if (!noindexPrefixes.includes(prefix)) {
    addFailure(`seo-routes.json noindexPrefixes 누락: ${prefix}`);
  }
}
for (const pattern of expectedNoindexRegex) {
  if (!noindexRegex.includes(pattern)) {
    addFailure(`seo-routes.json noindexRegex 누락: ${pattern}`);
  }
}
addCheck(`noindex 정책 확인 (${seoPolicyPath})`);
if (hasGoogleSiteVerification) {
  addCheck('google-site-verification 메타 값 검증');
}
if (hasNaverSiteVerification) {
  addCheck('naver-site-verification 메타 값 검증');
}

addWarning('Core Web Vitals(Lighthouse/PageSpeed)는 네트워크 변동성으로 현재 경고 전용입니다.');

const result = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  siteUrl,
  checks,
  failures,
  warnings,
};

if (reportPath) {
  const absoluteReportPath = path.resolve(process.cwd(), reportPath);
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  fs.writeFileSync(absoluteReportPath, JSON.stringify(result, null, 2), 'utf-8');
}

if (failures.length) {
  console.error('[seo:check] FAILED');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (reportPath) {
    console.error(`[seo:check] report: ${path.resolve(process.cwd(), reportPath)}`);
  }
  process.exit(1);
}

console.log('[seo:check] PASSED');
for (const check of checks) {
  console.log(`- ${check}`);
}
for (const warning of warnings) {
  console.log(`- WARN: ${warning}`);
}
if (reportPath) {
  console.log(`[seo:check] report: ${path.resolve(process.cwd(), reportPath)}`);
}
