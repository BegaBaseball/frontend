const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const match = DATE_KEY_PATTERN.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  return new Date(value);
};

export const getLocalTodayKey = (now: Date = new Date()): string => formatDateKey(now);

export const isSameLocalDateKey = (
  dateValue: string | Date,
  now: Date = new Date(),
): boolean => formatDateKey(parseLocalDate(dateValue)) === getLocalTodayKey(now);

export const getDayDifference = (
  targetDateValue: string | Date,
  baseDateValue: string | Date = new Date(),
): number => {
  const target = parseLocalDate(targetDateValue);
  const base = parseLocalDate(baseDateValue);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  return Math.round((targetDay.getTime() - baseDay.getTime()) / 86_400_000);
};

export const getNextLocalMidnightDelayMs = (now: Date = new Date()): number => {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  return Math.max(1_000, nextMidnight.getTime() - now.getTime());
};
