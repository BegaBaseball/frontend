import { lazy, Suspense, useCallback, useEffect, useRef, type ReactNode } from 'react';

import { recordMateSearchTerm } from '../api/mate';
import { useDebounce } from '../hooks/useDebounce';
import type { useMateListController } from '../hooks/useMateListController';
import { useAuthSession } from '../store/authStore';
import { useMateRecentSearchStore } from '../store/mateRecentSearchStore';
import {
  getMateSearchTermKey,
  normalizeMateSearchText,
  normalizeRecordableMateSearchTerm,
} from '../utils/mateSearchTerms';
import { MatePlusIcon, MateSearchIcon, MateTicketIcon } from './MateIcons';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MateFilterBottomSheet = lazy(() => import('./MateFilterBottomSheet'));
const MateGuidePanelRuntime = lazy(() => import('./MateGuidePanelRuntime'));
const MateDateRailFilter = lazy(() => import('./MateDateRailFilter'));
const MateMobileDateFilter = lazy(() => import('./MateMobileDateFilter'));
const MateSeatFilterButtons = lazy(() => import('./MateSeatFilterButtons'));
const MateSortDropdown = lazy(() => import('./MateSortDropdown'));
const MateStatusTabs = lazy(() => import('./MateStatusTabs'));
const MateTeamFilterButton = lazy(() => import('./MateTeamFilterButton'));
const MateMyPartiesPanel = lazy(() => import('./MateMyPartiesPanel'));
const MateTodayCountBadge = lazy(() => import('./MateTodayCountBadge'));
const MateViewToggle = lazy(() => import('./MateViewToggle'));
const MateRecentSearchesPanel = lazy(() => import('./MateRecentSearchesPanel'));
const MatePopularSearchesPanel = lazy(() => import('./MatePopularSearchesPanel'));

type MateListController = ReturnType<typeof useMateListController>;

interface MateListControlsRuntimeProps {
  controller: MateListController;
  children: ReactNode;
}

const GUIDE_BUTTON_CLASS = 'rounded-full px-4 font-bold text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary';
const CREATE_BUTTON_CLASS = 'rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg hover:bg-primary-hover';
const SIDEBAR_CARD_CLASS = 'rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]';

export default function MateListControlsRuntime({ controller, children }: MateListControlsRuntimeProps) {
  const {
    activeMobileFilterCount,
    activeSortKey,
    activeTab,
    applySearchTerm,
    applyMobileFilters,
    closeGuide,
    closeMobileFilter,
    dateItems,
    favoriteTeamId,
    handleCreatePartyClick,
    handleDateSelect,
    handleMyTeamOnlyChange,
    handleResetFilters,
    handleSearchInputChange,
    handleSortChange,
    handleTabChange,
    inputValue,
    isGuideOpen,
    isMobileFilterOpen,
    mobileFilterButtonLabel,
    myTeamOnly,
    openMobileFilter,
    selectedDate,
    toggleGuideOpen,
    toggleMyTeamOnly,
    toggleSearchQuery,
    handlePartyClick,
  } = controller;
  const addRecentSearch = useMateRecentSearchStore((state) => state.addRecentSearch);
  const { isAuthLoading, isLoggedIn } = useAuthSession();
  const serverHandledSearchTermsRef = useRef<Set<string>>(new Set());
  const stableRecordableSearchTerm = useDebounce(
    normalizeRecordableMateSearchTerm(inputValue),
    1200,
  );

  const commitSearchTerm = useCallback((rawTerm: string | null) => {
    const term = rawTerm ? normalizeRecordableMateSearchTerm(rawTerm) : null;
    const normalizedTermKey = term ? getMateSearchTermKey(term) : null;
    if (!term || !normalizedTermKey) {
      return;
    }

    addRecentSearch(term);

    if (isAuthLoading || serverHandledSearchTermsRef.current.has(normalizedTermKey)) {
      return;
    }

    serverHandledSearchTermsRef.current.add(normalizedTermKey);
    if (!isLoggedIn) {
      return;
    }

    void recordMateSearchTerm(term).catch(() => undefined);
  }, [addRecentSearch, isAuthLoading, isLoggedIn]);

  useEffect(() => {
    commitSearchTerm(stableRecordableSearchTerm);
  }, [commitSearchTerm, stableRecordableSearchTerm]);

  const handleSearchTermSelect = useCallback((term: string) => {
    const normalizedTerm = normalizeMateSearchText(term);
    if (!normalizedTerm) {
      return;
    }

    applySearchTerm(normalizedTerm);
    commitSearchTerm(normalizedTerm);
  }, [applySearchTerm, commitSearchTerm]);

  const renderDateFilter = (placement: 'rail' | 'scroller') => {
    const isRail = placement === 'rail';

    if (!isRail) {
      return (
        <Suspense fallback={<div className="mb-4 h-[82px] lg:hidden" aria-hidden="true" />}>
          <MateMobileDateFilter
            dateItems={dateItems}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<div className="h-[326px]" aria-hidden="true" />}>
        <MateDateRailFilter
          dateItems={dateItems}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      </Suspense>
    );
  };

  const renderTeamFilterButton = (layout: 'rail' | 'toolbar') => {
    if (!favoriteTeamId) {
      return null;
    }

    return (
      <Suspense fallback={null}>
        <MateTeamFilterButton
          layout={layout}
          favoriteTeamId={favoriteTeamId}
          myTeamOnly={myTeamOnly}
          onClick={toggleMyTeamOnly}
        />
      </Suspense>
    );
  };

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3 md:mb-6 md:items-end">
        <div className="min-w-0">
          <p className="mb-1 hidden text-15 font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-white sm:block">
            Mate Flow
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              직관 메이트 찾기
            </h1>
            <Suspense fallback={null}>
              <MateTodayCountBadge />
            </Suspense>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="touch"
            onClick={toggleGuideOpen}
            className={`${GUIDE_BUTTON_CLASS} sm:hidden`}
          >
            {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
          </Button>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Button
              variant="ghost"
              size="touch"
              onClick={toggleGuideOpen}
              className={GUIDE_BUTTON_CLASS}
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
            <Button
              size="touch"
              onClick={handleCreatePartyClick}
              className={CREATE_BUTTON_CLASS}
            >
              <MatePlusIcon className="mr-1 h-5 w-5" />
              파티 만들기
            </Button>
          </div>
        </div>
      </div>

      {isGuideOpen ? (
        <Suspense fallback={null}>
          <MateGuidePanelRuntime onClose={closeGuide} />
        </Suspense>
      ) : null}

      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-[22px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto pr-0.5">
            <Suspense fallback={null}>
              <MateMyPartiesPanel onPartyClick={handlePartyClick} />
            </Suspense>
            <section className={`${SIDEBAR_CARD_CLASS} space-y-3`}>
              <h2 className="text-13 font-black text-gray-900 dark:text-white">경기 날짜</h2>
              {renderDateFilter('rail')}
            </section>

            <section className={`${SIDEBAR_CARD_CLASS} space-y-3`}>
              <h2 className="text-13 font-black text-gray-900 dark:text-white">팀</h2>
              {renderTeamFilterButton('rail') ?? (
                <div className="rounded-10 border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-12 font-bold text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  관심 구단 설정 후 사용할 수 있습니다.
                </div>
              )}
            </section>

            <section className={`${SIDEBAR_CARD_CLASS} space-y-3`}>
              <h2 className="text-13 font-black text-gray-900 dark:text-white">좌석</h2>
              <Suspense fallback={null}>
                <MateSeatFilterButtons
                  layout="rail"
                  inputValue={inputValue}
                  onToggleSeat={toggleSearchQuery}
                />
              </Suspense>
            </section>

            <Suspense fallback={null}>
              <MateRecentSearchesPanel onTermClick={handleSearchTermSelect} />
            </Suspense>

            <Suspense fallback={null}>
              <MatePopularSearchesPanel onTermClick={handleSearchTermSelect} />
            </Suspense>
          </div>
        </aside>

        <section className="min-w-0">
          {renderDateFilter('scroller')}

          <div className="sticky top-16 z-30 -mx-4 mb-4 border-y border-gray-200/80 bg-gray-50/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-14 md:border lg:static lg:mb-[14px] lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:border-white/10 dark:bg-[#000000]/95 lg:dark:bg-transparent">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-[10px]">
                <div className="flex min-w-0 flex-1 gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="mate-search" className="sr-only">
                      메이트 파티 검색
                    </label>
                    <div className="relative">
                      <MateSearchIcon aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white" />
                      <Input
                        id="mate-search"
                        type="text"
                        placeholder="팀명, 구장, 좌석으로 검색 (예: 삼성 블루존)"
                        value={inputValue}
                        onChange={handleSearchInputChange}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitSearchTerm(inputValue);
                          }
                        }}
                        className="h-[46px] rounded-14 border-gray-200/80 bg-white pl-11 pr-4 text-13 font-medium text-gray-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-[#000000] dark:text-white dark:placeholder-zinc-500"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="touch"
                    aria-label={mobileFilterButtonLabel}
                    onClick={openMobileFilter}
                    className="h-[46px] shrink-0 rounded-14 border-gray-200/80 bg-white px-3 text-13 font-bold text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20 lg:hidden"
                  >
                    <MateTicketIcon className="h-4 w-4" />
                    <span>필터</span>
                    {activeMobileFilterCount ? (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-12 font-black leading-none text-primary-foreground">
                        {activeMobileFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </div>
                <div className="hidden shrink-0 items-center gap-[10px] lg:flex">
                  <Suspense fallback={null}>
                    <MateSortDropdown activeSortKey={activeSortKey} onSortChange={handleSortChange} />
                  </Suspense>
                  <Suspense fallback={null}>
                    <MateViewToggle />
                  </Suspense>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <Suspense fallback={null}>
                  <MateStatusTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />
                </Suspense>
                <div className="flex items-center gap-2 lg:hidden">
                  <Suspense fallback={null}>
                    <MateSortDropdown activeSortKey={activeSortKey} onSortChange={handleSortChange} />
                  </Suspense>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                {renderTeamFilterButton('toolbar')}
                <Button
                  size="touch"
                  onClick={handleCreatePartyClick}
                  className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-[0_10px_24px_rgba(15,23,42,0.16)] hover:bg-primary-hover sm:hidden"
                >
                  <MatePlusIcon className="mr-1 h-5 w-5" />
                  파티 만들기
                </Button>
              </div>
            </div>
          </div>

          {children}
        </section>
      </div>

      {isMobileFilterOpen ? (
        <Suspense fallback={null}>
          <MateFilterBottomSheet
            open={isMobileFilterOpen}
            favoriteTeamId={favoriteTeamId}
            myTeamOnly={myTeamOnly}
            inputValue={inputValue}
            onClose={closeMobileFilter}
            onSearchTermSelect={handleSearchTermSelect}
            onApplyFilters={applyMobileFilters}
            onPopularTermSelect={closeMobileFilter}
            onResetFilters={handleResetFilters}
          />
        </Suspense>
      ) : null}
    </>
  );
}
