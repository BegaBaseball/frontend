import type { SeoRouteRule } from './routeSeo';

type JsonLd = Record<string, unknown>;

const buildOrganizationSchema = (siteUrl: string): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BEGA',
  url: siteUrl,
  logo: `${siteUrl}/favicon.png`,
});

const buildWebSiteSchema = (siteUrl: string): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BEGA',
  url: siteUrl,
  inLanguage: 'ko-KR',
});

const buildWebPageSchema = (rule: SeoRouteRule, siteUrl: string): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: rule.title,
  description: rule.description,
  url: rule.canonicalUrl,
  inLanguage: 'ko-KR',
  isPartOf: {
    '@type': 'WebSite',
    name: 'BEGA',
    url: siteUrl,
  },
});

export const buildStructuredData = (rule: SeoRouteRule, siteUrl: string): JsonLd[] => {
  const webPage = buildWebPageSchema(rule, siteUrl);

  if (rule.schemaType === 'home') {
    return [
      buildOrganizationSchema(siteUrl),
      buildWebSiteSchema(siteUrl),
      webPage,
    ];
  }

  return [webPage];
};
