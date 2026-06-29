import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildPredictionScheduleRowViewModel } from '../../utils/predictionSchedulePreviewModel';
import type { Game } from '../../types/prediction';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const readyViewSource = readSource('./PredictionMatchScheduleReadyView.tsx');
const dataContentSource = readSource('./PredictionMatchScheduleDataContent.tsx');
const matchTabSource = readSource('./PredictionMatchTab.tsx');
const interactiveDataSource = readSource('../../hooks/usePredictionInteractiveData.ts');
const scheduleHookSource = readSource('../../hooks/usePredictionSchedule.ts');
const deepLinkSource = readSource('../../utils/predictionDeepLink.ts');
const appRoutesSource = readSource('../AppRoutes.tsx');
const previewSource = readSource('./PredictionMatchPreviewTab.tsx');

test('PredictionMatchScheduleReadyView는 gameId 없는 prediction 진입에서 날짜별 목록 런타임을 렌더링한다', () => {
  assert.match(readyViewSource, /PredictionMatchSchedulePreviewRuntime/);
  assert.match(readyViewSource, /shouldRenderPreview\s*=\s*!deepLinkGameId/);
  assert.match(readyViewSource, /handlePreviewGoToDate/);
  assert.match(readyViewSource, /onEnterMatchDetail=\{handleEnterMatchDetail\}/);
  assert.match(readyViewSource, /InteractiveRuntimeComponent/);
});

test('PredictionMatchScheduleReadyView는 gameId 없는 prediction 진입을 자동 상세 URL로 replace하지 않는다', () => {
  assert.doesNotMatch(readyViewSource, /defaultDetailGame/);
  assert.doesNotMatch(readyViewSource, /nextSearchParams\.set\('gameId',\s*defaultDetailGameId\)/);
});

test('PredictionMatchScheduleReadyView는 목록에서 전력 상세 진입 시 origin state를 남긴다', () => {
  assert.match(readyViewSource, /handleEnterMatchDetail/);
  assert.match(readyViewSource, /fromPredictionList:\s*true/);
  assert.match(readyViewSource, /predictionListPath/);
  assert.match(readyViewSource, /predictionDetailPath/);
  assert.match(readyViewSource, /setSearchParams\(nextSearchParams,\s*\{\s*state:/);
});

test('Prediction route-aware search params는 navigation state를 React Router navigate에 전달한다', () => {
  assert.match(deepLinkSource, /type PredictionNavigationOptions = \{[\s\S]*replace\?: boolean;[\s\S]*state\?: unknown;[\s\S]*\}/);
  assert.match(dataContentSource, /navigateOptions\?: PredictionNavigationOptions/);
  assert.match(dataContentSource, /state:\s*navigateOptions\?\.state/);
});

test('Prediction 상세 nav는 legacy 목록 버튼을 노출하지 않는다', () => {
  assert.doesNotMatch(matchTabSource, /prediction-detail-nav/);
  assert.doesNotMatch(matchTabSource, /prediction-detail-nav-leaderboard/);
  assert.doesNotMatch(matchTabSource, /prediction-detail-nav-schedule/);
  assert.doesNotMatch(matchTabSource, /prediction-detail-nav-list/);
  assert.doesNotMatch(matchTabSource, /onExitDetail/);
  assert.doesNotMatch(interactiveDataSource, /exitMatchDetail/);
  assert.doesNotMatch(readyViewSource, /suppressPredictionAutoDetail/);
  assert.match(interactiveDataSource, /fromPredictionList/);
});

test('PredictionMatchTab은 legacy 같은 날짜 경기 전환 칩을 렌더링하지 않는다', () => {
  assert.doesNotMatch(matchTabSource, /prediction-same-day-switcher/);
  assert.doesNotMatch(matchTabSource, /prediction-detail-game-switch/);
});

test('구형 일정 캘린더 route는 AppRoutes에서 노출하지 않는다', () => {
  assert.doesNotMatch(appRoutesSource, /SchedulePage/);
  assert.doesNotMatch(appRoutesSource, /path="\/schedule"/);
});

test('Prediction schedule row model marks the completed winning side for logo emphasis', () => {
  const game: Game = {
    gameId: '20990501LGKT0',
    gameDate: '2099-05-01',
    awayTeam: 'LG',
    homeTeam: 'KT',
    stadium: '수원',
    startTime: '18:30',
    gameStatus: 'COMPLETED',
    awayScore: 7,
    homeScore: 4,
    winner: 'away',
  };

  const row = buildPredictionScheduleRowViewModel(game, '2099-05-01', new Date('2099-05-01T21:30:00'));

  assert.equal(row.winnerSide, 'away');
});

test('Prediction schedule row model exposes normalized scheduled AI win probability', () => {
  const game: Game = {
    gameId: '20990502LGKT0',
    gameDate: '2099-05-02',
    awayTeam: 'LG',
    homeTeam: 'KT',
    stadium: '수원',
    startTime: '18:30',
    gameStatus: 'SCHEDULED',
    awayScore: null,
    homeScore: null,
    winner: null,
    winProbability: {
      home: 42,
      away: 58,
    },
  };

  const row = buildPredictionScheduleRowViewModel(game, '2099-05-02', new Date('2099-05-02T10:00:00'));

  assert.deepEqual(row.winProbability, {
    homePct: 42,
    awayPct: 58,
    favoredSide: 'away',
    favoredPct: 58,
    diffPct: 16,
  });
});

test('Prediction schedule row model marks live summary status as in progress', () => {
  const game: Game = {
    gameId: '20990502LGKT0',
    gameDate: '2099-05-02',
    awayTeam: 'LG',
    homeTeam: 'KT',
    stadium: '수원',
    startTime: null,
    gameStatus: 'LIVE',
    awayScore: 1,
    homeScore: 2,
    winner: null,
  };

  const row = buildPredictionScheduleRowViewModel(game, '2099-05-02', new Date('2099-05-02T18:30:00'));

  assert.equal(row.status.code, 'LIVE');
  assert.equal(row.status.label, '진행중');
  assert.equal(row.status.tone, 'live');
  assert.equal(row.status.scoreLabel, '1 : 2');
});

test('Prediction schedule row model avoids scheduled label after first pitch time while live score is pending', () => {
  const game: Game = {
    gameId: '20990502LGKT0',
    gameDate: '2099-05-02',
    awayTeam: 'LG',
    homeTeam: 'KT',
    stadium: '수원',
    startTime: '17:00:00',
    gameStatus: 'SCHEDULED',
    awayScore: null,
    homeScore: null,
    winner: null,
  };

  const row = buildPredictionScheduleRowViewModel(game, '2099-05-02', new Date('2099-05-02T17:01:00'));

  assert.equal(row.status.code, 'LIVE');
  assert.equal(row.status.label, '실시간 확인중');
  assert.equal(row.status.tone, 'live');
  assert.equal(row.status.scoreLabel, null);
});

test('Prediction schedule preview recomputes time-sensitive status while the list stays open', () => {
  assert.match(previewSource, /import \{ useCurrentTime \} from '\.\.\/\.\.\/hooks\/useCurrentTime';/);
  assert.match(previewSource, /const currentTime = useCurrentTime\(60_000\);/);
  assert.match(
    previewSource,
    /buildPredictionScheduleRowViewModel\(game, currentDate, currentTime\)/
  );
  assert.match(previewSource, /\[currentDateGames, currentDate, currentTime\]/);
});

test('Prediction schedule list polls live summaries for visible games', () => {
  assert.match(scheduleHookSource, /fetchGameLiveSummaries/);
  assert.match(scheduleHookSource, /mergeLiveSummariesIntoVisibleDate/);
  assert.match(scheduleHookSource, /mergeHomeGamesWithLiveSummaries/);
  assert.match(scheduleHookSource, /shouldPollPredictionLiveGame/);
  assert.match(scheduleHookSource, /LIVE_GAME_POLL_INTERVAL_MS/);
  assert.match(scheduleHookSource, /scheduleLiveSummaryPollingKey/);
});

test('Prediction schedule initial load merges live summaries before state commit', () => {
  assert.match(scheduleHookSource, /mergeInitialLiveSummariesIntoDay/);
  assert.match(
    scheduleHookSource,
    /const liveMergedDayData = await mergeInitialLiveSummariesIntoDay\(result\.data, isStale\);[\s\S]*mergeDayIntoState\(liveMergedDayData,/
  );
  assert.match(
    scheduleHookSource,
    /const liveMergedSchedule = await mergeInitialLiveSummariesIntoDay\(result\.data\.schedule, isStale\);[\s\S]*mergeDayIntoState\(liveMergedSchedule,/
  );
});

test('PredictionMatchPreviewTab renders winner logo emphasis without schedule probability bars', () => {
  assert.match(previewSource, /data-testid="prediction-schedule-winning-logo"/);
  assert.match(previewSource, /renderScheduleTeamLogo/);
  assert.doesNotMatch(previewSource, /data-testid="prediction-schedule-ai-probability"/);
  assert.doesNotMatch(previewSource, /data-testid="prediction-schedule-ai-probability-missing"/);
  assert.doesNotMatch(previewSource, /renderSchedulePredictionProbability/);
  assert.doesNotMatch(previewSource, /AI 예측/);
});
