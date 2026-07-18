import { resolveRateLimitErrorDetails } from '../api/aiStreamError';

export interface CoachAnalysisDialogRateLimitResult {
  error: string;
}

export interface CoachBriefingRateLimitFallback {
  message: string;
  retryAfterSeconds: number;
  neutralMeta: true;
}

const formatCoachRateLimitMessage = (message: string, retryAfterSeconds: number): string => (
  `${message} ${retryAfterSeconds}초 후 다시 시도해주세요.`
);

export const resolveCoachAnalysisDialogRateLimitResult = (
  error: unknown,
): CoachAnalysisDialogRateLimitResult | null => {
  const details = resolveRateLimitErrorDetails(error);
  if (!details) return null;

  return {
    error: formatCoachRateLimitMessage(details.message, details.retryAfterSeconds),
  };
};

export const resolveCoachBriefingRateLimitFallback = (
  error: unknown,
): CoachBriefingRateLimitFallback | null => {
  const details = resolveRateLimitErrorDetails(error);
  if (!details) return null;

  return {
    message: formatCoachRateLimitMessage(details.message, details.retryAfterSeconds),
    retryAfterSeconds: details.retryAfterSeconds,
    neutralMeta: true,
  };
};
