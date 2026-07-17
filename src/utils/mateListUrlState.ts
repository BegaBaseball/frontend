import { normalizeMateSearchText } from './mateSearchTerms';
import type { MateSortOptionKey } from './mateSortOptions';

export type MateStatusTabKey = 'all' | 'recruiting' | 'matched' | 'selling';

export interface MateListUrlState {
  searchQuery: string;
  date: string | null;
  activeTab: MateStatusTabKey;
  myTeamOnly: boolean;
  activeSortKey: MateSortOptionKey;
  queryPage: number;
}

interface MateListUrlParseOptions {
  favoriteTeamId: string | null;
}

const KNOWN_KEYS = ['q', 'date', 'tab', 'team', 'sort', 'page'] as const;
const VALID_TABS = new Set<MateStatusTabKey>(['recruiting', 'matched', 'selling']);
const VALID_SORTS = new Set<MateSortOptionKey>(['dDay', 'popular']);

export const mateListDateToLocalDate = (value: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

const parseQueryPage = (value: string | null): number => {
  if (!value || !/^[1-9]\d*$/.test(value)) return 0;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page - 1 : 0;
};

export const parseMateListUrlState = (
  params: URLSearchParams,
  { favoriteTeamId }: MateListUrlParseOptions,
): MateListUrlState => {
  const tab = params.get('tab') as MateStatusTabKey | null;
  const sort = params.get('sort') as MateSortOptionKey | null;
  const date = params.get('date');
  return {
    searchQuery: normalizeMateSearchText(params.get('q') ?? ''),
    date: mateListDateToLocalDate(date) ? date : null,
    activeTab: tab && VALID_TABS.has(tab) ? tab : 'all',
    myTeamOnly: params.get('team') === 'mine' && Boolean(favoriteTeamId),
    activeSortKey: sort && VALID_SORTS.has(sort) ? sort : 'latest',
    queryPage: parseQueryPage(params.get('page')),
  };
};

export const serializeMateListUrlState = (
  state: MateListUrlState,
  currentParams: URLSearchParams,
): URLSearchParams => {
  const next = new URLSearchParams(currentParams);
  KNOWN_KEYS.forEach((key) => next.delete(key));
  const searchQuery = normalizeMateSearchText(state.searchQuery);
  if (searchQuery) next.set('q', searchQuery);
  if (mateListDateToLocalDate(state.date)) next.set('date', state.date!);
  if (state.activeTab !== 'all') next.set('tab', state.activeTab);
  if (state.myTeamOnly) next.set('team', 'mine');
  if (state.activeSortKey !== 'latest') next.set('sort', state.activeSortKey);
  if (state.queryPage > 0) next.set('page', String(state.queryPage + 1));
  return next;
};

export const canonicalizeMateListSearchParams = (
  params: URLSearchParams,
  options: MateListUrlParseOptions,
): URLSearchParams => serializeMateListUrlState(parseMateListUrlState(params, options), params);

export const buildMateListReturnPath = (params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `/mate?${query}` : '/mate';
};
