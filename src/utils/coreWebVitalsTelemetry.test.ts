import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { CLSMetric, INPMetric, LCPMetric } from 'web-vitals';

import { GA4_READY_EVENT_NAME } from './ga4Events';

import {
  buildCwvEventParams,
  getCwvRating,
  getCwvSloStatus,
  normalizeCwvPath,
  sendCwvMetric,
  startCoreWebVitalsTelemetry,
  type WebVitalsReporters,
} from './coreWebVitalsTelemetry';

const installWindow = (pathname = '/cheer/123456?tab=hot') => {
  const calls: unknown[][] = [];
  const listeners = new Map<string, Set<(event: Event) => void>>();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { pathname },
      matchMedia: () => ({ matches: false }),
      gtag: (...args: unknown[]) => {
        calls.push(args);
      },
      addEventListener: (eventName: string, listener: (event: Event) => void) => {
        const eventListeners = listeners.get(eventName) ?? new Set();
        eventListeners.add(listener);
        listeners.set(eventName, eventListeners);
      },
      dispatchEvent: (event: Event) => {
        listeners.get(event.type)?.forEach((listener) => listener(event));
        return true;
      },
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      connection: { effectiveType: '4g' },
    },
  });
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      getEntriesByType: () => [{ type: 'navigate' }],
      interactionCount: 2,
    },
  });

  return calls;
};

test('SeoHead는 GA4 queue 초기화 후 CWV flush 이벤트를 발행한다', () => {
  const source = readFileSync(new URL('../seo/SeoHead.tsx', import.meta.url), 'utf8');

  assert.match(source, /const GA4_READY_EVENT_NAME = 'bega:ga4-ready';/);
  assert.match(source, /window\.dispatchEvent\(new Event\(GA4_READY_EVENT_NAME\)\);/);
});

test('normalizes dynamic path segments before CWV analytics', () => {
  assert.equal(normalizeCwvPath('/'), '/');
  assert.equal(normalizeCwvPath('/cheer/123456?tab=hot'), '/cheer/:id');
  assert.equal(
    normalizeCwvPath('/mate/550e8400-e29b-41d4-a716-446655440000'),
    '/mate/:uuid',
  );
  assert.equal(normalizeCwvPath('/asset/0123456789abcdef'), '/asset/:hash');
  assert.equal(normalizeCwvPath('/home/2026'), '/home/2026');
});

test('rates Core Web Vitals against official thresholds', () => {
  assert.equal(getCwvRating('LCP', 1800), 'good');
  assert.equal(getCwvRating('LCP', 3000), 'needs-improvement');
  assert.equal(getCwvRating('LCP', 4500), 'poor');
  assert.equal(getCwvRating('CLS', 0.05), 'good');
  assert.equal(getCwvRating('INP', 250), 'needs-improvement');
});

test('rates Core Web Vitals against internal release SLOs', () => {
  assert.equal(getCwvSloStatus('LCP', 1800), 'pass');
  assert.equal(getCwvSloStatus('LCP', 1801), 'fail');
  assert.equal(getCwvSloStatus('INP', 100), 'pass');
  assert.equal(getCwvSloStatus('INP', 101), 'fail');
  assert.equal(getCwvSloStatus('CLS', 0.05), 'pass');
  assert.equal(getCwvSloStatus('CLS', 0.0501), 'fail');
});

test('builds GA4-safe CWV event payload', () => {
  installWindow('/cheer/123456');

  const params = buildCwvEventParams({
    name: 'CLS',
    value: 0.0244,
    rating: 'good',
  });

  assert.equal(params.event_category, 'Core Web Vitals');
  assert.equal(params.event_label, 'CLS');
  assert.equal(params.value, 24);
  assert.equal(params.metric_value, 0.0244);
  assert.equal(params.metric_slo_target, 0.05);
  assert.equal(params.metric_slo_status, 'pass');
  assert.equal(params.page_path, '/cheer/:id');
  assert.equal(params.device_type, 'desktop');
  assert.equal(params.connection_effective_type, '4g');
  assert.equal(params.metric_interaction_count, undefined);
  assert.equal(params.non_interaction, true);
});

test('sends CWV metric through existing GA4 queue when available', () => {
  const calls = installWindow('/home');

  assert.equal(sendCwvMetric({
    name: 'LCP',
    value: 1234,
    rating: 'good',
  }), true);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.slice(0, 2), ['event', 'cwv_lcp']);
});

test('does not send CWV metric when GA4 is unavailable', () => {
  installWindow('/home');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { pathname: '/home' },
      matchMedia: () => ({ matches: false }),
    },
  });

  assert.equal(sendCwvMetric({
    name: 'INP',
    value: 80,
    rating: 'good',
  }), false);
});

test('publishes official web-vitals metrics with the initial route snapshot', () => {
  const calls = installWindow('/cheer/123456');
  let reportLcp: ((metric: LCPMetric) => void) | undefined;
  let reportCls: ((metric: CLSMetric) => void) | undefined;
  let reportInp: ((metric: INPMetric) => void) | undefined;
  const reporters: WebVitalsReporters = {
    onLCP: (callback) => { reportLcp = callback; },
    onCLS: (callback) => { reportCls = callback; },
    onINP: (callback) => { reportInp = callback; },
  };

  startCoreWebVitalsTelemetry(reporters);
  window.location.pathname = '/mate/999999';

  reportLcp?.({
    name: 'LCP', value: 1234, rating: 'good', delta: 1234,
    id: 'v5-lcp', entries: [], navigationType: 'navigate',
  });
  reportCls?.({
    name: 'CLS', value: 0.06, rating: 'good', delta: 0.06,
    id: 'v5-cls', entries: [], navigationType: 'navigate',
  });
  reportInp?.({
    name: 'INP', value: 82, rating: 'good', delta: 82,
    id: 'v5-inp', entries: [], navigationType: 'navigate',
  });

  assert.deepEqual(calls.map((call) => call[1]), ['cwv_lcp', 'cwv_cls', 'cwv_inp']);
  assert.deepEqual(
    calls.map((call) => (call[2] as { page_path?: string }).page_path),
    ['/cheer/:id', '/cheer/:id', '/cheer/:id'],
  );
  assert.equal((calls[1]?.[2] as { metric_value?: number }).metric_value, 0.06);
  assert.equal((calls[1]?.[2] as { value?: number }).value, 60);
  assert.equal((calls[2]?.[2] as { metric_value?: number }).metric_value, 82);
  assert.equal((calls[2]?.[2] as { metric_interaction_count?: number }).metric_interaction_count, 2);
  assert.deepEqual(
    calls.map((call) => (call[2] as { metric_id?: string }).metric_id),
    ['v5-lcp', 'v5-cls', 'v5-inp'],
  );
});

test('GA4 queue보다 먼저 확정된 CWV metric을 준비 이벤트 후 전송한다', () => {
  const calls = installWindow('/prediction');
  const mutableWindow = window as Window & { gtag?: (...args: unknown[]) => void };
  delete mutableWindow.gtag;
  let reportLcp: ((metric: LCPMetric) => void) | undefined;
  const reporters: WebVitalsReporters = {
    onLCP: (callback) => { reportLcp = callback; },
    onCLS: () => {},
    onINP: () => {},
  };

  startCoreWebVitalsTelemetry(reporters);
  reportLcp?.({
    name: 'LCP', value: 1400, rating: 'good', delta: 1400,
    id: 'delayed-lcp', entries: [], navigationType: 'navigate',
  });
  assert.equal(calls.length, 0);

  mutableWindow.gtag = (...args: unknown[]) => {
    calls.push(args);
  };
  window.dispatchEvent(new Event(GA4_READY_EVENT_NAME));

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.slice(0, 2), ['event', 'cwv_lcp']);
  assert.equal((calls[0]?.[2] as { metric_id?: string }).metric_id, 'delayed-lcp');
});
