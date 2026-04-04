export type PredictionRangeDirection = 'current' | 'past' | 'future';

export interface PredictionRangeWindowInput {
  anchorDate: string;
  direction: PredictionRangeDirection;
  windowDays: number;
}

export interface PredictionRangeWindow extends PredictionRangeWindowInput {
  startDate: string;
  endDate: string;
}

const shiftDate = (dateString: string, offsetDays: number): string => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildPredictionRangeWindow = ({
  anchorDate,
  direction,
  windowDays,
}: PredictionRangeWindowInput): PredictionRangeWindow => {
  const normalizedWindowDays = Math.max(1, windowDays);

  if (direction === 'current') {
    return {
      anchorDate,
      direction,
      windowDays: normalizedWindowDays,
      startDate: anchorDate,
      endDate: anchorDate,
    };
  }

  if (direction === 'future') {
    const startDate = shiftDate(anchorDate, 1);
    return {
      anchorDate,
      direction,
      windowDays: normalizedWindowDays,
      startDate,
      endDate: shiftDate(startDate, normalizedWindowDays - 1),
    };
  }

  const endDate = shiftDate(anchorDate, -1);
  return {
    anchorDate,
    direction,
    windowDays: normalizedWindowDays,
    startDate: shiftDate(endDate, -(normalizedWindowDays - 1)),
    endDate,
  };
};

export const getNextPredictionRangeAnchor = (
  window: Pick<PredictionRangeWindow, 'startDate' | 'endDate'>,
  direction: 'past' | 'future'
) => (direction === 'future' ? window.endDate : window.startDate);

