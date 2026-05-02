import { getDayOfWeek } from '../utils/mate';
import { Button } from './ui/button';

interface MateMobileDateFilterProps {
  dateItems: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
}

const FILTER_ACTIVE_CLASS = 'border-transparent bg-primary text-primary-foreground shadow-sm dark:bg-primary dark:text-primary-foreground';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary';
const FILTER_SURFACE_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20';

const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return [year, month, day].join('-');
};

export default function MateMobileDateFilter({
  dateItems,
  selectedDate,
  onDateSelect,
}: MateMobileDateFilterProps) {
  const selectedDateLabel = selectedDate
    ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 ${getDayOfWeek(toDateString(selectedDate))}`
    : '전체 날짜';

  return (
    <section className="mb-4 xl:hidden" aria-labelledby="mate-mobile-date-filter-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2
          id="mate-mobile-date-filter-heading"
          className="text-[13px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-500"
        >
          경기 날짜
        </h2>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-bold text-primary">
          {selectedDateLabel}
        </span>
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-gray-50 to-transparent dark:from-[#0a0a0a]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-gray-50 to-transparent dark:from-[#0a0a0a]" />
        <div
          tabIndex={0}
          aria-label="경기 날짜 빠른 선택, 좌우로 스크롤"
          className="overflow-x-auto px-4 pb-2 scrollbar-hide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#0a0a0a] sm:px-0"
        >
          <div
            role="group"
            aria-label="경기 날짜 필터"
            className="flex min-w-max snap-x snap-mandatory items-center gap-2 scroll-px-4"
          >
            <Button
              variant={selectedDate === null ? 'default' : 'outline'}
              aria-pressed={selectedDate === null}
              aria-label={`전체 날짜 필터${selectedDate === null ? ', 선택됨' : ''}`}
              onClick={() => onDateSelect(null)}
              className={`h-12 min-w-[72px] snap-start rounded-xl px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#0a0a0a] ${
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

              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => onDateSelect(date)}
                  aria-label={`${dateButtonLabel} 필터${isSelected ? ', 선택됨' : ''}`}
                  aria-pressed={Boolean(isSelected)}
                  className={`flex h-12 min-w-[68px] snap-start flex-col items-center justify-center rounded-xl border px-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#0a0a0a] ${
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
        </div>
      </div>
    </section>
  );
}
