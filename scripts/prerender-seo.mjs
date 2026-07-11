import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalUrlForPath,
  defaultOgImageUrl,
  distDir,
  ensureDir,
  escapeHtml,
  indexableRoutes,
  routeToOutputFile,
  siteUrl,
} from './seo-policy.mjs';
import { createSeoRuntimeEnvReader } from './seo-runtime-env.mjs';

const templatePath = path.join(distDir, 'index.html');
const SEO_HEAD_SLOT = '<!-- SEO_HEAD_SLOT -->';
const SEO_ROOT_SLOT = '<!-- SEO_ROOT_SLOT -->';
const performanceOnlyRoutes = [
  {
    path: '/prediction',
    title: '승부예측 | BEGA',
    description: 'KBO 경기 승부를 예측하고 결과를 확인하세요.',
    heading: 'KBO 승부예측',
    performanceShell: true,
  },
  {
    path: '/mate',
    title: '직관 메이트 | BEGA',
    description: '경기 일정과 좌석을 기준으로 함께 직관할 메이트를 찾아보세요.',
    heading: '직관 메이트 찾기',
    performanceShell: true,
  },
];

export const readSiteVerificationEnv = (options = {}) => {
  const readEnvValue = createSeoRuntimeEnvReader(options);
  return {
    googleSiteVerification: readEnvValue('VITE_GOOGLE_SITE_VERIFICATION').value,
    naverSiteVerification: readEnvValue('VITE_NAVER_SITE_VERIFICATION').value,
  };
};

const stripManagedSeoBlock = (html) => (
  html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g, '')
);

const stripManagedRootBlock = (html) => (
  html.replace(/<!-- SEO-PRERENDER:START -->[\s\S]*?<!-- SEO-PRERENDER:END -->/g, '')
);

const buildStructuredData = (route) => {
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonicalUrlForPath(route.path),
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'BEGA',
      url: siteUrl,
    },
  };

  if (route.schemaType === 'home') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'BEGA',
        url: siteUrl,
        logo: `${siteUrl}/favicon.png`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'BEGA',
        url: siteUrl,
        inLanguage: 'ko-KR',
      },
      webPage,
    ];
  }

  return [webPage];
};

export const buildSeoHeadMarkup = (route, siteVerification = readSiteVerificationEnv()) => {
  const canonicalUrl = canonicalUrlForPath(route.path);
  const ogImage = defaultOgImageUrl;
  const jsonLdList = buildStructuredData(route);
  const jsonLdTags = jsonLdList
    .map(
      (item, index) => `<script type="application/ld+json" data-seo-jsonld="${index}">${JSON.stringify(item)}</script>`,
    )
    .join('\n');
  const { googleSiteVerification, naverSiteVerification } = siteVerification;
  const siteVerificationTags = [
    googleSiteVerification
      ? `<meta name="google-site-verification" content="${escapeHtml(googleSiteVerification)}">`
      : '',
    naverSiteVerification
      ? `<meta name="naver-site-verification" content="${escapeHtml(naverSiteVerification)}">`
      : '',
  ].filter(Boolean);

  const seoBlock = [
    '<!-- SEO:START -->',
    `<meta name="description" content="${escapeHtml(route.description)}">`,
    '<meta name="robots" content="index,follow">',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${escapeHtml(route.title)}">`,
    `<meta property="og:description" content="${escapeHtml(route.description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}">`,
    '<meta property="og:site_name" content="BEGA">',
    '<meta property="og:locale" content="ko_KR">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`,
    ...siteVerificationTags,
    jsonLdTags,
    '<!-- SEO:END -->',
  ].join('\n');

  return seoBlock;
};

export const buildPerformanceRouteHeadMarkup = (route) => (
  [
    '<!-- SEO:START -->',
    `<meta name="description" content="${escapeHtml(route.description)}">`,
    '<meta name="robots" content="noindex,nofollow">',
    '<!-- SEO:END -->',
  ].join('\n')
);

const injectPerformanceRouteHead = (html, route) => {
  let next = stripManagedSeoBlock(html);
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  const headBlock = buildPerformanceRouteHeadMarkup(route);

  if (next.includes(SEO_HEAD_SLOT)) {
    return next.replace(SEO_HEAD_SLOT, headBlock);
  }
  if (/<\/head>/i.test(next)) {
    return next.replace(/<\/head>/i, `${headBlock}\n</head>`);
  }
  throw new Error(`[seo:prerender] Performance route head injection failed for route "${route.path}". Missing </head>.`);
};

const injectSeoHead = (html, route) => {
  let next = stripManagedSeoBlock(html);
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  const seoBlock = buildSeoHeadMarkup(route);

  if (next.includes(SEO_HEAD_SLOT)) {
    return {
      html: next.replace(SEO_HEAD_SLOT, seoBlock),
      mode: 'slot',
    };
  }

  if (/<\/head>/i.test(next)) {
    return {
      html: next.replace(/<\/head>/i, `${seoBlock}\n</head>`),
      mode: 'fallback-head',
    };
  }

  throw new Error(
    `[seo:prerender] SEO head injection failed for route "${route.path}". Missing ${SEO_HEAD_SLOT} and </head> in ${templatePath}`,
  );
};

export const buildRootMarkup = (route) => {
  const performanceShellAttributes = route.performanceShell
    ? ' data-performance-prerender="true" style="position:fixed;inset:0;z-index:1;display:flex;min-height:100vh;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:inherit;color:inherit;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"'
    : '';
  const headingStyle = route.performanceShell
    ? ' style="margin:0;font-size:24px;line-height:1.3;font-weight:800"'
    : '';
  const descriptionStyle = route.performanceShell
    ? ' style="margin:12px 0 0;max-width:22rem;font-size:20px;line-height:1.6;font-weight:600;opacity:.72"'
    : '';

  return [
    '<!-- SEO-PRERENDER:START -->',
    `<main data-seo-prerender="true"${performanceShellAttributes}>`,
    `<h1${headingStyle}>${escapeHtml(route.heading)}</h1>`,
    `<p${descriptionStyle}>${escapeHtml(route.description)}</p>`,
    '</main>',
    '<!-- SEO-PRERENDER:END -->',
  ].join('');
};

const injectSeoRoot = (html, route) => {
  const rootMarkup = buildRootMarkup(route);
  let next = stripManagedRootBlock(html);

  if (next.includes(SEO_ROOT_SLOT)) {
    return {
      html: next.replace(SEO_ROOT_SLOT, rootMarkup),
      mode: 'slot',
    };
  }

  if (next.includes('<div id="root"></div>')) {
    return {
      html: next.replace('<div id="root"></div>', `<div id="root">${rootMarkup}</div>`),
      mode: 'fallback-root-empty',
    };
  }

  const rootTagRegex = /(<div\s+id=(['"])root\2[^>]*>)[\s\S]*?(<\/div>)/i;
  if (rootTagRegex.test(next)) {
    return {
      html: next.replace(rootTagRegex, `$1${rootMarkup}$3`),
      mode: 'fallback-root-generic',
    };
  }

  throw new Error(
    `[seo:prerender] SEO root injection failed for route "${route.path}". Missing ${SEO_ROOT_SLOT} and <div id="root">...</div> in ${templatePath}`,
  );
};

export const prerenderSeo = () => {
  if (!fs.existsSync(templatePath)) {
    console.error('[seo:prerender] dist/index.html not found. Run build first.');
    return 1;
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');
  const fallbackModes = [];
  const report = [];

  for (const route of indexableRoutes) {
    const headResult = injectSeoHead(baseHtml, route);
    const rootResult = injectSeoRoot(headResult.html, route);

    if (headResult.mode !== 'slot') {
      fallbackModes.push(`${route.path}: ${headResult.mode}`);
    }
    if (rootResult.mode !== 'slot') {
      fallbackModes.push(`${route.path}: ${rootResult.mode}`);
    }

    const outputFile = routeToOutputFile(route.path);
    ensureDir(path.dirname(outputFile));
    fs.writeFileSync(outputFile, rootResult.html, 'utf-8');
    report.push({
      path: route.path,
      file: path.relative(distDir, outputFile),
      headInjection: headResult.mode,
      rootInjection: rootResult.mode,
    });
  }

  const reportPath = path.join(distDir, 'seo-prerender-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  const performanceReport = [];
  for (const route of performanceOnlyRoutes) {
    const htmlWithHead = injectPerformanceRouteHead(baseHtml, route);
    const rootResult = injectSeoRoot(htmlWithHead, route);
    const outputFile = routeToOutputFile(route.path);
    ensureDir(path.dirname(outputFile));
    fs.writeFileSync(outputFile, rootResult.html, 'utf-8');
    performanceReport.push({
      path: route.path,
      file: path.relative(distDir, outputFile),
      robots: 'noindex,nofollow',
      modulePreloads: [],
    });
  }
  const performanceReportPath = path.join(distDir, 'performance-prerender-report.json');
  fs.writeFileSync(performanceReportPath, JSON.stringify(performanceReport, null, 2), 'utf-8');

  if (fallbackModes.length > 0) {
    console.warn('[seo:prerender] fallback injection mode used:');
    fallbackModes.forEach((entry) => console.warn(`- ${entry}`));
  }

  console.log(`[seo:prerender] prerendered ${report.length} indexable and ${performanceReport.length} performance route(s).`);
  return 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const exitCode = prerenderSeo();
    if (exitCode) {
      process.exit(exitCode);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
