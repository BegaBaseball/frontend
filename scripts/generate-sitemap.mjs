import fs from 'node:fs';
import path from 'node:path';
import { canonicalUrlForPath, distDir, indexableRoutes } from './seo-policy.mjs';

if (!fs.existsSync(distDir)) {
  console.error('[seo:sitemap] dist directory not found. Run build first.');
  process.exit(1);
}

const today = new Date().toISOString().split('T')[0];
const urls = indexableRoutes.map((route) => {
  const loc = canonicalUrlForPath(route.path);
  const changefreq = route.changefreq || 'weekly';
  const priority = route.priority || '0.5';
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  '</urlset>',
  '',
].join('\n');

const sitemapPath = path.join(distDir, 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf-8');

console.log(`[seo:sitemap] generated ${sitemapPath}`);
