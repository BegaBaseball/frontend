import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { setPartyFavorite } from '../api/mate';
import { useAuthProfileSnapshot } from '../store/authStore';
import type { Party, PartyStatus } from '../types/mate';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';
import { buildMateRouteLocationState } from '../utils/mate';
import {
  buildMateListReturnPath,
  canonicalizeMateListSearchParams,
  mateListDateToLocalDate,
  parseMateListUrlState,
  serializeMateListUrlState,
  type MateListUrlState,
  type MateStatusTabKey,
} from '../utils/mateListUrlState';
import { normalizeMateSearchText } from '../utils/mateSearchTerms';
import { countActiveMateSeatFilters } from '../utils/mateSeatFilterCount';
import { MATE_SORT_OPTIONS, type MateSortOptionKey } from '../utils/mateSortOptions';
import { getMatePartyListQueryOptions } from './mateQueryOptions';
import { seedMatePartyQueryData, updateMatePartyCollectionQueryData } from './mateQueryCache';
import { useDebounce } from './useDebounce';
import { useMediaQuery } from './useMediaQuery';

const PAGE_SIZE = 9;

const normalizeLegacyPartyId = (partyId: string | null) => {
  const normalizedPartyId = partyId?.trim();
  if (!normalizedPartyId || !/^[1-9]\d*$/.test(normalizedPartyId)) return null;

  const numericPartyId = Number(normalizedPartyId);
  return Number.isSafeInteger(numericPartyId) ? normalizedPartyId : null;
};

const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return [year, month, day].join('-');
};

export function useMateListController() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktopListLayout = useMediaQuery('(min-width: 1280px)');
  const rawLegacyPartyId = searchParams.get('party');
  const legacyPartyId = normalizeLegacyPartyId(rawLegacyPartyId);
  const { userFavoriteTeam: favoriteTeam, userId: authUserId } = useAuthProfileSnapshot();
  const favoriteTeamId = favoriteTeam && favoriteTeam !== '없음' ? favoriteTeam : null;
  const urlState = useMemo(
    () => parseMateListUrlState(searchParams, { favoriteTeamId }),
    [favoriteTeamId, searchParams],
  );
  const {
    activeSortKey,
    activeTab,
    myTeamOnly,
    queryPage,
    searchQuery: committedSearchQuery,
  } = urlState;
  const selectedDate = useMemo(() => mateListDateToLocalDate(urlState.date), [urlState.date]);
  const [inputValue, setInputValue] = useState(committedSearchQuery);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [favoriteUpdatingPartyId, setFavoriteUpdatingPartyId] = useState<number | null>(null);
  const searchInputSourceRef = useRef<'local' | 'external'>('local');
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  const updateUrlState = useCallback((
    update: (current: MateListUrlState) => MateListUrlState,
  ) => {
    setSearchParams((currentParams) => {
      const current = parseMateListUrlState(currentParams, { favoriteTeamId });
      return serializeMateListUrlState(update(current), currentParams);
    }, { replace: true });
  }, [favoriteTeamId, setSearchParams]);

  useEffect(() => {
    const canonical = canonicalizeMateListSearchParams(searchParams, { favoriteTeamId });
    if (canonical.toString() === searchParams.toString()) return;
    setSearchParams(canonical, { replace: true });
  }, [favoriteTeamId, searchParams, setSearchParams]);

  useEffect(() => {
    if (normalizeMateSearchText(inputValue) === committedSearchQuery) {
      searchInputSourceRef.current = 'external';
      return;
    }
    searchInputSourceRef.current = 'external';
    setInputValue(committedSearchQuery);
  // This effect intentionally keys only on committed URL state. Including inputValue
  // would overwrite each local keystroke before the debounce can commit it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSearchQuery]);

  useEffect(() => {
    if (debouncedInput !== inputValue || searchInputSourceRef.current !== 'local') return;
    const normalized = normalizeMateSearchText(debouncedInput);
    if (normalized === committedSearchQuery) return;
    updateUrlState((current) => ({ ...current, searchQuery: normalized, queryPage: 0 }));
  }, [committedSearchQuery, debouncedInput, inputValue, updateUrlState]);

  const activeSortOption = useMemo(
    () => MATE_SORT_OPTIONS.find((option) => option.key === activeSortKey) ?? MATE_SORT_OPTIONS[0]!,
    [activeSortKey],
  );

  const tabToStatusMap: Record<MateStatusTabKey, PartyStatus | undefined> = {
    all: undefined,
    recruiting: 'PENDING',
    matched: 'MATCHED',
    selling: 'SELLING',
  };
  const selectedStatus = tabToStatusMap[activeTab];
  const dateKey = urlState.date ?? '';
  const teamIdFilter = myTeamOnly && favoriteTeamId ? favoriteTeamId : undefined;
  const normalizedSearchQuery = committedSearchQuery;

  const partyListQuery = useQuery({
    ...getMatePartyListQueryOptions({
      teamId: teamIdFilter,
      page: queryPage,
      size: PAGE_SIZE,
      status: selectedStatus,
      searchQuery: normalizedSearchQuery || undefined,
      gameDate: dateKey || undefined,
      sortBy: activeSortOption.sortBy,
      sortDir: activeSortOption.sortDir,
    }),
  });

  const parties = useMemo(
    () => partyListQuery.data?.content ?? [],
    [partyListQuery.data?.content],
  );
  const totalPages = partyListQuery.data?.totalPages ?? 0;
  const isLoading = partyListQuery.isPending && !partyListQuery.data;
  const fetchError = Boolean(partyListQuery.error) && !partyListQuery.data;
  const hasActiveFilters = Boolean(
    normalizeMateSearchText(inputValue)
    || selectedDate
    || myTeamOnly,
  );

  useEffect(() => {
    if (!partyListQuery.isSuccess) return;
    const lastValidPage = Math.max(0, (partyListQuery.data?.totalPages ?? 0) - 1);
    if (queryPage <= lastValidPage) return;
    updateUrlState((current) => ({ ...current, queryPage: lastValidPage }));
  }, [partyListQuery.data?.totalPages, partyListQuery.isSuccess, queryPage, updateUrlState]);

  const handlePartyClick = useCallback((party: Party) => {
    seedMatePartyQueryData(queryClient, party);
    const returnTo = buildMateListReturnPath(
      canonicalizeMateListSearchParams(searchParams, { favoriteTeamId }),
    );
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party, returnTo),
    });
  }, [favoriteTeamId, navigate, queryClient, searchParams]);

  const handleFavoriteToggle = useCallback(async (party: Party) => {
    if (favoriteUpdatingPartyId !== null) {
      return;
    }
    if (!authUserId) {
      toast.error('찜하려면 로그인이 필요합니다.');
      return;
    }

    const previous = Boolean(party.favorited);
    const next = !previous;
    const applyFavoriteState = (favorited: boolean) => {
      updateMatePartyCollectionQueryData(queryClient, party.id, (currentParty) => ({
        ...currentParty,
        favorited,
      }));
    };

    setFavoriteUpdatingPartyId(party.id);
    applyFavoriteState(next);
    try {
      const confirmed = await setPartyFavorite(party.id, next);
      applyFavoriteState(confirmed);
    } catch (error: unknown) {
      console.error('찜 처리 중 오류:', error);
      applyFavoriteState(previous);
      toast.error('찜 처리 중 오류가 발생했습니다.');
    } finally {
      setFavoriteUpdatingPartyId(null);
    }
  }, [authUserId, favoriteUpdatingPartyId, queryClient]);

  useEffect(() => {
    if (rawLegacyPartyId !== null && legacyPartyId === null) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('party');
        return next;
      }, { replace: true });
    }
  }, [legacyPartyId, rawLegacyPartyId, setSearchParams]);

  useEffect(() => {
    if (legacyPartyId) {
      navigate(`/mate/${legacyPartyId}`, { replace: true });
    }
  }, [legacyPartyId, navigate]);

  const dateItems = useMemo(() => {
    const items: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i += 1) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      items.push(nextDate);
    }
    return items;
  }, []);

  const activeSeatFilterCount = useMemo(
    () => countActiveMateSeatFilters(inputValue || ''),
    [inputValue],
  );
  const activeMobileFilterCount = activeSeatFilterCount + (myTeamOnly ? 1 : 0);
  const mobileFilterButtonLabel = activeMobileFilterCount > 0
    ? `팀과 좌석 필터 ${activeMobileFilterCount}개 적용됨`
    : '팀과 좌석 필터 열기';

  const toggleSearchQuery = useCallback((keyword: string) => {
    const normalizedKeyword = normalizeMateSearchText(keyword);
    if (!normalizedKeyword) return;
    const normalizedInput = normalizeMateSearchText(inputValue);
    const nextInput = normalizedInput.includes(normalizedKeyword)
      ? normalizeMateSearchText(normalizedInput.replace(normalizedKeyword, ' '))
      : normalizeMateSearchText(`${normalizedInput} ${normalizedKeyword}`);
    searchInputSourceRef.current = 'external';
    setInputValue(nextInput);
    updateUrlState((current) => ({ ...current, searchQuery: nextInput, queryPage: 0 }));
  }, [inputValue, updateUrlState]);

  const handleDateSelect = useCallback((date: Date | null) => {
    const nextDate = date ? toDateString(date) : null;
    updateUrlState((current) => ({
      ...current,
      date: current.date === nextDate ? null : nextDate,
      queryPage: 0,
    }));
  }, [updateUrlState]);

  const handleMyTeamOnlyChange = useCallback((nextValue: boolean) => {
    updateUrlState((current) => ({ ...current, myTeamOnly: nextValue, queryPage: 0 }));
  }, [updateUrlState]);

  const applyMobileFilters = useCallback((nextMyTeamOnly: boolean, nextSearchQuery: string) => {
    const normalizedSearchQuery = normalizeMateSearchText(nextSearchQuery);
    searchInputSourceRef.current = 'external';
    setInputValue(normalizedSearchQuery);
    updateUrlState((current) => ({
      ...current,
      myTeamOnly: nextMyTeamOnly,
      searchQuery: normalizedSearchQuery,
      queryPage: 0,
    }));
    setIsMobileFilterOpen(false);
  }, [updateUrlState]);

  const handleSortChange = useCallback((nextSortKey: MateSortOptionKey) => {
    updateUrlState((current) => ({ ...current, activeSortKey: nextSortKey, queryPage: 0 }));
  }, [updateUrlState]);

  const handleResetFilters = useCallback(() => {
    searchInputSourceRef.current = 'external';
    setInputValue('');
    updateUrlState((current) => ({
      ...current,
      searchQuery: '',
      date: null,
      activeTab: 'all',
      myTeamOnly: false,
      activeSortKey: 'latest',
      queryPage: 0,
    }));
    setIsMobileFilterOpen(false);
  }, [updateUrlState]);

  const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    searchInputSourceRef.current = 'local';
    setInputValue(event.target.value);
  }, []);

  const applySearchTerm = useCallback((term: string) => {
    const normalizedTerm = normalizeMateSearchText(term);
    if (!normalizedTerm) {
      return;
    }

    searchInputSourceRef.current = 'external';
    setInputValue(normalizedTerm);
    updateUrlState((current) => ({ ...current, searchQuery: normalizedTerm, queryPage: 0 }));
  }, [updateUrlState]);

  const handleTabChange = useCallback((nextTab: MateStatusTabKey) => {
    updateUrlState((current) => ({ ...current, activeTab: nextTab, queryPage: 0 }));
  }, [updateUrlState]);

  const setCurrentPage = useCallback((nextPage: number) => {
    updateUrlState((current) => ({ ...current, queryPage: Math.max(0, nextPage) }));
  }, [updateUrlState]);

  const handleRetry = useCallback(() => {
    void partyListQuery.refetch();
  }, [partyListQuery]);

  const handleCreatePartyClick = useCallback(() => {
    navigate('/mate/create');
  }, [navigate]);

  const toggleGuideOpen = useCallback(() => {
    setIsGuideOpen((currentValue) => !currentValue);
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  const openMobileFilter = useCallback(() => {
    setIsMobileFilterOpen(true);
  }, []);

  const closeMobileFilter = useCallback(() => {
    setIsMobileFilterOpen(false);
  }, []);

  const toggleMyTeamOnly = useCallback(() => {
    handleMyTeamOnlyChange(!myTeamOnly);
  }, [handleMyTeamOnlyChange, myTeamOnly]);

  return {
    activeMobileFilterCount,
    activeSortKey,
    activeSortOption,
    activeTab,
    applySearchTerm,
    applyMobileFilters,
    authUserId,
    closeGuide,
    closeMobileFilter,
    dateItems,
    favoriteTeamId,
    favoriteUpdatingPartyId,
    fetchError,
    handleCreatePartyClick,
    handleDateSelect,
    handleMyTeamOnlyChange,
    handlePartyClick,
    handleFavoriteToggle,
    handleResetFilters,
    handleRetry,
    handleSearchInputChange,
    handleSortChange,
    handleTabChange,
    hasActiveFilters,
    inputValue,
    isDesktopListLayout,
    isGuideOpen,
    isLoading,
    isMobileFilterOpen,
    mobileFilterButtonLabel,
    myTeamOnly,
    openMobileFilter,
    parties,
    queryPage,
    selectedDate,
    setCurrentPage,
    toggleGuideOpen,
    toggleMyTeamOnly,
    toggleSearchQuery,
    totalPages,
  };
}

export type UseMateListControllerReturn = ReturnType<typeof useMateListController>;
