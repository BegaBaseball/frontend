import { Fragment, Profiler, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { installSafeConsole } from "./utils/safeLogger";
import { setupRenderPerf } from "./utils/renderPerf";

installSafeConsole();
const renderPerf = setupRenderPerf();
const RootMode = renderPerf.disableStrictMode ? Fragment : StrictMode;

const appTree = renderPerf.enabled && renderPerf.onReactRender ? (
  <Profiler id="app-root" onRender={renderPerf.onReactRender}>
    <App />
  </Profiler>
) : (
  <App />
);

const rootEl = document.getElementById("root")!;

// Remove HTML shell loader once React takes over
const shellLoader = document.getElementById('app-shell-loader');
if (shellLoader) {
  shellLoader.style.opacity = '0';
  shellLoader.style.pointerEvents = 'none';
  setTimeout(() => shellLoader.remove(), 200);
}

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app continues normally
    });
  });
}

createRoot(rootEl).render(
  <RootMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="kbo-theme"
          disableTransitionOnChange
        >
          {appTree}
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </RootMode>
);
