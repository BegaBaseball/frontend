import type { MatePartySortBy, MatePartySortDir, PartyStatus } from '../types/mate';

export interface MatePartyListKeyParams {
  teamId?: string;
  stadium?: string;
  page?: number;
  size?: number;
  status?: PartyStatus | 'all';
  searchQuery?: string;
  gameDate?: string;
  sortBy?: MatePartySortBy;
  sortDir?: MatePartySortDir;
}

const mateAllKey = ['mate'] as const;
const matePartiesKey = [...mateAllKey, 'parties'] as const;
const mateMyPartiesKey = [...mateAllKey, 'my-parties'] as const;

const normalizePartyId = (partyId: number | string) =>
  typeof partyId === 'number' ? partyId : partyId.trim();

const normalizeUserKey = (userId: number | null | undefined) =>
  typeof userId === 'number' && Number.isFinite(userId) ? userId : 'guest';

const normalizeOptionalText = (value?: string) => value?.trim() || 'all';

const normalizePageValue = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizePartyListKey = (params: MatePartyListKeyParams) => ({
  teamId: normalizeOptionalText(params.teamId),
  stadium: normalizeOptionalText(params.stadium),
  page: normalizePageValue(params.page, 0),
  size: normalizePageValue(params.size, 9),
  status: params.status ?? 'all',
  searchQuery: normalizeOptionalText(params.searchQuery),
  gameDate: normalizeOptionalText(params.gameDate),
  sortBy: params.sortBy ?? 'createdAt',
  sortDir: params.sortDir ?? 'desc',
});

export const MATE_KEYS = {
  all: mateAllKey,
  parties: () => matePartiesKey,
  partyLists: () => [...matePartiesKey, 'list'] as const,
  partyList: (params: MatePartyListKeyParams) =>
    [...MATE_KEYS.partyLists(), normalizePartyListKey(params)] as const,
  party: (partyId: number | string) => [...MATE_KEYS.parties(), normalizePartyId(partyId)] as const,
  partyReviews: (partyId: number | string) => [...MATE_KEYS.party(partyId), 'reviews'] as const,
  partyApplications: (partyId: number | string) => [...MATE_KEYS.party(partyId), 'applications'] as const,
  partyMyApplications: (partyId: number | string) => [...MATE_KEYS.party(partyId), 'my-application'] as const,
  partyMyApplication: (partyId: number | string, userId?: number | null) =>
    [...MATE_KEYS.partyMyApplications(partyId), normalizeUserKey(userId)] as const,
  partyMessages: (partyId: number | string) => [...MATE_KEYS.party(partyId), 'messages'] as const,
  partyCheckIns: (partyId: number | string) => [...MATE_KEYS.party(partyId), 'check-ins'] as const,
  myParties: (userId?: number | null) =>
    userId === undefined
      ? mateMyPartiesKey
      : [...mateMyPartiesKey, normalizeUserKey(userId)] as const,
} as const;
