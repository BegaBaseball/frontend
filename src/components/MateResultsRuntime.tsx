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
import MatePartyCard from './MatePartyCard';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { Party } from '../types/mate';

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
  const isRichCardLayout = useMediaQuery('(min-width: 1024px)');
  const partyCardVariant = isRichCardLayout ? 'rich' : 'compact';

  const renderEmptyState = (tabKey: MateResultsTabKey) => {
    const messages = EMPTY_MESSAGES_BY_TAB[tabKey];

    return (
      <div className="rounded-2xl border border-gray-200/70 bg-white py-20 text-center dark:border-white/5 dark:bg-[#16181c]">
        <MateUsersIcon className="mx-auto mb-4 h-12 w-12 text-gray-500 dark:text-zinc-600" />
        <p className="mb-2 font-bold text-gray-900 dark:text-zinc-200">
          {hasActiveFilters ? messages.withFilter : messages.withoutFilter}
        </p>
        {hasActiveFilters ? (
          <>
            <p className="mb-6 text-[16px] font-bold text-gray-500 dark:text-zinc-500">
              검색어나 날짜 필터를 변경해보세요
            </p>
            <Button
              variant="outline"
              size="touch"
              className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
              onClick={onResetFilters}
            >
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <p className="mb-6 text-[16px] font-bold text-gray-500 dark:text-zinc-500">
              첫 번째 파티를 만들어보세요!
            </p>
            <Button
              size="touch"
              className="bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-[1500px]:grid-cols-3 xl:gap-5">
      {items.flatMap((party, index) => [
        <MatePartyCard
          key={party.id}
          party={party}
          variant={partyCardVariant}
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
  );

  const renderPagination = () => (
    <div className="mb-8 mt-10 flex items-center justify-center gap-2 sm:gap-4">
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-300 dark:hover:bg-primary/15 dark:hover:text-primary"
        onClick={() => onPageChange(Math.max(0, queryPage - 1))}
        disabled={queryPage === 0}
        size="touch"
      >
        <MateChevronLeftIcon className="mr-1 h-4 w-4" />
        이전
      </Button>
      <span className="text-[16px] font-bold text-gray-500 dark:text-zinc-400">
        {`${queryPage + 1} / ${totalPages}`}
      </span>
      <Button
        variant="outline"
        className="border-gray-200/80 bg-white text-gray-700 hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-300 dark:hover:bg-primary/15 dark:hover:text-primary"
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-[1500px]:grid-cols-3 xl:gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="h-[360px] animate-pulse rounded-[24px] border border-gray-200/80 bg-white dark:border-white/10 dark:bg-[#16181c]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div role="alert" className="rounded-2xl border border-dashed border-red-300 bg-red-50 px-4 py-16 text-center dark:border-red-900/60 dark:bg-red-950/30">
        <MateAlertCircleIcon className="mx-auto mb-3 h-10 w-10 text-red-600 dark:text-red-300" />
        <p className="font-bold text-red-950 dark:text-red-100">파티 목록을 불러오지 못했습니다</p>
        <p className="mt-1 text-[16px] font-bold text-red-700 dark:text-red-200">
          네트워크 연결을 확인하고 다시 시도해주세요
        </p>
        <Button
          variant="outline"
          size="touch"
          className="mt-5 border-red-300 bg-white text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-900/30"
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
