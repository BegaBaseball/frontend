import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { getMatePartyListQueryOptions } from '../hooks/mateQueryOptions';
import { seedMatePartyQueryData } from '../hooks/mateList';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthProfileSnapshot } from '../store/authStore';
import { useMateStore } from '../store/mateStore';
import type { Party, PartyStatus } from '../types/mate';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';
import { MATE_SORT_OPTIONS, type MateSortOptionKey } from '../utils/mateSortOptions';
import { SEAT_ICONS } from '../utils/seatIcons';
import { KBO_STADIUMS, SEAT_CATEGORIES, type SeatCategory } from '../utils/stadiumData';
import { buildMateRouteLocationState, getDayOfWeek } from '../utils/mate';
import TeamLogo from './TeamLogo';
import type { MateSeatFilterOption } from './MateFilterBottomSheet';
import type { MateStatusTabKey } from './MateStatusTabs';
import { MatePlusIcon, MateSearchIcon, MateTicketIcon } from './MateIcons';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MateFilterBottomSheet = lazy(() => import('./MateFilterBottomSheet'));
const MateGuidePanelRuntime = lazy(() => import('./MateGuidePanelRuntime'));
const MateMobileDateFilter = lazy(() => import('./MateMobileDateFilter'));
const MateResultsRuntime = lazy(() => import('./MateResultsRuntime'));
const MateSeatFilterButtons = lazy(() => import('./MateSeatFilterButtons'));
const MateSortDropdown = lazy(() => import('./MateSortDropdown'));
const MateStatusTabs = lazy(() => import('./MateStatusTabs'));

type MateTabKey = MateStatusTabKey;

const FILTER_ACTIVE_CLASS = 'border-transparent bg-primary text-primary-foreground shadow-sm dark:bg-primary dark:text-primary-foreground';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary';
const FILTER_SURFACE_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20';
const GUIDE_BUTTON_CLASS = 'rounded-full px-4 font-bold text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary';
const CREATE_BUTTON_CLASS = 'rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg hover:bg-primary-hover';

const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return [year, month, day].join('-');
};

const getStadiumFromQuery = (query: string) => {
  if (!query) return null;
  const normalized = query.toLowerCase();
  return Object.values(KBO_STADIUMS).find((stadium) =>
    stadium.name.includes(normalized)
    || stadium.homeTeam.toLowerCase().split('/').some((team) => normalized.includes(team.toLowerCase()))
    || (stadium.id === 'Daegu' && normalized.includes('삼성'))
    || (stadium.id === 'Jamsil' && (normalized.includes('lg') || normalized.includes('두산')))
    || (stadium.id === 'Incheon' && (normalized.includes('ssg') || normalized.includes('sk')))
    || (stadium.id === 'Gwangju' && normalized.includes('kia'))
    || (stadium.id === 'Suwon' && normalized.includes('kt'))
    || (stadium.id === 'Changwon' && normalized.includes('nc'))
    || (stadium.id === 'Sajik' && normalized.includes('롯데'))
    || (stadium.id === 'Gocheok' && normalized.includes('키움'))
    || (stadium.id === 'Daejeon' && normalized.includes('한화'))
  );
};

function MateGuideFallback() {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white px-4 py-8 text-center text-[16px] text-gray-500 shadow-lg dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400">
      이용 가이드를 준비하고 있습니다.
    </div>
  );
}

function MateResultsFallback() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:gap-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[304px] animate-pulse rounded-[22px] border border-gray-200/80 bg-white dark:border-white/10 dark:bg-[#16181c]"
          />
        ))}
      </div>
    </div>
  );
}

export default function Mate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [activeTab, setActiveTab] = useState<MateTabKey>('all');
  const [activeSortKey, setActiveSortKey] = useState<MateSortOptionKey>('latest');
  const filterSignatureRef = useRef<string | null>(null);
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery(debouncedInput);
  }, [debouncedInput, setSearchQuery]);

  const currentStadium = getStadiumFromQuery(inputValue || '');
  const activeSortOption = MATE_SORT_OPTIONS.find((option) => option.key === activeSortKey) ?? MATE_SORT_OPTIONS[0]!;

  const toggleSearchQuery = (keyword: string) => {
    setInputValue((prevInput) => {
      const normalizedInput = prevInput.trim();
      return normalizedInput.includes(keyword)
        ? normalizedInput.replace(keyword, '').replace(/\s+/g, ' ').trim()
        : `${normalizedInput} ${keyword}`.replace(/\s+/g, ' ').trim();
    });
    setCurrentPage(0);
  };

  const tabToStatusMap: Record<MateTabKey, PartyStatus | undefined> = {
    all: undefined,
    recruiting: 'PENDING',
    matched: 'MATCHED',
    selling: 'SELLING',
  };
  const selectedStatus = tabToStatusMap[activeTab];
  const dateKey = selectedDate ? toDateString(selectedDate) : '';
  const teamIdFilter = myTeamOnly && favoriteTeamId ? favoriteTeamId : undefined;
  const normalizedSearchQuery = debouncedInput.trim();
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

  const pageSize = 9;
  const partyListQuery = useQuery({
    ...getMatePartyListQueryOptions({
      teamId: teamIdFilter,
      page: queryPage,
      size: pageSize,
      status: selectedStatus,
      searchQuery: normalizedSearchQuery || undefined,
      gameDate: dateKey || undefined,
      sortBy: activeSortOption.sortBy,
      sortDir: activeSortOption.sortDir,
    }),
  });
  const parties = partyListQuery.data?.content ?? [];
  const totalPages = partyListQuery.data?.totalPages ?? 0;
  const isLoading = partyListQuery.isPending && !partyListQuery.data;
  const fetchError = Boolean(partyListQuery.error) && !partyListQuery.data;
  const hasActiveFilters = Boolean(
    inputValue.trim()
    || selectedDate
    || myTeamOnly,
  );

  const handlePartyClick = (party: Party) => {
    seedMatePartyQueryData(queryClient, party);
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party),
    });
  };

  const generateDateItems = () => {
    const items = [];
    const today = new Date();
    for (let i = 0; i < 14; i += 1) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      items.push(nextDate);
    }
    return items;
  };

  const dateItems = generateDateItems();
  const seatFilterOptions: MateSeatFilterOption[] = currentStadium
    ? currentStadium.zones
      .filter((zone) => ['CHEERING', 'TABLE', 'PREMIUM'].includes(zone.category))
      .slice(0, 6)
      .map((zone) => ({
        id: zone.id,
        label: zone.name,
        icon: SEAT_ICONS[zone.category as SeatCategory],
      }))
    : Object.entries(SEAT_CATEGORIES)
      .filter(([key]) => ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING'].includes(key))
      .map(([key, info]) => ({
        id: key,
        label: info.label,
        icon: SEAT_ICONS[key as SeatCategory],
      }));
  const activeSeatFilterCount = seatFilterOptions.filter((option) => inputValue.includes(option.label)).length;
  const activeMobileFilterCount = activeSeatFilterCount + (myTeamOnly ? 1 : 0);
  const mobileFilterButtonLabel = activeMobileFilterCount > 0
    ? `팀과 좌석 필터 ${activeMobileFilterCount}개 적용됨`
    : '팀과 좌석 필터 열기';

  const handleDateSelect = (date: Date | null) => {
    if (date === null) {
      setSelectedDate(null);
      setCurrentPage(0);
      return;
    }

    const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
    setSelectedDate(isSelected ? null : date);
    setCurrentPage(0);
  };

  const handleMyTeamOnlyChange = (nextValue: boolean) => {
    setMyTeamOnly(nextValue);
    setCurrentPage(0);
  };

  const handleSortChange = (nextSortKey: MateSortOptionKey) => {
    setActiveSortKey(nextSortKey);
    setCurrentPage(0);
  };

  const handleResetFilters = () => {
    setSelectedDate(null);
    setInputValue('');
    setMyTeamOnly(false);
    setActiveTab('all');
    setCurrentPage(0);
    setIsMobileFilterOpen(false);
  };

  const renderDateFilter = (placement: 'rail' | 'scroller') => {
    const isRail = placement === 'rail';

    if (!isRail) {
      return (
        <Suspense fallback={<div className="mb-4 h-[82px] xl:hidden" aria-hidden="true" />}>
          <MateMobileDateFilter
            dateItems={dateItems}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </Suspense>
      );
    }

    return (
      <div role="group" aria-label="경기 날짜 필터" className="grid grid-cols-2 gap-2">
        <Button
          variant={selectedDate === null ? 'default' : 'outline'}
          aria-pressed={selectedDate === null}
          aria-label={`전체 날짜 필터${selectedDate === null ? ', 선택됨' : ''}`}
          onClick={() => handleDateSelect(null)}
          className={`h-12 rounded-xl px-3 font-bold ${
            selectedDate === null
              ? `${FILTER_ACTIVE_CLASS} shadow-sm`
              : FILTER_IDLE_CLASS
          }`}
        >
          전체
        </Button>
        {dateItems.map((date, idx) => {
          const dateString = toDateString(date);
          const isSelected = selectedDate && toDateString(selectedDate) === dateString;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const quickLabel = idx === 0 ? '오늘' : idx === 1 ? '내일' : getDayOfWeek(dateString);
          const dateButtonLabel = `${date.getMonth() + 1}월 ${date.getDate()}일 ${getDayOfWeek(dateString)}요일`;
          const dateFilterLabel = isRail
            ? `${dateButtonLabel} 날짜 필터${isSelected ? ', 선택됨' : ''}`
            : `${dateButtonLabel} 필터${isSelected ? ', 선택됨' : ''}`;

          return (
            <button
              key={dateString}
              type="button"
              onClick={() => handleDateSelect(date)}
              aria-label={dateFilterLabel}
              aria-pressed={Boolean(isSelected)}
              className={`flex h-12 flex-col items-center justify-center rounded-xl border px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0a] ${
                isSelected
                  ? `${FILTER_ACTIVE_CLASS} shadow-sm`
                  : FILTER_SURFACE_IDLE_CLASS
              }`}
            >
              <span className={`text-[13px] font-bold leading-4 ${
                isSelected
                  ? 'text-primary-foreground'
                  : isWeekend
                    ? 'text-primary/80'
                    : 'text-gray-600 dark:text-zinc-400'
              }`}
              >
                {quickLabel}
              </span>
              <span className={`text-[16px] font-black leading-5 ${
                isSelected ? 'text-primary-foreground' : 'text-gray-800 dark:text-zinc-200'
              }`}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTeamFilterButton = (layout: 'rail' | 'toolbar') => {
    if (!favoriteTeamId) {
      return null;
    }

    return (
      <Button
        variant="outline"
        size="touch"
        aria-pressed={myTeamOnly}
        className={`${layout === 'rail' ? 'w-full justify-start rounded-xl' : 'rounded-full'} px-4 text-[15px] font-bold transition-colors ${
          myTeamOnly
            ? FILTER_ACTIVE_CLASS
            : FILTER_IDLE_CLASS
        }`}
        onClick={() => handleMyTeamOnlyChange(!myTeamOnly)}
      >
        <TeamLogo teamId={favoriteTeamId} size={16} className="mr-2 opacity-90" />
        내 팀 경기만
      </Button>
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-[#0a0a0a]">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-start justify-between gap-3 md:mb-6 md:items-end">
          <div className="min-w-0">
            <p className="mb-1 hidden text-[15px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 sm:block">
              Mate Flow
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              직관 메이트 찾기
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <Button
              variant="ghost"
              size="touch"
              onClick={() => setIsGuideOpen((currentValue) => !currentValue)}
              className={GUIDE_BUTTON_CLASS}
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
          </div>
        </div>

        {isGuideOpen ? (
          <Suspense fallback={<MateGuideFallback />}>
            <MateGuidePanelRuntime onClose={() => setIsGuideOpen(false)} />
          </Suspense>
        ) : null}

        <div className="xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-6">
          <aside className="hidden xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#16181c]">
              <section className="space-y-3">
                <h2 className="text-[15px] font-black text-gray-900 dark:text-zinc-100">경기 날짜</h2>
                {renderDateFilter('rail')}
              </section>

              <section className="space-y-3">
                <h2 className="text-[15px] font-black text-gray-900 dark:text-zinc-100">팀</h2>
                {renderTeamFilterButton('rail') ?? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                    관심 구단 설정 후 사용할 수 있습니다.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-[15px] font-black text-gray-900 dark:text-zinc-100">좌석</h2>
                <Suspense fallback={null}>
                  <MateSeatFilterButtons
                    layout="rail"
                    seatOptions={seatFilterOptions}
                    inputValue={inputValue}
                    onToggleSeat={toggleSearchQuery}
                  />
                </Suspense>
              </section>
            </div>
          </aside>

          <section className="min-w-0">
            {renderDateFilter('scroller')}

            <div className="sticky top-16 z-30 -mx-4 mb-4 border-y border-gray-200/80 bg-gray-50/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border lg:static lg:mb-5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:border-white/10 dark:bg-[#0a0a0a]/95 lg:dark:bg-transparent">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="mate-search" className="sr-only">
                        메이트 파티 검색
                      </label>
                      <div className="relative">
                        <MateSearchIcon aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-400" />
                        <Input
                          id="mate-search"
                          type="text"
                          placeholder="팀명, 구장, 좌석으로 검색 (예: 삼성 블루존)"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setCurrentPage(0);
                          }}
                          className="h-12 rounded-2xl border-gray-200/80 bg-white pl-11 text-gray-900 placeholder:text-gray-500 transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/40 dark:border-white/10 dark:bg-[#16181c] dark:text-white dark:placeholder-zinc-400"
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="touch"
                      aria-label={mobileFilterButtonLabel}
                      onClick={() => setIsMobileFilterOpen(true)}
                      className="shrink-0 rounded-2xl border-gray-200/80 bg-white px-3 font-bold text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 lg:hidden"
                    >
                      <MateTicketIcon className="h-4 w-4" />
                      <span>필터</span>
                      {activeMobileFilterCount ? (
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[12px] font-black leading-none text-primary-foreground">
                          {activeMobileFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <Button
                      variant="ghost"
                      size="touch"
                      onClick={() => setIsGuideOpen((currentValue) => !currentValue)}
                      className={GUIDE_BUTTON_CLASS}
                    >
                      {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
                    </Button>
                    <Button
                      size="touch"
                      onClick={() => navigate('/mate/create')}
                      className={CREATE_BUTTON_CLASS}
                    >
                      <MatePlusIcon className="mr-1 h-5 w-5" />
                      파티 만들기
                    </Button>
                  </div>
                </div>

                <div className="hidden lg:block xl:hidden">
                  <div role="group" aria-label="좌석 및 팀 필터" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {renderTeamFilterButton('toolbar')}
                    {favoriteTeamId ? <div className="mx-1 h-5 w-px shrink-0 bg-primary/20" /> : null}
                    <Suspense fallback={null}>
                      <MateSeatFilterButtons
                        layout="toolbar"
                        seatOptions={seatFilterOptions}
                        inputValue={inputValue}
                        onToggleSeat={toggleSearchQuery}
                      />
                    </Suspense>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <Suspense fallback={null}>
                    <MateStatusTabs
                      activeTab={activeTab}
                      onTabChange={(nextTab) => {
                        setActiveTab(nextTab);
                        setCurrentPage(0);
                      }}
                    />
                  </Suspense>
                  <Suspense
                    fallback={(
                      <Button
                        variant="outline"
                        size="touch"
                        className="rounded-full border-gray-200/80 bg-white px-4 font-bold text-gray-700 dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-200"
                      >
                        정렬: {activeSortOption.label}
                      </Button>
                    )}
                  >
                    <MateSortDropdown activeSortKey={activeSortKey} onSortChange={handleSortChange} />
                  </Suspense>
                </div>

                <Button
                  size="touch"
                  onClick={() => navigate('/mate/create')}
                  className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-[0_10px_24px_rgba(15,23,42,0.16)] hover:bg-primary-hover sm:hidden"
                >
                  <MatePlusIcon className="mr-1 h-5 w-5" />
                  파티 만들기
                </Button>
              </div>
            </div>

            <Suspense fallback={<MateResultsFallback />}>
              <MateResultsRuntime
                parties={parties}
                totalPages={totalPages}
                queryPage={queryPage}
                activeTab={activeTab}
                authUserId={authUserId}
                isLoading={isLoading}
                fetchError={fetchError}
                hasActiveFilters={hasActiveFilters}
                onRetry={() => {
                  void partyListQuery.refetch();
                }}
                onResetFilters={handleResetFilters}
                onCreateParty={() => navigate('/mate/create')}
                onPartyClick={handlePartyClick}
                onPageChange={setCurrentPage}
              />
            </Suspense>
          </section>
        </div>
      </div>

      {isMobileFilterOpen ? (
        <Suspense fallback={null}>
          <MateFilterBottomSheet
            open={isMobileFilterOpen}
            favoriteTeamId={favoriteTeamId}
            myTeamOnly={myTeamOnly}
            seatOptions={seatFilterOptions}
            inputValue={inputValue}
            activeFilterCount={activeMobileFilterCount}
            onClose={() => setIsMobileFilterOpen(false)}
            onMyTeamOnlyChange={handleMyTeamOnlyChange}
            onToggleSeat={toggleSearchQuery}
            onResetFilters={handleResetFilters}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
