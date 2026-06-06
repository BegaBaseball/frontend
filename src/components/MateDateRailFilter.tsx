import { getDayOfWeek } from '../utils/mate';
import { Button } from './ui/button';

interface MateDateRailFilterProps {
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

export default function MateDateRailFilter({
  dateItems,
  selectedDate,
  onDateSelect,
}: MateDateRailFilterProps) {
  return (
    <div role="group" aria-label="경기 날짜 필터" className="grid grid-cols-2 gap-2">
      <Button
        variant={selectedDate === null ? 'default' : 'outline'}
        aria-pressed={selectedDate === null}
        aria-label={`전체 날짜 필터${selectedDate === null ? ', 선택됨' : ''}`}
        onClick={() => onDateSelect(null)}
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
        const dateFilterLabel = `${dateButtonLabel} 날짜 필터${isSelected ? ', 선택됨' : ''}`;

        return (
          <button
            key={dateString}
            type="button"
            onClick={() => onDateSelect(date)}
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
}
