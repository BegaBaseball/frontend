import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const dialogRuntimeSource = readSource('./CoachAnalysisDialogRuntime.tsx');
const autoRuntimeSource = readSource('./CoachBriefingAutoRuntime.tsx');

test('CoachAnalysisDialogRuntime maps shared rate-limit message and retry timing to the result boundary', () => {
  assert.match(dialogRuntimeSource, /resolveRateLimitErrorDetails/);
  assert.match(dialogRuntimeSource, /rateLimitError\.message/);
  assert.match(dialogRuntimeSource, /rateLimitError\.retryAfterSeconds/);
});

test('CoachBriefingAutoRuntime maps shared rate-limit message and retry timing to the briefing boundary', () => {
  assert.match(autoRuntimeSource, /resolveRateLimitErrorDetails/);
  assert.match(autoRuntimeSource, /rateLimitError\.message/);
  assert.match(autoRuntimeSource, /rateLimitError\.retryAfterSeconds/);
});
