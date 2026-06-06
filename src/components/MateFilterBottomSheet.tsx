import { resolveMateSeatFilterOptions } from '../utils/mateSeatFilterOptions';
import { SEAT_ICONS } from '../utils/seatIcons';
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
      className="max-h-[82vh] max-w-2xl rounded-b-none rounded-t-3xl border-none"
      bodyClassName="max-h-[calc(82vh-132px)] overflow-y-auto px-5 pb-5 pt-4"
      footer={(
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="touch"
            className="w-full rounded-xl focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-[#16181c]"
            disabled={activeFilterCount === 0}
            onClick={onResetFilters}
          >
            초기화
          </Button>
          <Button
            size="touch"
            className="w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#16181c]"
            onClick={onClose}
          >
            적용
          </Button>
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3">
          <p className="text-[15px] font-black text-primary">
            {activeFilterCount > 0 ? `${activeFilterCount}개 조건 적용 중` : '적용된 조건 없음'}
          </p>
          <p className="mt-1 text-sm font-bold text-gray-600 dark:text-zinc-300">
            팀, 좌석, 날짜, 상태 조건을 한 번에 초기화할 수 있습니다.
          </p>
        </div>

        <section className="space-y-2">
          <p className="text-sm font-black text-gray-900 dark:text-zinc-100">팀 필터</p>
          {favoriteTeamId ? (
            <button
              type="button"
              aria-pressed={myTeamOnly}
              onClick={() => onMyTeamOnlyChange(!myTeamOnly)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#16181c] ${
                myTeamOnly
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200'
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <TeamLogo teamId={favoriteTeamId} size={28} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[16px] font-black">내 팀 경기만</span>
                  <span className="block text-sm font-bold text-gray-500 dark:text-zinc-400">
                    관심 구단 경기로 목록을 좁힙니다.
                  </span>
                </span>
              </span>
              <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${myTeamOnly ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-600'}`} />
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              관심 구단을 설정하면 내 팀 경기만 볼 수 있습니다.
            </div>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-sm font-black text-gray-900 dark:text-zinc-100">좌석 필터</p>
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {seatOptions.map((option) => {
              const isActive = inputValue.includes(option.label);

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggleSeat(option.label)}
                  className={`flex min-h-[52px] items-center rounded-2xl border px-3 py-2 text-left text-[15px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#16181c] ${
                    isActive
                      ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20'
                  }`}
                >
                  <span aria-hidden="true" className="mr-1.5 shrink-0 opacity-80">{SEAT_ICONS[option.category]}</span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </PlainDialog>
  );
}
