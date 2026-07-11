import {
  onCLS,
  onINP,
  onLCP,
  type CLSMetric,
  type INPMetric,
  type LCPMetric,
} from 'web-vitals';
import { GA4_READY_EVENT_NAME } from './ga4Events';

type CwvMetricName = 'LCP' | 'CLS' | 'INP';
type CwvRating = 'good' | 'needs-improvement' | 'poor';
type CwvSloStatus = 'pass' | 'fail';
type Gtag = (...args: unknown[]) => void;

interface CwvMetric {
  name: CwvMetricName;
  value: number;
  rating: CwvRating;
  interactionCount?: number;
  metricDelta?: number;
  metricId?: string;
  navigationType?: string;
  pagePath?: string;
}

interface CwvEventParams {
  event_category: 'Core Web Vitals';
  event_label: CwvMetricName;
  value: number;
  metric_name: CwvMetricName;
  metric_value: number;
  metric_rating: CwvRating;
  metric_delta?: number;
  metric_id?: string;
  metric_slo_target: number;
  metric_slo_status: CwvSloStatus;
  page_path: string;
  navigation_type: string;
  device_type: 'mobile' | 'desktop';
  connection_effective_type?: string;
  metric_interaction_count?: number;
  non_interaction: true;
}

const CWV_THRESHOLDS: Record<CwvMetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
};

const INTERNAL_CWV_SLO: Record<CwvMetricName, number> = {
  LCP: 1800,
  CLS: 0.05,
  INP: 100,
};

const EVENT_NAME_BY_METRIC: Record<CwvMetricName, string> = {
  LCP: 'cwv_lcp',
  CLS: 'cwv_cls',
  INP: 'cwv_inp',
};

const MAX_PENDING_CWV_METRICS = 3;
const pendingCwvMetrics = new Map<string, CwvMetric>();
const ga4ReadyListenerTargets = new WeakSet<object>();

const UUID_SEGMENT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LONG_HEX_SEGMENT_PATTERN = /^[0-9a-f]{16,}$/i;
const MAX_DECIMAL_SEGMENT_LENGTH = 5;

export const getCwvRating = (metricName: CwvMetricName, value: number): CwvRating => {
  const threshold = CWV_THRESHOLDS[metricName];
  if (value <= threshold.good) {
    return 'good';
  }
  return value <= threshold.poor ? 'needs-improvement' : 'poor';
};

export const getCwvSloStatus = (metricName: CwvMetricName, value: number): CwvSloStatus => (
  value <= INTERNAL_CWV_SLO[metricName] ? 'pass' : 'fail'
);

export const normalizeCwvPath = (pathname: string): string => {
  const normalizedPath = pathname.split('?')[0]?.split('#')[0] || '/';
  if (normalizedPath === '/') {
    return '/';
  }

  const segments = normalizedPath.split('/').filter(Boolean).map((segment) => {
    if (/^\d+$/.test(segment) && segment.length > MAX_DECIMAL_SEGMENT_LENGTH) {
      return ':id';
    }
    if (UUID_SEGMENT_PATTERN.test(segment)) {
      return ':uuid';
    }
    if (LONG_HEX_SEGMENT_PATTERN.test(segment)) {
      return ':hash';
    }
    return segment;
  });

  return `/${segments.join('/')}`;
};

const roundMetricValue = (metricName: CwvMetricName, value: number): number => (
  metricName === 'CLS'
    ? Number(value.toFixed(4))
    : Math.round(value)
);

const getMetricEventValue = (metricName: CwvMetricName, value: number): number => (
  metricName === 'CLS'
    ? Math.round(value * 1000)
    : Math.round(value)
);

const getNavigationType = (): string => {
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return navigationEntry?.type || 'unknown';
};

const getDeviceType = (): 'mobile' | 'desktop' => (
  window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop'
);

const getEffectiveConnectionType = (): string | undefined => {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;
  return connection?.effectiveType;
};

const getBrowserInteractionCount = (): number | undefined => {
  const interactionCount = (performance as Performance & {
    interactionCount?: number;
  }).interactionCount;
  return typeof interactionCount === 'number' && Number.isFinite(interactionCount)
    ? Math.max(0, Math.round(interactionCount))
    : undefined;
};

const getGtag = (): Gtag | null => {
  const candidate = (window as Window & { gtag?: unknown }).gtag;
  return typeof candidate === 'function' ? candidate as Gtag : null;
};

export const buildCwvEventParams = (metric: CwvMetric): CwvEventParams => {
  const metricValue = roundMetricValue(metric.name, metric.value);
  const interactionParams = typeof metric.interactionCount === 'number'
    ? { metric_interaction_count: metric.interactionCount }
    : {};
  const metricIdentityParams = metric.metricId
    ? { metric_id: metric.metricId }
    : {};
  const metricDeltaParams = typeof metric.metricDelta === 'number'
    ? { metric_delta: roundMetricValue(metric.name, metric.metricDelta) }
    : {};

  return {
    event_category: 'Core Web Vitals',
    event_label: metric.name,
    value: getMetricEventValue(metric.name, metric.value),
    metric_name: metric.name,
    metric_value: metricValue,
    metric_rating: metric.rating,
    ...metricIdentityParams,
    ...metricDeltaParams,
    metric_slo_target: INTERNAL_CWV_SLO[metric.name],
    metric_slo_status: getCwvSloStatus(metric.name, metric.value),
    page_path: normalizeCwvPath(metric.pagePath ?? window.location.pathname),
    navigation_type: metric.navigationType ?? getNavigationType(),
    device_type: getDeviceType(),
    connection_effective_type: getEffectiveConnectionType(),
    ...interactionParams,
    non_interaction: true,
  };
};

export const sendCwvMetric = (metric: CwvMetric): boolean => {
  const gtag = getGtag();
  if (!gtag) {
    return false;
  }

  gtag('event', EVENT_NAME_BY_METRIC[metric.name], buildCwvEventParams(metric));
  return true;
};

const getPendingMetricKey = (metric: CwvMetric): string => (
  `${metric.name}:${metric.metricId || metric.pagePath || 'current-page'}`
);

const queuePendingCwvMetric = (metric: CwvMetric) => {
  const key = getPendingMetricKey(metric);
  if (!pendingCwvMetrics.has(key) && pendingCwvMetrics.size >= MAX_PENDING_CWV_METRICS) {
    const oldestKey = pendingCwvMetrics.keys().next().value;
    if (typeof oldestKey === 'string') {
      pendingCwvMetrics.delete(oldestKey);
    }
  }
  pendingCwvMetrics.set(key, metric);
};

export const flushPendingCwvMetrics = (): number => {
  if (!getGtag()) {
    return 0;
  }

  let sentCount = 0;
  for (const [key, metric] of pendingCwvMetrics) {
    if (sendCwvMetric(metric)) {
      pendingCwvMetrics.delete(key);
      sentCount += 1;
    }
  }
  return sentCount;
};

const ensureGa4ReadyListener = () => {
  const target = window as Window & {
    addEventListener?: (type: string, listener: EventListener) => void;
  };
  if (typeof target.addEventListener !== 'function' || ga4ReadyListenerTargets.has(target)) {
    return;
  }

  target.addEventListener(GA4_READY_EVENT_NAME, flushPendingCwvMetrics as EventListener);
  ga4ReadyListenerTargets.add(target);
};

type SupportedWebVitalMetric = CLSMetric | INPMetric | LCPMetric;

export interface WebVitalsReporters {
  onCLS: (callback: (metric: CLSMetric) => void) => void;
  onINP: (callback: (metric: INPMetric) => void) => void;
  onLCP: (callback: (metric: LCPMetric) => void) => void;
}

const DEFAULT_WEB_VITALS_REPORTERS: WebVitalsReporters = {
  onCLS,
  onINP,
  onLCP,
};

export const startCoreWebVitalsTelemetry = (
  reporters: WebVitalsReporters = DEFAULT_WEB_VITALS_REPORTERS,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  ensureGa4ReadyListener();
  const pagePath = normalizeCwvPath(window.location.pathname);
  const report = (metric: SupportedWebVitalMetric) => {
    const interactionCount = metric.name === 'INP'
      ? getBrowserInteractionCount()
      : undefined;
    const cwvMetric: CwvMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      pagePath,
      metricDelta: metric.delta,
      metricId: metric.id,
      navigationType: metric.navigationType,
      ...(typeof interactionCount === 'number' ? { interactionCount } : {}),
    };
    if (!sendCwvMetric(cwvMetric)) {
      queuePendingCwvMetric(cwvMetric);
    }
  };

  reporters.onLCP(report);
  reporters.onCLS(report);
  reporters.onINP(report);
};
