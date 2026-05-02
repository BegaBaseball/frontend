import type { GameSummary } from '../types/prediction';

const HIDDEN_PREDICTION_SUMMARY_TYPES = new Set(['리뷰_WPA', '프리뷰']);

const hasText = (value?: string | null): boolean => Boolean(value?.trim());

export const isHiddenPredictionSummaryType = (type?: string | null): boolean => {
  const normalizedType = type?.trim();
  return Boolean(normalizedType && HIDDEN_PREDICTION_SUMMARY_TYPES.has(normalizedType));
};

export const isJsonObjectOrArrayString = (value?: string | null): boolean => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return false;
  }

  const startsAsObject = trimmedValue.startsWith('{') && trimmedValue.endsWith('}');
  const startsAsArray = trimmedValue.startsWith('[') && trimmedValue.endsWith(']');
  if (!startsAsObject && !startsAsArray) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmedValue);
    return parsed !== null && (Array.isArray(parsed) || typeof parsed === 'object');
  } catch {
    return false;
  }
};

export const isDisplayableGameSummary = (summary: GameSummary): boolean => (
  hasText(summary.type)
  && !isHiddenPredictionSummaryType(summary.type)
  && !isJsonObjectOrArrayString(summary.detail)
  && (hasText(summary.playerName) || hasText(summary.detail))
);

export const filterDisplayableGameSummaries = (
  summaries?: GameSummary[] | null,
): GameSummary[] => (summaries || []).filter(isDisplayableGameSummary);
