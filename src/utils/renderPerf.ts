import type { ProfilerOnRenderCallback } from 'react';

type PaintMetric = {
  name: string;
  startTime: number;
};

type LongTaskMetric = {
  name: string;
  startTime: number;
  duration: number;
};

type ResourceMetric = {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
};

type ReactCommitMetric = {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

type NavigationMetric = {
  domInteractive: number;
  domContentLoaded: number;
  loadEventEnd: number;
  duration: number;
  type: string;
};

type LcpMetric = {
  startTime: number;
  size: number | null;
  element: string | null;
  url: string | null;
};

type RenderPerfSnapshot = {
  enabled: boolean;
  mode: 'render';
  route: string;
  startedAt: string;
  navigation: NavigationMetric | null;
  paints: PaintMetric[];
  lcp: LcpMetric | null;
  cls: number;
  longTasks: LongTaskMetric[];
  resources: ResourceMetric[];
  reactCommits: ReactCommitMetric[];
  totalReactActualDuration: number;
};

type RenderPerfController = {
  disableStrictMode: boolean;
  enabled: boolean;
  onReactRender: ProfilerOnRenderCallback | null;
};

const MAX_LONG_TASKS = 10;
const MAX_RESOURCES = 20;

const isRenderPerfEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('perf') === 'render' || params.get('debugRenderPerf') === '1';
};

const sortByDurationDesc = <T extends { duration: number }>(records: T[]): T[] =>
  [...records].sort((left, right) => right.duration - left.duration);

const buildSnapshot = (
  route: string,
  startedAt: string,
  navigation: NavigationMetric | null,
  paints: PaintMetric[],
  lcp: LcpMetric | null,
  cls: number,
  longTasks: LongTaskMetric[],
  resources: ResourceMetric[],
  reactCommits: ReactCommitMetric[],
): RenderPerfSnapshot => ({
  enabled: true,
  mode: 'render',
  route,
  startedAt,
  navigation,
  paints,
  lcp,
  cls,
  longTasks: sortByDurationDesc(longTasks).slice(0, MAX_LONG_TASKS),
  resources: sortByDurationDesc(resources).slice(0, MAX_RESOURCES),
  reactCommits,
  totalReactActualDuration: Number(
    reactCommits.reduce((total, commit) => total + commit.actualDuration, 0).toFixed(2),
  ),
});

export const setupRenderPerf = (): RenderPerfController => {
  if (!isRenderPerfEnabled()) {
    return {
      enabled: false,
      disableStrictMode: false,
      onReactRender: null,
    };
  }

  const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const startedAt = new Date().toISOString();
  const paints: PaintMetric[] = [];
  const longTasks: LongTaskMetric[] = [];
  const resources: ResourceMetric[] = [];
  const reactCommits: ReactCommitMetric[] = [];
  let navigation: NavigationMetric | null = null;
  let lcp: LcpMetric | null = null;
  let cls = 0;
  let published = false;

  const publish = (reason: string) => {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigationEntry) {
      navigation = {
        domInteractive: Number(navigationEntry.domInteractive.toFixed(2)),
        domContentLoaded: Number(navigationEntry.domContentLoadedEventEnd.toFixed(2)),
        loadEventEnd: Number(navigationEntry.loadEventEnd.toFixed(2)),
        duration: Number(navigationEntry.duration.toFixed(2)),
        type: navigationEntry.type,
      };
    }

    const latestPaints = performance.getEntriesByType('paint') as PerformanceEntry[];
    paints.splice(
      0,
      paints.length,
      ...latestPaints.map((entry) => ({
        name: entry.name,
        startTime: Number(entry.startTime.toFixed(2)),
      })),
    );

    const latestResources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    resources.splice(
      0,
      resources.length,
      ...latestResources
        .filter((entry) => (
          entry.initiatorType === 'script'
          || entry.initiatorType === 'fetch'
          || entry.initiatorType === 'xmlhttprequest'
        ))
        .map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: Number(entry.duration.toFixed(2)),
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
        })),
    );

    const snapshot = buildSnapshot(
      route,
      startedAt,
      navigation,
      paints,
      lcp,
      Number(cls.toFixed(4)),
      longTasks,
      resources,
      reactCommits,
    );

    window.__begaRenderPerf = snapshot;

    if (!published || reason === 'manual') {
      published = true;
      console.info(`[render-perf:${reason}]`, snapshot);
    }
  };

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          name: entry.name,
          startTime: Number(entry.startTime.toFixed(2)),
          duration: Number(entry.duration.toFixed(2)),
        });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (_error) {
    // Unsupported browsers can skip longtask collection.
  }

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latestEntry = entries[entries.length - 1];
      if (!latestEntry) {
        return;
      }

      const candidate = latestEntry as PerformanceEntry & {
        element?: Element;
        size?: number;
        url?: string;
      };

      lcp = {
        startTime: Number(candidate.startTime.toFixed(2)),
        size: typeof candidate.size === 'number' ? candidate.size : null,
        element: candidate.element?.tagName ?? null,
        url: candidate.url ?? null,
      };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_error) {
    // Unsupported browsers can skip LCP collection.
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!shift.hadRecentInput) {
          cls += shift.value ?? 0;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_error) {
    // Unsupported browsers can skip CLS collection.
  }

  window.__dumpBegaRenderPerf = () => publish('manual');

  window.addEventListener('load', () => {
    window.setTimeout(() => publish('load'), 2500);
  }, { once: true });

  window.addEventListener('pagehide', () => publish('pagehide'), { once: true });

  console.info('[render-perf] enabled. Use ?perf=render and inspect window.__begaRenderPerf or window.__dumpBegaRenderPerf().');

  return {
    enabled: true,
    disableStrictMode: import.meta.env.DEV,
    onReactRender: (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      reactCommits.push({
        id,
        phase,
        actualDuration: Number(actualDuration.toFixed(2)),
        baseDuration: Number(baseDuration.toFixed(2)),
        startTime: Number(startTime.toFixed(2)),
        commitTime: Number(commitTime.toFixed(2)),
      });
    },
  };
};
