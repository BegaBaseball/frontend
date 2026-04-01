"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";

type CalendarProps = {
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    caption_label?: string;
    nav?: string;
    nav_button?: string;
    nav_button_previous?: string;
    nav_button_next?: string;
    table?: string;
    head_row?: string;
    head_cell?: string;
    row?: string;
    cell?: string;
    day?: string;
    day_selected?: string;
    day_today?: string;
    day_outside?: string;
    day_disabled?: string;
    day_hidden?: string;
  };
  showOutsideDays?: boolean;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: (date: Date) => boolean;
};

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const isSameDay = (left?: Date, right?: Date) => {
  if (!left || !right) {
    return false;
  }

  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const getMonthGrid = (currentMonth: Date, showOutsideDays: boolean) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const weeks: Date[][] = [];
  let cursor = 1 - firstWeekday;

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: Date[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      let date: Date;

      if (cursor < 1) {
        date = new Date(year, month - 1, daysInPreviousMonth + cursor);
      } else if (cursor > daysInMonth) {
        date = new Date(year, month + 1, cursor - daysInMonth);
      } else {
        date = new Date(year, month, cursor);
      }

      week.push(date);
      cursor += 1;
    }

    if (
      !showOutsideDays
      && week.every((date) => date.getMonth() !== month)
    ) {
      continue;
    }

    weeks.push(week);
  }

  return weeks;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  month,
  onMonthChange,
  disabled,
}: CalendarProps) {
  const initialMonth = React.useMemo(
    () => startOfDay(month ?? selected ?? new Date()),
    [month, selected],
  );
  const [internalMonth, setInternalMonth] = React.useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );

  React.useEffect(() => {
    const nextMonth = new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
    if (nextMonth.getTime() !== internalMonth.getTime()) {
      setInternalMonth(nextMonth);
    }
  }, [initialMonth, internalMonth]);

  const weeks = React.useMemo(
    () => getMonthGrid(internalMonth, showOutsideDays),
    [internalMonth, showOutsideDays],
  );
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const updateMonth = (offset: number) => {
    const nextMonth = new Date(
      internalMonth.getFullYear(),
      internalMonth.getMonth() + offset,
      1,
    );
    setInternalMonth(nextMonth);
    onMonthChange?.(nextMonth);
  };

  return (
    <div className={cn("p-3", className)}>
      <div className={cn("flex flex-col gap-4", classNames?.month)}>
        <div className={cn("flex justify-center pt-1 relative items-center w-full", classNames?.caption)}>
          <button
            type="button"
            onClick={() => updateMonth(-1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
              classNames?.nav_button,
              classNames?.nav_button_previous,
            )}
            aria-label="이전 달"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className={cn("text-sm font-medium", classNames?.caption_label)}>
            {internalMonth.getFullYear()}년 {internalMonth.getMonth() + 1}월
          </div>
          <button
            type="button"
            onClick={() => updateMonth(1)}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
              classNames?.nav_button,
              classNames?.nav_button_next,
            )}
            aria-label="다음 달"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className={cn("w-full border-collapse space-y-1", classNames?.table)}>
          <div className={cn("grid grid-cols-7", classNames?.head_row)}>
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className={cn(
                  "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center mx-auto",
                  classNames?.head_cell,
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={`${internalMonth.toISOString()}-${weekIndex}`} className={cn("grid grid-cols-7 mt-2", classNames?.row)}>
              {week.map((date) => {
                const isOutside = date.getMonth() !== internalMonth.getMonth();
                const isSelected = isSameDay(selected, date);
                const isToday = isSameDay(today, date);
                const isDisabled = disabled?.(date) ?? false;

                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "relative p-0 text-center text-sm",
                      classNames?.cell,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDisabled) {
                          onSelect?.(date);
                        }
                      }}
                      disabled={isDisabled}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "size-8 p-0 font-normal mx-auto",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        isToday && !isSelected && "bg-accent text-accent-foreground",
                        isOutside && "text-muted-foreground",
                        isDisabled && "text-muted-foreground opacity-50",
                        classNames?.day,
                        isSelected && classNames?.day_selected,
                        isToday && classNames?.day_today,
                        isOutside && classNames?.day_outside,
                        isDisabled && classNames?.day_disabled,
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Calendar };
