export const formatScheduleDateKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

export const formatScheduleMonthKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
);

export const getScheduleMonthStartKey = (cursor: Date): string => (
  `${formatScheduleMonthKey(cursor)}-01`
);

export const isScheduleDateKeyInMonth = (dateKey: string | null | undefined, cursor: Date): boolean => (
  typeof dateKey === 'string' && dateKey.startsWith(formatScheduleMonthKey(cursor))
);

export const buildScheduleMonthDates = (cursor: Date): Date[] => {
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => (
    new Date(cursor.getFullYear(), cursor.getMonth(), index + 1)
  ));
};

export interface ResolveScheduleInitialSelectedDateOptions {
  cursor: Date;
  todayKey: string;
  gameDateKeys?: Iterable<string | null | undefined>;
}

export const resolveScheduleInitialSelectedDate = ({
  cursor,
  todayKey,
  gameDateKeys = [],
}: ResolveScheduleInitialSelectedDateOptions): string => {
  if (isScheduleDateKeyInMonth(todayKey, cursor)) {
    return todayKey;
  }

  const firstGameDate = Array.from(new Set(gameDateKeys))
    .filter((dateKey): dateKey is string => isScheduleDateKeyInMonth(dateKey, cursor))
    .sort()[0];

  return firstGameDate ?? getScheduleMonthStartKey(cursor);
};
