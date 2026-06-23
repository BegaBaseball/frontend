import { QueryClient } from '@tanstack/react-query';
import {
  registerSessionScopedQueryCleanup,
  registerUserProfileQueryPrimer,
} from './queryClientRegistry';

type UserProfileQueryData = {
  id?: number;
  email?: string;
  name?: string;
  handle?: string;
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  role?: string;
  profileImageUrl?: string | null;
  provider?: string;
  providerId?: string;
  bio?: string | null;
  cheerPoints?: number;
  hasPassword?: boolean;
};

const SESSION_SCOPED_QUERY_KEYS = [
  ['userProfile'],
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

registerSessionScopedQueryCleanup(clearSessionScopedQueries);

registerUserProfileQueryPrimer((profile) => {
  if (!profile || typeof profile !== 'object') {
    return;
  }

  const queryData = profile as UserProfileQueryData;
  if (!queryData.id) {
    return;
  }

  queryClient.setQueryData(['userProfile', queryData.id], queryData);
});
