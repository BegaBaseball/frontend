import {
  formatDateKey,
  getDayDifference,
  parseLocalDate,
} from './currentDate';

const FAR_FUTURE_DAY_THRESHOLD = 365;
const ONE_DAY_MS = 86_400_000;

export const getMateDDayLabel = (
  gameDate: string | Date | null | undefined,
  now: string | Date = new Date(),
): string => {
  if (!gameDate) {
    return '';
  }

  const dayDifference = getDayDifference(gameDate, now);

  if (dayDifference < 0) {
    return '';
  }

  if (dayDifference === 0) {
    return 'D-Day';
  }

  if (dayDifference > FAR_FUTURE_DAY_THRESHOLD) {
    return '예정';
  }

  return `D-${dayDifference}`;
};

export const getMateMinGameDate = (now: Date = new Date()): string => formatDateKey(now);

export const isMateGameSoon = (
  gameDate: string | Date | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!gameDate) {
    return false;
  }

  const gameTime = parseLocalDate(gameDate).getTime();
  const nowTime = now.getTime();
  const diffMs = gameTime - nowTime;

  return diffMs >= 0 && diffMs <= ONE_DAY_MS;
};
