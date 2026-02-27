import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalUrlForPath,
  distDir,
  ensureDir,
  escapeHtml,
  indexableRoutes,
  routeToOutputFile,
  siteUrl,
} from './seo-policy.mjs';

const templatePath = path.join(distDir, 'index.html');
const SEO_HEAD_SLOT = '<!-- SEO_HEAD_SLOT -->';
const SEO_ROOT_SLOT = '<!-- SEO_ROOT_SLOT -->';

if (!fs.existsSync(templatePath)) {
  console.error('[seo:prerender] dist/index.html not found. Run build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(templatePath, 'utf-8');
const fallbackModes = [];

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

const buildSeoHeadMarkup = (route) => {
  const canonicalUrl = canonicalUrlForPath(route.path);
  const ogImage = `${siteUrl}/favicon.png`;
  const jsonLdList = buildStructuredData(route);
  const jsonLdTags = jsonLdList
    .map(
      (item, index) => `<script type="application/ld+json" data-seo-jsonld="${index}">${JSON.stringify(item)}</script>`,
    )
    .join('\n');

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
    jsonLdTags,
    '<!-- SEO:END -->',
  ].join('\n');

  return seoBlock;
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

const buildRootMarkup = (route) => (
  [
    '<!-- SEO-PRERENDER:START -->',
    '<main data-seo-prerender="true">',
    `<h1>${escapeHtml(route.heading)}</h1>`,
    `<p>${escapeHtml(route.description)}</p>`,
    '</main>',
    '<!-- SEO-PRERENDER:END -->',
  ].join('')
);

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

const report = [];

try {
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
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

const reportPath = path.join(distDir, 'seo-prerender-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

if (fallbackModes.length > 0) {
  console.warn('[seo:prerender] fallback injection mode used:');
  fallbackModes.forEach((entry) => console.warn(`- ${entry}`));
}

console.log(`[seo:prerender] prerendered ${report.length} route(s).`);
