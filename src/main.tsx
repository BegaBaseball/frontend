import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { installSafeConsole } from "./utils/safeLogger";

// 기존 bega-theme/theme를 kbo-theme으로 마이그레이션
const resolveTheme = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const stripQuotes = (raw: string): string => {
    const trimmed = raw.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  };

  const getDirectTheme = (rawValue: string): string | null => {
    const normalized = stripQuotes(rawValue).toLowerCase();
    if (normalized === 'dark' || normalized === 'light') {
      return normalized;
    }
    return null;
  };

  let normalized = getDirectTheme(value);
  if (normalized) {
    return normalized;
  }

  let candidate = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        candidate = parsed;
        normalized = getDirectTheme(candidate);
        if (normalized) {
          return normalized;
        }
        continue;
      }

      if (parsed && typeof parsed === 'object' && typeof parsed.theme === 'string') {
        candidate = parsed.theme;
        normalized = getDirectTheme(candidate);
        if (normalized) {
          return normalized;
        }
        continue;
      }
    } catch {
      break;
    }
    break;
  }

  return null;
};

const previousTheme = resolveTheme(localStorage.getItem('kbo-theme'));
const legacyTheme = resolveTheme(localStorage.getItem('bega-theme'));
const previousThemeV1 = resolveTheme(localStorage.getItem('theme'));
const migrationTheme = legacyTheme || previousThemeV1;

if (previousTheme) {
  localStorage.setItem('kbo-theme', previousTheme);

  if (migrationTheme) {
    localStorage.removeItem('bega-theme');
    localStorage.removeItem('theme');
  }
} else {
  localStorage.removeItem('kbo-theme');
  localStorage.removeItem('bega-theme');
  localStorage.removeItem('theme');

  if (migrationTheme) {
    localStorage.setItem('kbo-theme', migrationTheme);
  }
}

installSafeConsole();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="kbo-theme"
          disableTransitionOnChange
        >
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
