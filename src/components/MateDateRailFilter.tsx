import { useState } from 'react';

import { getDayOfWeek } from '../utils/mate';

interface MateDateRailFilterProps {
  dateItems: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
}

const FILTER_ACTIVE_CLASS = 'border-primary bg-primary text-primary-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary';

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
  const [showAllDates, setShowAllDates] = useState(false);
  const visibleDates = showAllDates ? dateItems : dateItems.slice(0, 8);
  const hiddenDateCount = Math.max(0, dateItems.length - visibleDates.length);

  return (
    <div role="group" aria-label="경기 날짜 필터">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-pressed={selectedDate === null}
          aria-label={`전체 날짜 필터${selectedDate === null ? ', 선택됨' : ''}`}
          onClick={() => onDateSelect(null)}
          className={`col-span-2 h-[42px] rounded-[10px] border px-3 text-[13px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
            selectedDate === null
              ? FILTER_ACTIVE_CLASS
              : FILTER_IDLE_CLASS
          }`}
        >
          전체 {dateItems.length}일
        </button>
        {visibleDates.map((date, idx) => {
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
              className={`flex h-[42px] items-center justify-between rounded-[10px] border px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
                isSelected
                  ? FILTER_ACTIVE_CLASS
                  : FILTER_IDLE_CLASS
              }`}
            >
              <span className={`text-[11px] font-bold leading-4 ${
                isSelected
                  ? 'text-primary-foreground'
                  : isWeekend
                    ? 'text-primary/80'
                    : 'text-gray-600 dark:text-white'
              }`}
              >
                {quickLabel}
              </span>
              <span className={`text-[13px] font-black leading-5 ${
                isSelected ? 'text-primary-foreground' : 'text-gray-800 dark:text-white'
              }`}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
      {hiddenDateCount > 0 || showAllDates ? (
        <button
          type="button"
          onClick={() => setShowAllDates((current) => !current)}
          className="mt-2 w-full py-1.5 text-[11px] font-bold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000]"
        >
          {showAllDates ? '접기' : `+ ${hiddenDateCount}일 더 보기`}
        </button>
      ) : null}
    </div>
  );
}
