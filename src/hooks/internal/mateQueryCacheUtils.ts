import type { PaginatedResponse } from '../../utils/api';
import type { Application, CheckIn, Party, PartyStatus } from '../../types/mate';
import type { MatePartyListKeyParams } from '../mateQueryKeys';

const HIDDEN_PUBLIC_PARTY_STATUSES = new Set<PartyStatus>(['CHECKED_IN', 'COMPLETED']);

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || '';

const recalculateTotalPages = (totalElements: number, size: number, fallback: number) => {
  if (size <= 0) {
    return fallback;
  }

  if (totalElements <= 0) {
    return 0;
  }

  return Math.ceil(totalElements / size);
};

export const matchesMatePartyListParams = (party: Party, params: MatePartyListKeyParams): boolean => {
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

export const updateMatePartyArray = (
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

export const updateMatePartyListResponse = (
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
    if (nextParty && matchesMatePartyListParams(nextParty, params)) {
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

export const updateMatePartyApplicationsArray = (
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

export const extractMatePartyListParams = (queryKey: readonly unknown[]): MatePartyListKeyParams | null => {
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

export const appendMatePartyCheckIns = (
  checkIns: CheckIn[],
  nextCheckIn: CheckIn,
): CheckIn[] => {
  if (checkIns.some((item) => (
    item.id === nextCheckIn.id ||
    (item.userHandle && nextCheckIn.userHandle && item.userHandle === nextCheckIn.userHandle)
  ))) {
    return checkIns;
  }

  return [...checkIns, nextCheckIn];
};
