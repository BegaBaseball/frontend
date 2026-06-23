import {
  fetchMatePartiesPage,
  fetchMyPartyHistoryPage,
  fetchMyParties,
  fetchPopularMateSearchTerms,
  fetchPartyApplications,
  fetchPartyById,
  fetchPartyCheckIns,
  fetchPartyMessages,
  fetchPartyMyApplication,
  fetchPartyReviews,
} from '../api/mate';
import type { MateHistoryTab } from '../types/mate';
import { MATE_KEYS, type MatePartyListKeyParams } from './mateQueryKeys';

export const MATE_HISTORY_PAGE_SIZE = 20;

export const getMatePartyListQueryOptions = (
  params: MatePartyListKeyParams,
) => ({
  queryKey: MATE_KEYS.partyList(params),
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchMatePartiesPage({
    ...params,
    status: params.status === 'all' ? undefined : params.status,
    signal,
  }),
  staleTime: 30 * 1000,
} as const);

export const getMateMyPartiesQueryOptions = (
  userId?: number | null,
) => ({
  queryKey: MATE_KEYS.myParties(userId),
  queryFn: fetchMyParties,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
} as const);

export const getMateMyPartyHistoryQueryOptions = (
  userId?: number | null,
  group: MateHistoryTab = 'all',
  size = MATE_HISTORY_PAGE_SIZE,
) => ({
  queryKey: MATE_KEYS.myPartyHistory(userId, { group, size }),
  queryFn: ({ pageParam = 0, signal }: { pageParam?: unknown; signal: AbortSignal }) => fetchMyPartyHistoryPage({
    group,
    page: typeof pageParam === 'number' ? pageParam : 0,
    size,
    signal,
  }),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
} as const);

export const getMatePopularSearchTermsQueryOptions = (
  limit = 5,
) => ({
  queryKey: MATE_KEYS.popularSearchTerms(limit),
  queryFn: () => fetchPopularMateSearchTerms(limit),
  staleTime: 60 * 1000,
} as const);

export const getMatePartyQueryOptions = (
  partyId: number | string,
) => ({
  queryKey: MATE_KEYS.party(partyId),
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPartyById(partyId, {
    signal,
  }),
  retry: false,
} as const);

export const getMatePartyReviewsQueryOptions = (
  partyId: number | string,
) => ({
  queryKey: MATE_KEYS.partyReviews(partyId),
  queryFn: () => fetchPartyReviews(partyId),
  retry: false,
  staleTime: 60 * 1000,
} as const);

export const getMatePartyMyApplicationQueryOptions = (
  partyId: number | string,
  userId?: number | null,
) => ({
  queryKey: MATE_KEYS.partyMyApplication(partyId, userId),
  queryFn: () => fetchPartyMyApplication(partyId),
  retry: false,
  staleTime: 30 * 1000,
} as const);

export const getMatePartyApplicationsQueryOptions = (
  partyId: number | string,
) => ({
  queryKey: MATE_KEYS.partyApplications(partyId),
  queryFn: () => fetchPartyApplications(partyId),
  retry: false,
  staleTime: 30 * 1000,
} as const);

export const getMatePartyMessagesQueryOptions = (
  partyId: number | string,
) => ({
  queryKey: MATE_KEYS.partyMessages(partyId),
  queryFn: () => fetchPartyMessages(partyId),
  retry: false,
  staleTime: 10 * 1000,
} as const);

export const getMatePartyCheckInsQueryOptions = (
  partyId: number | string,
) => ({
  queryKey: MATE_KEYS.partyCheckIns(partyId),
  queryFn: () => fetchPartyCheckIns(partyId),
  retry: false,
  refetchInterval: 15 * 1000,
} as const);
