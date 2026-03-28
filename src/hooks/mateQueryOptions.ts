import type { QueryClient } from '@tanstack/react-query';

import {
  fetchMatePartiesPage,
  fetchMyParties,
  fetchPartyApplications,
  fetchPartyById,
  fetchPartyCheckIns,
  fetchPartyMessages,
  fetchPartyMyApplication,
  fetchPartyReviews,
  type FetchPartyByIdOptions,
} from '../api/mate';
import type { PaginatedResponse } from '../utils/api';
import type { Application, CheckIn, MatePartySeed, Party, PartyStatus } from '../types/mate';
import { normalizeMatePartySeed } from '../utils/mate';
import { MATE_KEYS, type MatePartyListKeyParams } from './mateQueryKeys';

type InvalidateMatePartyQueriesOptions = {
  includeParty?: boolean;
  includeApplications?: boolean;
  includeMyApplications?: boolean;
  includeCheckIns?: boolean;
  includeMessages?: boolean;
  includeReviews?: boolean;
  includeCollections?: boolean;
  userId?: number | null;
};

type MatePartyCollectionsUpdateOptions = {
  includeParty?: boolean;
  includePartyLists?: boolean;
  includeMyParties?: boolean;
};

type MatePartyCollectionsRemoveOptions = {
  includePartyLists?: boolean;
  includeMyParties?: boolean;
};

const HIDDEN_PUBLIC_PARTY_STATUSES = new Set<PartyStatus>(['CHECKED_IN', 'COMPLETED']);

const settleMateQueryInvalidations = (tasks: Array<Promise<unknown>>) =>
  Promise.allSettled(tasks);

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || '';

const matchesPartyListParams = (party: Party, params: MatePartyListKeyParams): boolean => {
  const normalizedTeamId = normalizeText(params.teamId);
  if (normalizedTeamId && normalizedTeamId !== 'all' && normalizeText(party.teamId) !== normalizedTeamId) {
    return false;
  }

  const normalizedStadium = normalizeText(params.stadium);
  if (normalizedStadium && normalizedStadium !== 'all' && !normalizeText(party.stadium).includes(normalizedStadium)) {
    return false;
  }

  const normalizedGameDate = normalizeText(params.gameDate);
  if (normalizedGameDate && normalizedGameDate !== 'all' && normalizeText(party.gameDate) !== normalizedGameDate) {
    return false;
  }

  const normalizedStatus = params.status;
  if (normalizedStatus && normalizedStatus !== 'all' && party.status !== normalizedStatus) {
    return false;
  }

  if (HIDDEN_PUBLIC_PARTY_STATUSES.has(party.status)) {
    return false;
  }

  const normalizedSearchQuery = normalizeText(params.searchQuery);
  if (!normalizedSearchQuery || normalizedSearchQuery === 'all') {
    return true;
  }

  const haystack = [
    party.stadium,
    party.homeTeam,
    party.awayTeam,
    party.section,
    party.description,
    party.hostName,
    party.hostHandle,
  ]
    .map((value) => normalizeText(value))
    .join(' ');

  return normalizedSearchQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

const updatePartyArray = (
  parties: Party[],
  partyId: number | string,
  updater: (party: Party) => Party | null,
): Party[] => {
  let changed = false;
  const nextParties: Party[] = [];

  parties.forEach((party) => {
    if (party.id !== partyId) {
      nextParties.push(party);
      return;
    }

    const nextParty = updater(party);
    if (nextParty) {
      nextParties.push(nextParty);
    }
    changed = true;
  });

  return changed ? nextParties : parties;
};

const recalculateTotalPages = (totalElements: number, size: number, fallback: number) => {
  if (size <= 0) {
    return fallback;
  }

  if (totalElements <= 0) {
    return 0;
  }

  return Math.ceil(totalElements / size);
};

const updatePartyListResponse = (
  response: PaginatedResponse<Party>,
  params: MatePartyListKeyParams,
  partyId: number | string,
  updater: (party: Party) => Party | null,
): PaginatedResponse<Party> => {
  let changed = false;
  const nextContent: Party[] = [];

  response.content.forEach((party) => {
    if (party.id !== partyId) {
      nextContent.push(party);
      return;
    }

    const nextParty = updater(party);
    if (nextParty && matchesPartyListParams(nextParty, params)) {
      nextContent.push(nextParty);
    }
    changed = true;
  });

  if (!changed) {
    return response;
  }

  const nextTotalElements = Math.max(0, response.totalElements - (response.content.length - nextContent.length));

  return {
    ...response,
    content: nextContent,
    totalElements: nextTotalElements,
    totalPages: recalculateTotalPages(nextTotalElements, response.size, response.totalPages),
  };
};

const updateApplicationArray = (
  applications: Application[],
  applicationId: number | string,
  updater: (application: Application) => Application | null,
): Application[] => {
  let changed = false;
  const nextApplications: Application[] = [];

  applications.forEach((application) => {
    if (application.id !== applicationId) {
      nextApplications.push(application);
      return;
    }

    const nextApplication = updater(application);
    if (nextApplication) {
      nextApplications.push(nextApplication);
    }
    changed = true;
  });

  return changed ? nextApplications : applications;
};

const extractPartyListParams = (queryKey: readonly unknown[]): MatePartyListKeyParams | null => {
  if (
    queryKey.length !== 4 ||
    queryKey[0] !== 'mate' ||
    queryKey[1] !== 'parties' ||
    queryKey[2] !== 'list'
  ) {
    return null;
  }

  const params = queryKey[3];
  return typeof params === 'object' && params !== null
    ? params as MatePartyListKeyParams
    : null;
};

export const getMatePartyListQueryOptions = (
  params: MatePartyListKeyParams,
) => ({
  queryKey: MATE_KEYS.partyList(params),
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchMatePartiesPage({
    ...params,
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

export const getMatePartyQueryOptions = (
  partyId: number | string,
  options?: FetchPartyByIdOptions,
) => ({
  queryKey: MATE_KEYS.party(partyId),
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPartyById(partyId, {
    ...options,
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

export const invalidateMateCollectionQueries = (
  queryClient: QueryClient,
) => settleMateQueryInvalidations([
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyLists() }),
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.myParties() }),
]);

export const invalidateMatePartyQueries = (
  queryClient: QueryClient,
  partyId: number | string,
  options: InvalidateMatePartyQueriesOptions = {},
) => {
  const {
    includeParty = true,
    includeApplications = false,
    includeMyApplications = false,
    includeCheckIns = false,
    includeMessages = false,
    includeReviews = false,
    includeCollections = false,
    userId,
  } = options;

  const tasks: Array<Promise<unknown>> = [];

  if (includeParty) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.party(partyId) }));
  }

  if (includeApplications) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyApplications(partyId) }));
  }

  if (includeMyApplications) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMyApplications(partyId) }));
  } else if (userId !== undefined && userId !== null) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMyApplication(partyId, userId) }));
  }

  if (includeCheckIns) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyCheckIns(partyId) }));
  }

  if (includeMessages) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyMessages(partyId) }));
  }

  if (includeReviews) {
    tasks.push(queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyReviews(partyId) }));
  }

  if (includeCollections) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyLists() }),
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.myParties() }),
    );
  }

  return settleMateQueryInvalidations(tasks);
};

export const setMatePartyDetailQueryData = (
  queryClient: QueryClient,
  party: Party,
): void => {
  queryClient.setQueryData<Party>(MATE_KEYS.party(party.id), party);
};

export const updateMatePartyCollectionQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  updater: (party: Party) => Party | null,
  options: MatePartyCollectionsUpdateOptions = {},
): void => {
  const {
    includeParty = true,
    includePartyLists = true,
    includeMyParties = true,
  } = options;

  if (includeParty) {
    queryClient.setQueryData<Party | undefined>(
      MATE_KEYS.party(partyId),
      (current) => (current ? updater(current) ?? undefined : current),
    );
  }

  if (includePartyLists) {
    queryClient
      .getQueriesData<PaginatedResponse<Party>>({ queryKey: MATE_KEYS.partyLists() })
      .forEach(([queryKey, current]) => {
        if (!current || !Array.isArray(queryKey)) {
          return;
        }

        const params = extractPartyListParams(queryKey);
        if (!params) {
          return;
        }

        queryClient.setQueryData<PaginatedResponse<Party>>(
          queryKey,
          (response) => (response ? updatePartyListResponse(response, params, partyId, updater) : response),
        );
      });
  }

  if (includeMyParties) {
    queryClient
      .getQueriesData<Party[]>({ queryKey: MATE_KEYS.myParties() })
      .forEach(([queryKey, current]) => {
        if (!current || !Array.isArray(queryKey)) {
          return;
        }

        queryClient.setQueryData<Party[]>(
          queryKey,
          (parties) => (parties ? updatePartyArray(parties, partyId, updater) : parties),
        );
      });
  }
};

export const syncMatePartyQueryData = (
  queryClient: QueryClient,
  party: Party,
  options: MatePartyCollectionsUpdateOptions = {},
): void => {
  setMatePartyDetailQueryData(queryClient, party);
  updateMatePartyCollectionQueryData(queryClient, party.id, () => party, {
    ...options,
    includeParty: false,
  });
};

export const removeMatePartyFromCollections = (
  queryClient: QueryClient,
  partyId: number | string,
  options: MatePartyCollectionsRemoveOptions = {},
): void => {
  updateMatePartyCollectionQueryData(queryClient, partyId, () => null, {
    includeParty: false,
    includePartyLists: options.includePartyLists,
    includeMyParties: options.includeMyParties,
  });
};

export const updateMatePartyApplicationsQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  updater: (applications: Application[]) => Application[],
): void => {
  queryClient.setQueryData<Application[] | undefined>(
    MATE_KEYS.partyApplications(partyId),
    (current) => (current ? updater(current) : current),
  );
};

export const updateMatePartyApplicationQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  applicationId: number | string,
  updater: (application: Application) => Application | null,
): void => {
  updateMatePartyApplicationsQueryData(queryClient, partyId, (applications) =>
    updateApplicationArray(applications, applicationId, updater),
  );
};

export const setMatePartyMyApplicationQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  userId: number | null | undefined,
  application: Application | null,
): void => {
  queryClient.setQueryData<Application | null>(
    MATE_KEYS.partyMyApplication(partyId, userId),
    application,
  );
};

export const appendMatePartyCheckInQueryData = (
  queryClient: QueryClient,
  partyId: number | string,
  checkIn: CheckIn,
): CheckIn[] => {
  queryClient.setQueryData<CheckIn[]>(
    MATE_KEYS.partyCheckIns(partyId),
    (current) => {
      const existing = current ?? [];
      if (existing.some((item) => (
        item.id === checkIn.id ||
        (item.userHandle && checkIn.userHandle && item.userHandle === checkIn.userHandle)
      ))) {
        return existing;
      }

      return [...existing, checkIn];
    },
  );

  return queryClient.getQueryData<CheckIn[]>(MATE_KEYS.partyCheckIns(partyId)) ?? [];
};

export const removeMatePartyQueries = (
  queryClient: QueryClient,
  partyId: number | string,
): void => {
  queryClient.removeQueries({ queryKey: MATE_KEYS.party(partyId) });
};

export const seedMatePartyQueryData = (
  queryClient: QueryClient,
  partySeed: MatePartySeed,
): void => {
  const placeholderParty = normalizeMatePartySeed(partySeed);
  if (!placeholderParty) {
    return;
  }

  queryClient.setQueryData<Party | undefined>(
    MATE_KEYS.party(placeholderParty.id),
    (current) => current ?? placeholderParty,
  );
};
