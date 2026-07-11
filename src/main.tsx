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

const removeShellLoader = () => {
  const shellLoader = document.getElementById('app-shell-loader');
  if (!shellLoader) {
    return;
  }

  shellLoader.style.opacity = '0';
  shellLoader.style.pointerEvents = 'none';
  setTimeout(() => shellLoader.remove(), 200);
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

  removeShellLoader();
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
