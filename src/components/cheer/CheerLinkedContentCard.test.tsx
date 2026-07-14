import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { LinkedContent } from '../../api/cheerApi';
import CheerLinkedContentCard from './CheerLinkedContentCard';

const renderCard = (linkedContent: LinkedContent, variant: 'compact' | 'detail' = 'compact') => (
  renderToStaticMarkup(createElement(CheerLinkedContentCard, { linkedContent, variant }))
);

test('renders only approved check-in fields and never links to a diary', () => {
  const linkedContent = {
    kind: 'CHECKIN',
    available: true,
    checkin: {
      gameDate: '2026-07-13',
      homeTeam: 'LG',
      awayTeam: '두산',
      cheeringTeam: 'LG',
      stadium: '잠실',
      verified: true,
      diaryId: 77,
      memo: '비공개 메모',
      photos: ['private.jpg'],
      ticket: '3루 테이블석',
      seatRow: '12열',
    },
    recruitment: null,
    unavailableReason: null,
  } as unknown as LinkedContent;

  const html = renderCard(linkedContent);

  assert.match(html, /인증 완료/);
  assert.match(html, /LG.*두산/);
  assert.match(html, /2026-07-13/);
  assert.match(html, /잠실/);
  assert.doesNotMatch(html, /비공개 메모|private\.jpg|3루 테이블석|12열|memo|photos|ticket|seatRow/);
  assert.doesNotMatch(html, /href=|\/diary\//);
});

test('renders an available recruiting party with approved details and CTA', () => {
  const html = renderCard({
    kind: 'RECRUITMENT',
    available: true,
    checkin: null,
    unavailableReason: null,
    recruitment: {
      partyId: 42,
      gameDate: '2026-07-20',
      gameTime: '18:30:00',
      homeTeam: 'LG',
      awayTeam: '두산',
      stadium: '잠실',
      section: '1루 내야',
      currentParticipants: 2,
      maxParticipants: 4,
      status: 'PENDING',
      recruiting: true,
      description: '함께 응원할 분을 찾습니다.',
      price: 10000,
      ticketPrice: 25000,
      reservationDepositAmount: 5000,
    },
  });

  assert.match(html, /모집 중/);
  assert.match(html, /LG.*두산/);
  assert.match(html, /2\/4/);
  assert.match(html, /함께 응원할 분을 찾습니다/);
  assert.match(html, /10,000원/);
  assert.match(html, /25,000원/);
  assert.match(html, /5,000원/);
  assert.match(html, /href="\/mate\/42"/);
  assert.match(html, /파티 보기/);
});

test('renders the Jackson LocalTime string used by production recruitment responses', () => {
  const linkedContent = {
    kind: 'RECRUITMENT',
    available: true,
    checkin: null,
    unavailableReason: null,
    recruitment: {
      partyId: 42,
      gameTime: '18:30:00',
      status: 'PENDING',
      recruiting: true,
    },
  } as unknown as LinkedContent;

  const html = renderCard(linkedContent);

  assert.match(html, />18:30</);
  assert.doesNotMatch(html, />18:30:00</);
});

test('keeps the party link but labels non-pending recruitment as closed', () => {
  const html = renderCard({
    kind: 'RECRUITMENT',
    available: true,
    checkin: null,
    unavailableReason: null,
    recruitment: {
      partyId: 43,
      status: 'COMPLETED',
      recruiting: false,
      description: '마감된 파티',
    },
  });

  assert.match(html, /모집 마감/);
  assert.match(html, /href="\/mate\/43"/);
  assert.match(html, /파티 보기/);
  assert.doesNotMatch(html, /모집 중/);
});

test('renders source-missing and failed-source states without any link', () => {
  const sourceMissingHtml = renderCard({
    kind: 'CHECKIN',
    available: false,
    checkin: null,
    recruitment: null,
    unavailableReason: 'SOURCE_MISSING',
  });
  const failedSourceHtml = renderCard({
    kind: 'RECRUITMENT',
    available: false,
    checkin: null,
    recruitment: null,
    unavailableReason: 'SOURCE_INELIGIBLE',
  });

  assert.match(sourceMissingHtml, /원본을 확인할 수 없음/);
  assert.match(failedSourceHtml, /원본을 확인할 수 없음/);
  assert.doesNotMatch(sourceMissingHtml, /href=/);
  assert.doesNotMatch(failedSourceHtml, /href=/);
});

test('surfaces manual baseball data requirements as an operator-only no-link state', () => {
  const html = renderCard({
    kind: 'CHECKIN',
    available: false,
    checkin: null,
    recruitment: null,
    unavailableReason: 'MANUAL_BASEBALL_DATA_REQUIRED',
  });

  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.match(html, /운영자 제공 내부 야구 데이터가 필요합니다/);
  assert.doesNotMatch(html, /연결된 원본 정보가 삭제되었거나 현재 제공되지 않습니다/);
  assert.doesNotMatch(html, /href=/);
});

test('clamps recruitment description only in compact mode', () => {
  const linkedContent: LinkedContent = {
    kind: 'RECRUITMENT',
    available: true,
    checkin: null,
    unavailableReason: null,
    recruitment: {
      partyId: 44,
      status: 'PENDING',
      recruiting: true,
      description: '길게 작성된 모집 설명',
    },
  };

  assert.match(renderCard(linkedContent, 'compact'), /line-clamp-2/);
  assert.doesNotMatch(renderCard(linkedContent, 'detail'), /line-clamp-2/);
});
