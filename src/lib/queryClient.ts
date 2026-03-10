import { QueryClient } from '@tanstack/react-query';

const SESSION_SCOPED_QUERY_KEYS = [
  ['deviceSessions'],
  ['linkedProviders'],
  ['securityEvents'],
  ['trustedDevices'],
  ['notifications'],
] as const;

export const queryClient = new QueryClient({
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

export const clearSessionScopedQueries = () => {
  for (const queryKey of SESSION_SCOPED_QUERY_KEYS) {
    void queryClient.cancelQueries({ queryKey });
    queryClient.removeQueries({ queryKey });
  }
};
