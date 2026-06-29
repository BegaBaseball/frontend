import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PredictionScoreboardSection from './PredictionScoreboardSection';

const baseProps = {
  headingTextStyle: {},
  awayTeamNameStyle: {},
  homeTeamNameStyle: {},
  liveStatusError: null,
  liveStatusErrorCode: null,
  isManualLiveStatusError: false,
  shouldShowManualScoreboardState: false,
  inningRows: {
    1: { away: 1, home: 0 },
    2: { away: 0, home: 2 },
  },
  awayTeamName: 'LG',
  homeTeamName: 'KT',
  awayScoreForDisplay: 1,
  homeScoreForDisplay: 2,
};

test('PredictionScoreboardSection renders inning rows and totals', () => {
  const html = renderToStaticMarkup(createElement(PredictionScoreboardSection, baseProps));

  assert.match(html, /data-testid="prediction-scoreboard"/);
  assert.match(html, /data-testid="prediction-scoreboard-cell-away-1"/);
  assert.match(html, /data-testid="prediction-scoreboard-cell-home-2"/);
  assert.match(html, /data-testid="prediction-scoreboard-total-away"/);
  assert.match(html, /data-testid="prediction-scoreboard-total-home"/);
  assert.match(html, />LG</);
  assert.match(html, />KT</);
});

test('PredictionScoreboardSection surfaces manual live and scoreboard states', () => {
  const html = renderToStaticMarkup(createElement(PredictionScoreboardSection, {
    ...baseProps,
    liveStatusError: 'manual data required',
    liveStatusErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    isManualLiveStatusError: true,
    shouldShowManualScoreboardState: true,
  }));

  assert.match(html, /data-testid="prediction-scoreboard-live-status-warning"/);
  assert.match(html, /data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"/);
  assert.match(html, /data-testid="prediction-scoreboard-manual-required"/);
  assert.match(html, /스코어보드 상세 입력 대기/);
  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});
