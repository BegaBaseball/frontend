import { fetchAdminStats } from '../api/admin';

export const getAdminStatsQueryOptions = () => ({
  queryKey: ['admin', 'stats'] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchAdminStats({ signal }),
  staleTime: 30 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: false,
} as const);
