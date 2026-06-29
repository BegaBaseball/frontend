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

test('usePredictionGameData는 relay 수동 데이터 오류가 score polling suppression으로 전파되지 않게 분리한다', () => {
  const source = readHookSource();
  const relayStart = source.indexOf('const loadLiveRelaySnapshot = useCallback');
  const relayEnd = source.indexOf('const loadVoteStatus = useCallback', relayStart);

  assert.ok(relayStart >= 0);
  assert.ok(relayEnd > relayStart);

  const relayBlock = source.slice(relayStart, relayEnd);
  assert.match(relayBlock, /suppressLiveRelayPollingForManualData/);
  assert.doesNotMatch(relayBlock, /suppressLiveScorePollingForManualData/);
});

test('usePredictionGameData는 score 수동 데이터 오류 후에도 live polling을 계속한다', () => {
  const source = readHookSource();
  const scoreStart = source.indexOf('const loadLiveSnapshot = useCallback');
  const scoreEnd = source.indexOf('const loadLiveRelaySnapshot = useCallback', scoreStart);

  assert.ok(scoreStart >= 0);
  assert.ok(scoreEnd > scoreStart);

  const scoreBlock = source.slice(scoreStart, scoreEnd);
  assert.match(scoreBlock, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(source, /liveScoreManualDataSuppressedRef/);
  assert.doesNotMatch(source, /isLiveScorePollingSuppressed/);
  assert.doesNotMatch(source, /suppressLiveScorePollingForManualData/);
  assert.doesNotMatch(scoreBlock, /shouldContinuePolling = false/);
});

test('usePredictionGameData는 첫 상세 커밋 전에 live snapshot을 합친다', () => {
  const source = readHookSource();
  const detailStart = source.indexOf('const loadGameDetail = useCallback');
  const detailEnd = source.indexOf('const loadLiveSnapshot = useCallback', detailStart);

  assert.ok(detailStart >= 0);
  assert.ok(detailEnd > detailStart);

  const detailBlock = source.slice(detailStart, detailEnd);
  assert.match(detailBlock, /let detailForCommit = detail;/);
  assert.match(detailBlock, /shouldStartPredictionLivePolling\(fallbackGame, detail, true\)/);
  assert.match(detailBlock, /const snapshot = await fetchGameLiveSnapshot\(gameId, \{/);
  assert.match(detailBlock, /detailForCommit = mergeGameDetailWithLiveSnapshot\(detail, snapshot, fallbackGame\);/);
  assert.match(detailBlock, /data: detailForCommit,/);
});

test('usePredictionGameData는 상세 로딩 toast lifecycle을 단일 id로 관리한다', () => {
  const source = readHookSource();

  assert.match(source, /const PREDICTION_DETAIL_LOADING_TOAST_ID = 'prediction-detail-loading';/);
  assert.match(source, /const PREDICTION_DETAIL_LOADING_TOAST_DELAY_MS = 300;/);
  assert.match(source, /toast\.loading\('경기 상세 정보를 불러오는 중입니다\.', \{[\s\S]*id: PREDICTION_DETAIL_LOADING_TOAST_ID,[\s\S]*duration: Number\.POSITIVE_INFINITY,[\s\S]*\}\);/);
  assert.match(source, /window\.setTimeout\([\s\S]*PREDICTION_DETAIL_LOADING_TOAST_DELAY_MS[\s\S]*\);/);
  assert.match(source, /if \(!backgroundRefresh\) \{[\s\S]*schedulePredictionDetailLoadingToast\(\);[\s\S]*\}/);
  assert.match(source, /dismissPredictionDetailLoadingToast\(\);[\s\S]*setGameDetails\(\(prev\) => \(\{/);
  assert.match(source, /toast\.error\(parsedError\.message \|\| '경기 상세를 불러오지 못했습니다\.', \{[\s\S]*id: PREDICTION_DETAIL_LOADING_TOAST_ID,[\s\S]*\}\);/);
});
