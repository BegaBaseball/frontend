import type { QueryClient } from '@tanstack/react-query';

import type { PaginatedResponse } from '../api/mate';
import type { Application, CheckIn, MatePartySeed, Party } from '../types/mate';
import { normalizeMatePartySeed } from '../utils/mate';
import { MATE_KEYS } from './mateQueryKeys';
import type {
  InvalidateMatePartyQueriesOptions,
  MatePartyApplicationUpdater,
  MatePartyApplicationsUpdater,
  MatePartyCollectionsRemoveOptions,
  MatePartyCollectionsUpdateOptions,
  MatePartyUpdater,
} from './mateQueryCacheContracts';
import {
  appendMatePartyCheckIns,
  extractMatePartyListParams,
  updateMatePartyApplicationsArray,
  updateMatePartyArray,
  updateMatePartyListResponse,
} from './internal/mateQueryCacheUtils';

const settleMateQueryInvalidations = (tasks: Array<Promise<unknown>>) =>
  Promise.allSettled(tasks);

export const invalidateMateCollectionQueries = (
  queryClient: QueryClient,
) => settleMateQueryInvalidations([
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.partyLists() }),
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.myParties() }),
  queryClient.invalidateQueries({ queryKey: MATE_KEYS.myPartyHistories() }),
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
      queryClient.invalidateQueries({ queryKey: MATE_KEYS.myPartyHistories() }),
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
  updater: MatePartyUpdater,
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

        const params = extractMatePartyListParams(queryKey);
        if (!params) {
          return;
        }

        queryClient.setQueryData<PaginatedResponse<Party>>(
          queryKey,
          (response) => (response ? updateMatePartyListResponse(response, params, partyId, updater) : response),
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
          (parties) => (parties ? updateMatePartyArray(parties, partyId, updater) : parties),
        );
      });
    void queryClient.invalidateQueries({ queryKey: MATE_KEYS.myPartyHistories() });
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
  updater: MatePartyApplicationsUpdater,
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
  updater: MatePartyApplicationUpdater,
): void => {
  updateMatePartyApplicationsQueryData(queryClient, partyId, (applications) =>
    updateMatePartyApplicationsArray(applications, applicationId, updater),
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
      return appendMatePartyCheckIns(existing, checkIn);
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
