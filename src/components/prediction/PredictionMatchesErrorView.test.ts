import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PredictionMatchesErrorView from './PredictionMatchesErrorView';

test('PredictionMatchesErrorView는 수동 데이터 empty state를 사용자 문구와 CTA로 표시한다', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchesErrorView, {
    matchesLoadErrorMessage: 'MANUAL_BASEBALL_DATA_REQUIRED: 야구 데이터 준비가 필요합니다.',
    matchesLoadErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    predictionRecoveryPath: '/prediction',
    onReloadMatches: () => {},
  }));

  assert.match(html, /data-testid="prediction-empty-state"/);
  assert.match(html, /야구 데이터 준비가 필요합니다/);
  assert.match(html, /운영자가 데이터를 제공하면 다시 확인할 수 있습니다/);
  assert.match(html, /data-testid="prediction-empty-retry"/);
  assert.match(html, /목록 다시 불러오기/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /예측 경기 데이터를 불러오지 못했습니다/);
});
