import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import CheerLiveEventSummary from './CheerLiveEventSummary';
import {
  BASEBALL_DATA_SYNC_PENDING_CODE,
  getBaseballScheduleErrorPresentation,
} from './cheer/CheerScheduleErrorPresentation';
import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
} from '../utils/errorUtils';

test('CheerLivePanel 오류 상태는 수동 데이터, 동기화 중, 일반 실패 문구를 구분한다', () => {
  assert.deepEqual(
    getBaseballScheduleErrorPresentation(MANUAL_BASEBALL_DATA_REQUIRED_CODE),
    {
      message: MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
      codeToken: MANUAL_BASEBALL_DATA_REQUIRED_CODE,
    },
  );
  assert.deepEqual(
    getBaseballScheduleErrorPresentation(BASEBALL_DATA_SYNC_PENDING_CODE),
    {
      message: '야구 데이터 동기화가 진행 중입니다.',
      codeToken: null,
    },
  );
  assert.deepEqual(
    getBaseballScheduleErrorPresentation('INTERNAL_SERVER_ERROR'),
    {
      message: '라이브 경기 정보를 불러오지 못했습니다.',
      codeToken: null,
    },
  );
});

test('CheerLiveEventSummary는 내부 라이브 스냅샷의 최신 이벤트를 표시한다', () => {
  const html = renderToStaticMarkup(
    <CheerLiveEventSummary
      snapshot={{
        gameId: '20260711NCLG0',
        gameStatus: 'PLAYING',
        awayScore: 3,
        homeScore: 5,
        currentInning: 6,
        currentInningHalf: 'BOTTOM',
        lastEventSeq: 9,
        lastUpdatedAt: '2026-07-11T10:00:00.000Z',
        inningScores: [],
        events: [
          {
            eventSeq: 9,
            inning: 6,
            inningHalf: 'BOTTOM',
            description: '2사 1, 2루에서 적시타가 나왔습니다.',
            resultCode: 'HIT',
            homeScore: 5,
            awayScore: 3,
          },
        ],
      }}
    />,
  );

  assert.match(html, /6회 말/);
  assert.match(html, /적시타가 나왔습니다/);
});

test('CheerLiveEventSummary는 내부 데이터가 없을 때 수동 데이터 계약을 노출한다', () => {
  const html = renderToStaticMarkup(
    <CheerLiveEventSummary
      snapshot={null}
      errorMessage="실시간 점수 데이터 준비가 필요합니다."
      errorCode="MANUAL_BASEBALL_DATA_REQUIRED"
    />,
  );

  assert.match(html, /data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"/);
  assert.match(html, /운영자 데이터 입력 후 갱신됩니다/);
  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});
