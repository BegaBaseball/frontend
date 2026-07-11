import { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { buildStructuredData } from './structuredData';
import { getSeoRouteRule, SITE_URL } from './routeSeo';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __BEGA_GA4_INITIALIZED__?: boolean;
  }
}

const GA4_MEASUREMENT_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID || '').trim();
const GOOGLE_SITE_VERIFICATION = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
const NAVER_SITE_VERIFICATION = (import.meta.env.VITE_NAVER_SITE_VERIFICATION || '').trim();
const GA4_READY_EVENT_NAME = 'bega:ga4-ready';

const GA4_IDLE_TIMEOUT_MS = 3000;

const ensureGa4Queue = () => {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }
};

const appendGa4Script = () => {
  const scriptId = 'bega-ga4-script';
  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  const existingById = document.getElementById(scriptId);
  const existingBySrc = document.querySelector(`script[src="${scriptSrc}"]`);

  if (!existingById && !existingBySrc) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = scriptSrc;
    document.head.appendChild(script);
  } else if (!existingById && existingBySrc instanceof HTMLScriptElement) {
    existingBySrc.id = scriptId;
  }
};

const scheduleGa4ScriptLoad = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let canceled = false;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (canceled) {
      return;
    }
    appendGa4Script();
  };

  const scheduleIdle = () => {
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(run, { timeout: GA4_IDLE_TIMEOUT_MS });
      return;
    }

    timeoutId = globalThis.setTimeout(run, GA4_IDLE_TIMEOUT_MS);
  };

  if (document.readyState === 'complete') {
    scheduleIdle();
  } else {
    window.addEventListener('load', scheduleIdle, { once: true });
  }

  return () => {
    canceled = true;
    window.removeEventListener('load', scheduleIdle);
    if (idleId !== null && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  };
};

export default function SeoHead() {
  const location = useLocation();
  const hasMountedRef = useRef(false);
  const rule = useMemo(
    () => getSeoRouteRule(location.pathname),
    [location.pathname],
  );
  const jsonLdPayload = useMemo(
    () => buildStructuredData(rule, SITE_URL),
    [rule],
  );

  useEffect(() => {
    if (!GA4_MEASUREMENT_ID || typeof document === 'undefined') {
      return;
    }

    ensureGa4Queue();

    if (!window.__BEGA_GA4_INITIALIZED__) {
      window.gtag!('js', new Date());
      window.gtag!('config', GA4_MEASUREMENT_ID);
      window.__BEGA_GA4_INITIALIZED__ = true;
    }
    window.dispatchEvent(new Event(GA4_READY_EVENT_NAME));

    return scheduleGa4ScriptLoad();
  }, []);

  useEffect(() => {
    if (!GA4_MEASUREMENT_ID) {
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return;
    }

    const pagePath = `${location.pathname}${location.search || ''}`;
    window.gtag('config', GA4_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: rule.title,
    });
  }, [location.pathname, location.search, rule.title]);

  return (
    <Helmet prioritizeSeoTags>
      <html lang="ko" />

      <title>{rule.title}</title>
      <meta name="description" content={rule.description} />
      <meta name="robots" content={rule.robots} />

      <link rel="canonical" href={rule.canonicalUrl} />

      <meta property="og:type" content={rule.og.type} />
      <meta property="og:title" content={rule.og.title} />
      <meta property="og:description" content={rule.og.description} />
      <meta property="og:url" content={rule.og.url} />
      <meta property="og:image" content={rule.og.image} />
      <meta property="og:site_name" content="BEGA" />
      <meta property="og:locale" content="ko_KR" />

      <meta name="twitter:card" content={rule.twitterCard} />
      <meta name="twitter:title" content={rule.title} />
      <meta name="twitter:description" content={rule.description} />
      <meta name="twitter:image" content={rule.og.image} />

      {GOOGLE_SITE_VERIFICATION ? (
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
      ) : null}
      {NAVER_SITE_VERIFICATION ? (
        <meta name="naver-site-verification" content={NAVER_SITE_VERIFICATION} />
      ) : null}

      {jsonLdPayload.map((item, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
        >
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
