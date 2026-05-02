import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PredictionMatchesErrorView from './PredictionMatchesErrorView';

test('PredictionMatchesErrorView는 수동 야구 데이터 요청 코드를 네트워크 오류와 구분해 표시한다', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchesErrorView, {
    matchesLoadErrorMessage: '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.',
    matchesLoadErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    predictionRecoveryPath: '/prediction',
    onReloadMatches: () => {},
  }));

  assert.match(html, /야구 데이터 준비가 필요합니다/);
  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /예측 경기 데이터를 불러오지 못했습니다/);
});
