import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { setPartyFavorite } from '../api/mate';
import { useAuthProfileSnapshot } from '../store/authStore';
import { useMateStore } from '../store/mateStore';
import type { Party, PartyStatus } from '../types/mate';
import type { MateStatusTabKey } from '../components/MateStatusTabs';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';
import { buildMateRouteLocationState } from '../utils/mate';
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
  const searchQuery = useMateStore((state) => state.searchQuery);
  const setSearchQuery = useMateStore((state) => state.setSearchQuery);
  const { userFavoriteTeam: favoriteTeam, userId: authUserId } = useAuthProfileSnapshot();
  const favoriteTeamId = favoriteTeam && favoriteTeam !== '없음' ? favoriteTeam : null;
  const [myTeamOnly, setMyTeamOnly] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MateStatusTabKey>('all');
  const [activeSortKey, setActiveSortKey] = useState<MateSortOptionKey>('latest');
  const [favoriteUpdatingPartyId, setFavoriteUpdatingPartyId] = useState<number | null>(null);
  const filterSignatureRef = useRef<string | null>(null);
  const searchInputSourceRef = useRef<'local' | 'external'>('local');
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    searchInputSourceRef.current = 'external';
    setInputValue(normalizeMateSearchText(searchQuery || ''));
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedInput !== inputValue) {
      return;
    }
    if (searchInputSourceRef.current !== 'local') {
      return;
    }
    setSearchQuery(normalizeMateSearchText(debouncedInput));
  }, [debouncedInput, inputValue, setSearchQuery]);

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
  const dateKey = selectedDate ? toDateString(selectedDate) : '';
  const teamIdFilter = myTeamOnly && favoriteTeamId ? favoriteTeamId : undefined;
  const normalizedSearchQuery = normalizeMateSearchText(debouncedInput);
  const filterSignature = [
    normalizedSearchQuery,
    dateKey,
    selectedStatus ?? '',
    teamIdFilter ?? '',
    activeSortOption.sortBy,
    activeSortOption.sortDir,
  ].join('|');
  const shouldResetPage =
    filterSignatureRef.current !== null
    && filterSignatureRef.current !== filterSignature
    && currentPage !== 0;
  const queryPage = shouldResetPage ? 0 : currentPage;

  useEffect(() => {
    if (filterSignatureRef.current === filterSignature) {
      return;
    }

    filterSignatureRef.current = filterSignature;
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  }, [currentPage, filterSignature]);

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

  const handlePartyClick = useCallback((party: Party) => {
    seedMatePartyQueryData(queryClient, party);
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party),
    });
  }, [navigate, queryClient]);

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
    if (!normalizedKeyword) {
      return;
    }

    searchInputSourceRef.current = 'local';
    setInputValue((prevInput) => {
      const normalizedInput = normalizeMateSearchText(prevInput);
      return normalizedInput.includes(normalizedKeyword)
        ? normalizeMateSearchText(normalizedInput.replace(normalizedKeyword, ' '))
        : normalizeMateSearchText(`${normalizedInput} ${normalizedKeyword}`);
    });
    setCurrentPage(0);
  }, []);

  const handleDateSelect = useCallback((date: Date | null) => {
    if (date === null) {
      setSelectedDate(null);
      setCurrentPage(0);
      return;
    }

    const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
    setSelectedDate(isSelected ? null : date);
    setCurrentPage(0);
  }, [selectedDate]);

  const handleMyTeamOnlyChange = useCallback((nextValue: boolean) => {
    setMyTeamOnly(nextValue);
    setCurrentPage(0);
  }, []);

  const handleSortChange = useCallback((nextSortKey: MateSortOptionKey) => {
    setActiveSortKey(nextSortKey);
    setCurrentPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedDate(null);
    searchInputSourceRef.current = 'local';
    setInputValue('');
    setSearchQuery('');
    setMyTeamOnly(false);
    setActiveTab('all');
    setCurrentPage(0);
    setIsMobileFilterOpen(false);
  }, [setSearchQuery]);

  const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    searchInputSourceRef.current = 'local';
    setInputValue(event.target.value);
    setCurrentPage(0);
  }, []);

  const applySearchTerm = useCallback((term: string) => {
    const normalizedTerm = normalizeMateSearchText(term);
    if (!normalizedTerm) {
      return;
    }

    searchInputSourceRef.current = 'external';
    setInputValue(normalizedTerm);
    setSearchQuery(normalizedTerm);
    setCurrentPage(0);
  }, [setSearchQuery]);

  const handleTabChange = useCallback((nextTab: MateStatusTabKey) => {
    setActiveTab(nextTab);
    setCurrentPage(0);
  }, []);

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
