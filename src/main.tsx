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

createRoot(document.getElementById("root")!).render(
  <RootMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          storageKey="kbo-theme"
          disableTransitionOnChange
        >
          {appTree}
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </RootMode>
);
