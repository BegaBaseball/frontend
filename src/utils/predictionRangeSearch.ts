import type { DateGames } from '../types/prediction';

export const findAdjacentLoadedDateIndex = (
  allDatesData: DateGames[],
  anchorDate: string,
  direction: 'past' | 'future'
): number => {
  if (direction === 'future') {
    return allDatesData.findIndex((entry) => entry.date > anchorDate);
  }

  for (let index = allDatesData.length - 1; index >= 0; index -= 1) {
    if (allDatesData[index].date < anchorDate) {
      return index;
    }
  }

  return -1;
};

