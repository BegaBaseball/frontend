import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'seo-routes.json');

const rawPolicy = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
const defaultSiteUrl = 'https://www.begabaseball.xyz';

export const siteUrl = (process.env.VITE_SITE_URL || defaultSiteUrl).replace(/\/+$/, '');
const normalizePublicPath = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '/favicon.png';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};
export const defaultOgImagePath = normalizePublicPath(rawPolicy.defaultOgImagePath || '/favicon.png');
export const defaultOgImageUrl = `${siteUrl}${defaultOgImagePath}`;
export const indexableRoutes = rawPolicy.indexableRoutes;
export const noindexPrefixes = rawPolicy.noindexPrefixes;
export const noindexRegex = rawPolicy.noindexRegex;
export const robotsDisallow = rawPolicy.robotsDisallow;
export const distDir = path.join(projectRoot, 'dist');
export const srcDir = path.join(projectRoot, 'src');
export const seoPolicyPath = policyPath;

export const normalizePathname = (value) => {
  if (!value) {
    return '/';
  }
  const pathOnly = String(value).split('?')[0].split('#')[0];
  if (!pathOnly || pathOnly === '/') {
    return '/';
  }
  return pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;
};

export const routeToOutputFile = (routePath) => {
  const normalized = normalizePathname(routePath);
  if (normalized === '/') {
    return path.join(distDir, 'index.html');
  }
  const relativePath = normalized.replace(/^\//, '');
  return path.join(distDir, relativePath, 'index.html');
};

export const canonicalUrlForPath = (routePath) => {
  const normalized = normalizePathname(routePath);
  if (normalized === '/') {
    return siteUrl;
  }
  return `${siteUrl}${normalized}`;
};

export const ensureDir = (targetDir) => {
  fs.mkdirSync(targetDir, { recursive: true });
};

export const escapeHtml = (value) => (
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);

export const expectedNoindexPrefixes = [
  '/login',
  '/signup',
  '/password',
  '/oauth',
  '/admin',
  '/mypage',
  '/mate',
  '/prediction',
  '/payment',
  '/test',
];

export const expectedNoindexRegex = [
  '^/cheer/[^/]+$',
  '^/profile/[^/]+$',
  '^/predictions/ranking/share/[^/]+/[^/]+$',
];
