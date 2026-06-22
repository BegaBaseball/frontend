import { resolveMateSeatFilterOptions } from '../utils/mateSeatFilterOptions';
import { SEAT_ICONS } from '../utils/seatIcons';
import MatePopularSearchesPanel from './MatePopularSearchesPanel';
import MateRecentSearchesPanel from './MateRecentSearchesPanel';
import TeamLogo from './TeamLogo';
import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';

export type { MateSeatFilterOption } from '../utils/mateSeatFilterOptions';

interface MateFilterBottomSheetProps {
  open: boolean;
  favoriteTeamId: string | null;
  myTeamOnly: boolean;
  inputValue: string;
  activeFilterCount: number;
  onClose: () => void;
  onMyTeamOnlyChange: (nextValue: boolean) => void;
  onToggleSeat: (keyword: string) => void;
  onSearchTermSelect?: (term: string) => void;
  onPopularTermSelect?: () => void;
  onResetFilters: () => void;
}

export default function MateFilterBottomSheet({
  open,
  favoriteTeamId,
  myTeamOnly,
  inputValue,
  activeFilterCount,
  onClose,
  onMyTeamOnlyChange,
  onToggleSeat,
  onSearchTermSelect,
  onPopularTermSelect,
  onResetFilters,
}: MateFilterBottomSheetProps) {
  const seatOptions = resolveMateSeatFilterOptions(inputValue);

  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      placement="bottom"
      title="메이트 필터"
      description="내 팀 경기와 좌석 유형을 빠르게 좁혀보세요."
      className="max-h-[82vh] max-w-2xl rounded-b-none rounded-t-3xl border-none bg-gray-50 dark:bg-[#000000]"
      bodyClassName="max-h-[calc(82vh-132px)] overflow-y-auto px-5 pb-5 pt-4"
      footer={(
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="touch"
            className="w-full rounded-xl focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-[#000000]"
            disabled={activeFilterCount === 0}
            onClick={onResetFilters}
          >
            초기화
          </Button>
          <Button
            size="touch"
            className="w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000]"
            onClick={onClose}
          >
            적용
          </Button>
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]">
          <p className="text-[13px] font-black text-primary dark:text-primary-light">
            {activeFilterCount > 0 ? `${activeFilterCount}개 조건 적용 중` : '적용된 조건 없음'}
          </p>
          <p className="mt-1 text-[12px] font-bold text-gray-500 dark:text-white">
            팀, 좌석, 날짜, 상태 조건을 한 번에 초기화할 수 있습니다.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]">
          <p className="text-[13px] font-black text-gray-900 dark:text-white">팀</p>
          {favoriteTeamId ? (
            <button
              type="button"
              aria-pressed={myTeamOnly}
              onClick={() => onMyTeamOnlyChange(!myTeamOnly)}
              className={`flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
                myTeamOnly
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:border-white/15 dark:bg-[#000000] dark:text-white'
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <TeamLogo teamId={favoriteTeamId} size={28} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-black">내 팀 경기만</span>
                  <span className="block text-[12px] font-bold text-gray-500 dark:text-white">
                    관심 구단 경기로 목록을 좁힙니다.
                  </span>
                </span>
              </span>
              <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${myTeamOnly ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-600'}`} />
            </button>
          ) : (
            <div className="rounded-[10px] border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-bold text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white">
              관심 구단을 설정하면 내 팀 경기만 볼 수 있습니다.
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]">
          <p className="text-[13px] font-black text-gray-900 dark:text-white">좌석</p>
          <div className="flex flex-wrap gap-1.5">
            {seatOptions.map((option) => {
              const isActive = inputValue.includes(option.label);

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggleSeat(option.label)}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-left text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20'
                  }`}
                >
                  <span aria-hidden="true" className="mr-1.5 shrink-0 opacity-80">{SEAT_ICONS[option.category]}</span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <MateRecentSearchesPanel
          onTermClick={onSearchTermSelect}
          onTermSelect={onPopularTermSelect}
        />
        <MatePopularSearchesPanel
          onTermClick={onSearchTermSelect}
          onTermSelect={onPopularTermSelect}
        />
      </div>
    </PlainDialog>
  );
}
