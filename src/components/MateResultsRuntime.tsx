import { lazy, Suspense } from 'react';

import AdSlot from './ads/AdSlot';
import { Button } from './ui/button';
import {
  MateAlertCircleIcon,
  MateChevronLeftIcon,
  MateChevronRightIcon,
  MatePlusIcon,
  MateRefreshIcon,
  MateUsersIcon,
} from './MateIcons';
import type { Party } from '../types/mate';

const MatePartyCard = lazy(() => import('./MatePartyCard'));

type MateResultsTabKey = 'all' | 'recruiting' | 'matched' | 'selling';

interface MateResultsRuntimeProps {
  parties: Party[];
  totalPages: number;
  queryPage: number;
  activeTab: MateResultsTabKey;
  authUserId?: number | null;
  isLoading: boolean;
  fetchError: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onCreateParty: () => void;
  onPartyClick: (party: Party) => void;
  onPageChange: (nextPage: number) => void;
}

const EMPTY_MESSAGES_BY_TAB: Record<MateResultsTabKey, { withFilter: string; withoutFilter: string }> = {
  all: { withFilter: '검색 조건에 맞는 파티가 없습니다', withoutFilter: '아직 개설된 파티가 없습니다' },
  recruiting: { withFilter: '검색 조건에 맞는 모집 중 파티가 없습니다', withoutFilter: '현재 모집 중인 파티가 없습니다' },
  matched: { withFilter: '검색 조건에 맞는 매칭 완료 파티가 없습니다', withoutFilter: '매칭 완료된 파티가 없습니다' },
  selling: { withFilter: '검색 조건에 맞는 티켓 판매 파티가 없습니다', withoutFilter: '티켓 판매 중인 파티가 없습니다' },
};

export default function MateResultsRuntime({
  parties,
  totalPages,
  queryPage,
  activeTab,
  authUserId,
  isLoading,
  fetchError,
  hasActiveFilters,
  onRetry,
  onResetFilters,
  onCreateParty,
  onPartyClick,
  onPageChange,
}: MateResultsRuntimeProps) {
  const renderSkeletonGrid = () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5 2xl:gap-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex min-h-[150px] animate-pulse flex-col gap-[10px] rounded-[18px] border border-gray-200/80 bg-white p-[14px] dark:border-white/15 dark:bg-[#16181c]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-5 w-28 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-5 w-16 rounded bg-primary/15" />
          </div>
          <div className="h-9 rounded-lg bg-gray-100 dark:bg-white/5" />
          <div className="mt-1 h-8 rounded-lg bg-gray-100 dark:bg-white/5" />
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (tabKey: MateResultsTabKey) => {
    const messages = EMPTY_MESSAGES_BY_TAB[tabKey];

    return (
      <div className="rounded-[24px] border border-gray-200/80 bg-gradient-to-br from-white via-white to-primary/5 px-5 py-16 text-center shadow-sm dark:border-white/15 dark:from-[#16181c] dark:via-[#16181c] dark:to-primary/10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <MateUsersIcon className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xl font-black tracking-tight text-gray-950 dark:text-white">
          {hasActiveFilters ? messages.withFilter : messages.withoutFilter}
        </p>
        {hasActiveFilters ? (
          <>
            <p className="mx-auto mb-6 max-w-md text-[16px] font-bold leading-6 text-gray-600 dark:text-zinc-300">
              검색어를 줄이거나 날짜, 팀, 좌석 조건을 초기화하면 더 많은 파티를 볼 수 있습니다.
            </p>
            <Button
              variant="outline"
              size="touch"
              className="rounded-xl border-primary/25 bg-primary/10 px-5 font-black text-primary hover:bg-primary/15"
              onClick={onResetFilters}
            >
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <p className="mx-auto mb-6 max-w-md text-[16px] font-bold leading-6 text-gray-600 dark:text-zinc-300">
              원하는 경기와 좌석 조건으로 첫 번째 직관 메이트를 모집해보세요.
            </p>
            <Button
              size="touch"
              className="rounded-xl bg-primary px-5 font-black text-primary-foreground hover:bg-primary-hover"
              onClick={onCreateParty}
            >
              <MatePlusIcon className="mr-1 h-4 w-4" />
              파티 만들기
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderPartyGrid = (items: Party[]) => (
    <Suspense fallback={renderSkeletonGrid()}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:gap-5 2xl:gap-6">
        {items.flatMap((party, index) => [
          <MatePartyCard
            key={party.id}
            party={party}
            onClick={onPartyClick}
          />,
          index === 3 && items.length > 4 ? (
            <AdSlot
              key="mate-list-1"
              slotId="mate_list_1"
              pageType="mate_list"
              listIndex={4}
              creativeType="native_card"
              loggedIn={Boolean(authUserId)}
              userId={authUserId ? String(authUserId) : null}
              minHeight={156}
            />
          ) : null,
        ])}
      </div>
    </Suspense>
  );

  const renderPagination = () => (
    <div className="mb-8 mt-10 flex items-center justify-center gap-2 sm:gap-4">
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary"
        onClick={() => onPageChange(Math.max(0, queryPage - 1))}
        disabled={queryPage === 0}
        size="touch"
      >
        <MateChevronLeftIcon className="mr-1 h-4 w-4" />
        이전
      </Button>
      <span className="rounded-full bg-gray-100 px-3 py-2 text-[16px] font-bold text-gray-600 dark:bg-white/5 dark:text-zinc-300">
        {`${queryPage + 1} / ${totalPages}`}
      </span>
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary"
        onClick={() => onPageChange(Math.min(totalPages - 1, queryPage + 1))}
        disabled={queryPage >= totalPages - 1}
        size="touch"
      >
        다음
        <MateChevronRightIcon className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-label="메이트 파티 목록 불러오는 중">
        {renderSkeletonGrid()}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div role="alert" className="rounded-[24px] border border-red-300 bg-red-50 px-5 py-14 text-center shadow-sm dark:border-red-900/70 dark:bg-red-950/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-300 bg-white text-red-600 shadow-sm dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
          <MateAlertCircleIcon className="h-7 w-7" />
        </div>
        <p className="text-xl font-black tracking-tight text-red-950 dark:text-red-50">
          파티 목록을 불러오지 못했습니다
        </p>
        <p className="mx-auto mt-2 max-w-md text-[16px] font-bold leading-6 text-red-700 dark:text-red-100">
          일시적인 연결 문제일 수 있습니다. 잠시 후 다시 시도하거나 네트워크 상태를 확인해주세요.
        </p>
        <Button
          variant="outline"
          size="touch"
          className="mt-6 rounded-xl border-red-300 bg-white px-5 font-black text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-100 dark:hover:bg-red-900/30"
          onClick={onRetry}
        >
          <MateRefreshIcon className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="m-0 space-y-4">
      <div className="transition-opacity duration-200">
        {parties.length === 0 ? (
          renderEmptyState(activeTab)
        ) : (
          <>
            {renderPartyGrid(parties)}
            {totalPages > 1 ? renderPagination() : null}
          </>
        )}
      </div>
    </div>
  );
}
