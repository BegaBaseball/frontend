import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readHookSource = () => readFileSync(
  new URL('./usePredictionGameData.ts', import.meta.url),
  'utf-8'
);

test('usePredictionGameData는 live polling 시작을 post-paint idle work로 지연한다', () => {
  const source = readHookSource();

  assert.match(
    source,
    /import \{ schedulePredictionPostPaintIdleWork \} from '\.\.\/utils\/predictionDeferredWork';/
  );
  assert.match(source, /let started = false;/);
  assert.match(source, /let intervalId: number \| null = null;/);
  assert.match(source, /const startPolling = \(\) => \{[\s\S]*started = true;[\s\S]*tick\(\);[\s\S]*window\.setInterval\(tick, LIVE_GAME_POLL_INTERVAL_MS\);[\s\S]*\};/);
  assert.match(source, /const cancelDeferredStart = schedulePredictionPostPaintIdleWork\(startPolling\);/);
  assert.match(source, /if \(started\) \{\n        tick\(\);\n      \}/);
  assert.match(source, /cancelDeferredStart\(\);/);
  assert.match(source, /if \(intervalId !== null\) \{\n        window\.clearInterval\(intervalId\);\n      \}/);
});

test('usePredictionGameData는 detail과 vote 상태 priming helper를 노출한다', () => {
  const source = readHookSource();

  assert.match(source, /options: \{ isSeeded\?: boolean \} = \{\}/);
  assert.match(source, /isSeeded: options\.isSeeded \?\? true,/);
  assert.match(source, /const primeGameDetailError = useCallback/);
  assert.match(source, /const primeVoteStatus = useCallback/);
  assert.match(source, /const primeVoteStatusError = useCallback/);
  assert.match(source, /primeGameDetailError,\n    primeVoteStatus,\n    primeVoteStatusError,/);
});
