import type { GameStatusCode } from './predictionStatus';

interface PredictionResultLabelInput {
  statusCode: GameStatusCode;
  awayScore?: number | null;
  homeScore?: number | null;
  awayTeamName: string;
  homeTeamName: string;
}

export const resolvePredictionResultLabel = ({
  statusCode,
  awayScore,
  homeScore,
  awayTeamName,
  homeTeamName,
}: PredictionResultLabelInput): string => {
  if (awayScore == null || homeScore == null) {
    return '';
  }

  if (statusCode !== 'COMPLETED' && statusCode !== 'DRAW') {
    return '';
  }

  if (awayScore === homeScore) {
    return '무승부';
  }

  return awayScore > homeScore ? `${awayTeamName} 승` : `${homeTeamName} 승`;
};
