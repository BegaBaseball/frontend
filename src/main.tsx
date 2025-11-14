
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 실패 시 재시도 횟수 (총요청은 retry+1이라고 생각)
      retry: 1,
      
      // 창 포커스 시 자동 리페치 비활성화 (기본: true → false)
      refetchOnWindowFocus: false,

      // 데이터가 fresh 상태로 유지되는 시간 (기본: 0 → 60초)
      // 이 시간 동안은 캐시된 데이터를 사용하고 서버 요청 안 함
      staleTime: 60 * 1000,
      
      // 캐시 데이터 유지 시간 (기본: 5분 → 5분 유지)
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      // mutation 실패 시 재시도 안 함 (기본: 0)
      retry: 0,
    },
  },
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
