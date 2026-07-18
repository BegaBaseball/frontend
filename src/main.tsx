import { Fragment, Profiler, StrictMode, type ProfilerOnRenderCallback } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installSafeConsole } from "./utils/safeLogger";

type RenderPerfController = {
  disableStrictMode: boolean;
  enabled: boolean;
  onReactRender: ProfilerOnRenderCallback | null;
};

const defaultRenderPerf: RenderPerfController = {
  disableStrictMode: false,
  enabled: false,
  onReactRender: null,
};
const PERFORMANCE_PRERENDER_PAINT_DELAY_MS = 100;
const PERFORMANCE_STYLE_READY_TIMEOUT_MS = 3000;

const rootEl = document.getElementById("root")!;

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app continues normally
    });
  });
}

const isRenderPerfRequested = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('perf') === 'render' || params.get('debugRenderPerf') === '1';
};

const removeShellLoader = (immediate = false) => {
  const shellLoader = document.getElementById('app-shell-loader');
  if (!shellLoader) {
    return;
  }

  if (immediate) {
    shellLoader.remove();
    return;
  }

  shellLoader.style.opacity = '0';
  shellLoader.style.pointerEvents = 'none';
  setTimeout(() => shellLoader.remove(), 200);
};

const shouldRevealPerformancePrerenderBeforeMount = () => Boolean(
  rootEl.querySelector('[data-performance-prerender="true"]')
);

const waitForDelay = (delayMs: number) => new Promise<void>((resolve) => {
  globalThis.setTimeout(resolve, delayMs);
});

const waitForPerformanceStyles = async () => {
  const styleLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[data-performance-app-style="true"]')
  );
  if (styleLinks.length === 0) {
    return;
  }

  await Promise.all(styleLinks.map((link) => {
    if (link.dataset.performanceStyleReady === 'true' || link.sheet) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', finish, { once: true });
      globalThis.setTimeout(finish, PERFORMANCE_STYLE_READY_TIMEOUT_MS);
    });
  }));

  await new Promise<void>((resolve) => {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => resolve());
    });
  });
};

const mountApp = (renderPerf: RenderPerfController) => {
  const RootMode = renderPerf.disableStrictMode ? Fragment : StrictMode;
  const appTree = renderPerf.enabled && renderPerf.onReactRender ? (
    <Profiler id="app-root" onRender={renderPerf.onReactRender}>
      <App />
    </Profiler>
  ) : (
    <App />
  );

  const renderApp = () => {
    createRoot(rootEl).render(
      <RootMode>
        {appTree}
      </RootMode>
    );

    if (import.meta.env.PROD) {
      void import('./utils/coreWebVitalsTelemetry')
        .then(({ startCoreWebVitalsTelemetry }) => {
          startCoreWebVitalsTelemetry();
        });
    }
  };

  const mountPerformanceApp = async () => {
    await Promise.all([
      waitForPerformanceStyles(),
      waitForDelay(PERFORMANCE_PRERENDER_PAINT_DELAY_MS),
    ]);
    renderApp();
  };

  if (shouldRevealPerformancePrerenderBeforeMount()) {
    removeShellLoader(true);
    void mountPerformanceApp();
    return;
  }

  removeShellLoader();
  renderApp();
};

const boot = async () => {
  installSafeConsole();

  if (!isRenderPerfRequested()) {
    mountApp(defaultRenderPerf);
    return;
  }

  const { setupRenderPerf } = await import('./utils/renderPerf');
  mountApp(setupRenderPerf());
};

void boot();
