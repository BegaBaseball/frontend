import { formatDateForAPI } from './home';
import { toLocalMiddayDate } from './homeSeasonLogic';
import { normalizePredictionDate } from './dateKey';
import type { LeagueTab } from './homeScheduleClassification';

export const HOME_ROUTE_TABS: readonly LeagueTab[] = [
  'regular',
  'postseason',
  'koreanseries',
  'scheduled',
];

export type HomeRouteVisibleTab = {
  value: LeagueTab;
};

export type HomeRouteState = {
  date: Date;
  tab: LeagueTab;
  hasExplicitTab: boolean;
  hasRouteQuery: boolean;
};

export const parseHomeRouteTab = (value: string | null | undefined): LeagueTab | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return HOME_ROUTE_TABS.includes(normalized as LeagueTab) ? normalized as LeagueTab : null;
};

const cloneMiddayDate = (date: Date): Date => {
  const nextDate = new Date(date);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
};

export const resolveHomeRouteDate = (
  value: string | null | undefined,
  fallbackDate: Date,
): Date => {
  const normalizedDate = typeof value === 'string'
    ? normalizePredictionDate(value)
    : null;

  if (normalizedDate) {
    const parsedDate = toLocalMiddayDate(normalizedDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return cloneMiddayDate(fallbackDate);
};

export const coerceHomeRouteTab = (
  tab: LeagueTab,
  visibleTabs: readonly HomeRouteVisibleTab[],
  fallbackTab: LeagueTab = 'regular',
): LeagueTab => (
  visibleTabs.some((visibleTab) => visibleTab.value === tab) ? tab : fallbackTab
);

export const resolveHomeRouteState = (
  searchParams: URLSearchParams,
  fallbackDate: Date,
): HomeRouteState => {
  const parsedTab = parseHomeRouteTab(searchParams.get('tab'));

  return {
    date: resolveHomeRouteDate(searchParams.get('date'), fallbackDate),
    tab: parsedTab ?? 'regular',
    hasExplicitTab: Boolean(parsedTab),
    hasRouteQuery: searchParams.has('date') || searchParams.has('tab'),
  };
};

export const buildHomeRouteSearchParams = ({
  searchParams,
  date,
  tab,
}: {
  searchParams: URLSearchParams;
  date: Date;
  tab: LeagueTab;
}): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set('date', formatDateForAPI(date));
  nextSearchParams.set('tab', tab);
  return nextSearchParams;
};
