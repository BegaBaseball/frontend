import assert from 'node:assert/strict';
import test from 'node:test';

import { RateLimitError } from '../api/aiStreamError';
import {
  resolveCoachAnalysisDialogRateLimitResult,
  resolveCoachBriefingRateLimitFallback,
} from './coachRateLimitPresentation';

const rateLimitError = new RateLimitError({
  code: 'AI_RATE_LIMITED',
  message: '요청이 많아 잠시 후 다시 시도해주세요.',
  detail: null,
  retryable: true,
  retryAfterSeconds: 23,
  supportedVersions: [],
});

test('CoachAnalysisDialogRuntime adapter returns the exact rate-limit result', () => {
  assert.deepEqual(resolveCoachAnalysisDialogRateLimitResult(rateLimitError), {
    error: '요청이 많아 잠시 후 다시 시도해주세요. 23초 후 다시 시도해주세요.',
  });
  assert.equal(resolveCoachAnalysisDialogRateLimitResult(new Error('not rate limited')), null);
});

test('CoachBriefingAutoRuntime adapter returns the exact rate-limit fallback and timing', () => {
  assert.deepEqual(resolveCoachBriefingRateLimitFallback(rateLimitError), {
    message: '요청이 많아 잠시 후 다시 시도해주세요. 23초 후 다시 시도해주세요.',
    retryAfterSeconds: 23,
    neutralMeta: true,
  });
  assert.equal(resolveCoachBriefingRateLimitFallback(new Error('not rate limited')), null);
});
