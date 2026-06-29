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

const parseScheduleDateKey = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const match = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/.exec(value.trim());
  if (!match?.groups) {
    return null;
  }

  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year
    || parsedDate.getMonth() !== month - 1
    || parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
};

export const normalizeScheduleDateKey = (value: string | null | undefined): string | null => {
  const parsedDate = parseScheduleDateKey(value);
  return parsedDate ? formatScheduleDateKey(parsedDate) : null;
};

export const resolveScheduleInitialCursor = (
  searchParams: URLSearchParams,
  fallbackDate: Date = new Date(),
): Date => {
  const queryDate = parseScheduleDateKey(searchParams.get('date'));
  const base = queryDate ?? fallbackDate;

  return new Date(base.getFullYear(), base.getMonth(), 1);
};

export interface ResolveScheduleInitialSelectedDateOptions {
  cursor: Date;
  todayKey: string;
  requestedDateKey?: string | null;
  gameDateKeys?: Iterable<string | null | undefined>;
}

export const resolveScheduleInitialSelectedDate = ({
  cursor,
  todayKey,
  requestedDateKey,
  gameDateKeys = [],
}: ResolveScheduleInitialSelectedDateOptions): string => {
  const normalizedRequestedDateKey = normalizeScheduleDateKey(requestedDateKey);
  if (normalizedRequestedDateKey && isScheduleDateKeyInMonth(normalizedRequestedDateKey, cursor)) {
    return normalizedRequestedDateKey;
  }

  if (isScheduleDateKeyInMonth(todayKey, cursor)) {
    return todayKey;
  }

  const firstGameDate = Array.from(new Set(gameDateKeys))
    .filter((dateKey): dateKey is string => isScheduleDateKeyInMonth(dateKey, cursor))
    .sort()[0];

  return firstGameDate ?? getScheduleMonthStartKey(cursor);
};
