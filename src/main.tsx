import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

// 기존 bega-theme를 kbo-theme으로 마이그레이션
const oldTheme = localStorage.getItem('bega-theme');
if (oldTheme && !localStorage.getItem('kbo-theme')) {
  localStorage.setItem('kbo-theme', oldTheme);
  localStorage.removeItem('bega-theme');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="kbo-theme">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
