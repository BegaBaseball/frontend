import rawSeoRoutes from '../../seo-routes.json';

type SchemaType = 'home' | 'page';

type SeoRouteConfig = {
  path: string;
  title: string;
  description: string;
  heading: string;
  schemaType: SchemaType;
  changefreq: string;
  priority: string;
};

type SeoPolicy = {
  defaultOgImagePath?: string;
  indexableRoutes: SeoRouteConfig[];
  noindexPrefixes: string[];
  noindexRegex: string[];
  robotsDisallow: string[];
};

const DEFAULT_SITE_URL = 'https://www.begabaseball.xyz';
const DEFAULT_TITLE = 'BEGA | KBO 야구 플랫폼';
const DEFAULT_DESCRIPTION = 'KBO 팬을 위한 경기 정보와 커뮤니티를 제공합니다.';
const DEFAULT_HEADING = 'BEGA';
const FALLBACK_OG_IMAGE_PATH = '/favicon.png';

const seoPolicy = rawSeoRoutes as SeoPolicy;
const viteEnv = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {});

const normalizeSiteUrl = (value: string): string => value.replace(/\/+$/, '');
const normalizePublicPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_OG_IMAGE_PATH;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};
const normalizePathname = (value: string): string => {
  if (!value) {
    return '/';
  }

  const pathOnly = value.split('?')[0].split('#')[0];
  if (!pathOnly || pathOnly === '/') {
    return '/';
  }

  return pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;
};

const matchesPrefix = (pathname: string, prefix: string): boolean => {
  const normalizedPrefix = normalizePathname(prefix);
  if (normalizedPrefix === '/') {
    return pathname === '/';
  }
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
};

const noindexRegexPatterns = seoPolicy.noindexRegex.map((pattern) => new RegExp(pattern));

const indexableRouteMap = new Map(
  seoPolicy.indexableRoutes.map((route) => [normalizePathname(route.path), route]),
);

export const SITE_URL = normalizeSiteUrl(viteEnv.VITE_SITE_URL || DEFAULT_SITE_URL);
export const DEFAULT_OG_IMAGE_PATH = normalizePublicPath(seoPolicy.defaultOgImagePath || FALLBACK_OG_IMAGE_PATH);
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;
export const INDEXABLE_ROUTE_PATHS = seoPolicy.indexableRoutes.map((route) => route.path);
export const PRERENDER_ROUTE_PATHS = [...INDEXABLE_ROUTE_PATHS];
export const ROBOTS_DISALLOW_PATHS = [...seoPolicy.robotsDisallow];

export type SeoRouteRule = {
  pathname: string;
  title: string;
  description: string;
  heading: string;
  canonicalUrl: string;
  robots: 'index,follow' | 'noindex,nofollow';
  og: {
    type: 'website';
    title: string;
    description: string;
    image: string;
    url: string;
  };
  twitterCard: 'summary_large_image';
  isIndexable: boolean;
  schemaType: SchemaType;
  prerender: boolean;
  changefreq: string;
  priority: string;
};

export const buildCanonicalUrl = (pathname: string): string => {
  const normalizedPath = normalizePathname(pathname);
  if (normalizedPath === '/') {
    return SITE_URL;
  }
  return `${SITE_URL}${normalizedPath}`;
};

const buildRule = (
  pathname: string,
  routeConfig: SeoRouteConfig | null,
  isIndexable: boolean,
): SeoRouteRule => {
  const normalizedPath = normalizePathname(pathname);
  const title = routeConfig?.title || DEFAULT_TITLE;
  const description = routeConfig?.description || DEFAULT_DESCRIPTION;
  const heading = routeConfig?.heading || DEFAULT_HEADING;
  const canonicalUrl = buildCanonicalUrl(normalizedPath);
  const robots: SeoRouteRule['robots'] = isIndexable ? 'index,follow' : 'noindex,nofollow';

  return {
    pathname: normalizedPath,
    title,
    description,
    heading,
    canonicalUrl,
    robots,
    og: {
      type: 'website',
      title,
      description,
      image: DEFAULT_OG_IMAGE_URL,
      url: canonicalUrl,
    },
    twitterCard: 'summary_large_image',
    isIndexable,
    schemaType: routeConfig?.schemaType || 'page',
    prerender: isIndexable,
    changefreq: routeConfig?.changefreq || 'weekly',
    priority: routeConfig?.priority || '0.5',
  };
};

const isNoindexPath = (pathname: string): boolean => {
  if (seoPolicy.noindexPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) {
    return true;
  }

  return noindexRegexPatterns.some((pattern) => pattern.test(pathname));
};

export const getSeoRouteRule = (pathname: string): SeoRouteRule => {
  const normalizedPath = normalizePathname(pathname);
  const routeConfig = indexableRouteMap.get(normalizedPath) || null;

  if (routeConfig) {
    return buildRule(normalizedPath, routeConfig, true);
  }

  if (isNoindexPath(normalizedPath)) {
    return buildRule(normalizedPath, null, false);
  }

  return buildRule(normalizedPath, null, false);
};
