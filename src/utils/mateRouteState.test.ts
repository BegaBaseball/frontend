import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMateRouteLocationState,
  getMateRoutePlaceholderParty,
  normalizeMateListReturnTo,
  normalizeMatePartySeed,
} from './mate';

test('normalizeMatePartySeed fills missing detail fields for MateParty placeholders', () => {
  const placeholder = normalizeMatePartySeed({
    id: 42,
    hostId: 7,
    hostHandle: '@host',
    teamId: 'LG',
    stadium: '잠실',
    gameDate: '2026-03-09',
    gameTime: '18:30',
    section: '1루',
    currentParticipants: 2,
    maxParticipants: 4,
    status: 'PENDING',
    description: '같이 갑니다',
    homeTeam: 'LG',
    awayTeam: 'OB',
  });

  assert.deepEqual(placeholder, {
    id: 42,
    hostId: 7,
    hostHandle: '@host',
    hostName: '',
    hostBadge: 'NEW',
    hostAverageRating: null,
    hostReviewCount: 0,
    teamId: 'LG',
    cheeringSide: null,
    gameDate: '2026-03-09',
    gameTime: '18:30',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    maxParticipants: 4,
    currentParticipants: 2,
    description: '같이 갑니다',
    ticketVerified: false,
    status: 'PENDING',
    reservationDepositAmount: null,
    hostTrustMetrics: null,
    createdAt: '',
  });
});

test('getMateRoutePlaceholderParty returns a normalized placeholder only for the matching route id', () => {
  const locationState = buildMateRouteLocationState({
    id: 99,
    hostHandle: '@seed',
    teamId: 'HH',
    stadium: '대전',
    gameDate: '2026-03-10',
    gameTime: '18:30',
    section: '중앙석',
    currentParticipants: 1,
    maxParticipants: 2,
    status: 'MATCHED',
    homeTeam: 'HH',
    awayTeam: 'LG',
  });

  const matched = getMateRoutePlaceholderParty(locationState, 99);
  const unmatched = getMateRoutePlaceholderParty(locationState, 100);

  assert.equal(matched?.id, 99);
  assert.equal(matched?.hostHandle, '@seed');
  assert.equal(matched?.ticketVerified, false);
  assert.equal(unmatched, undefined);
});

test('buildMateRouteLocationState carries a canonical filtered-list return path', () => {
  const state = buildMateRouteLocationState({
    id: 11,
    teamId: 'HH',
    stadium: '대전',
    gameDate: '2026-07-18',
    gameTime: '18:30',
    section: '응원석',
    currentParticipants: 1,
    maxParticipants: 4,
    status: 'PENDING',
    homeTeam: 'HH',
    awayTeam: 'LG',
  }, '/mate?tab=matched&page=2');

  assert.equal(state.returnTo, '/mate?tab=matched&page=2');
});

test('normalizeMateListReturnTo accepts only a relative exact /mate pathname', () => {
  assert.equal(normalizeMateListReturnTo('/mate?q=%EC%9E%A0%EC%8B%A4'), '/mate?q=%EC%9E%A0%EC%8B%A4');
  assert.equal(normalizeMateListReturnTo('/mate/42?q=x'), '/mate');
  assert.equal(normalizeMateListReturnTo('//evil.example/mate'), '/mate');
  assert.equal(normalizeMateListReturnTo('https://evil.example/mate'), '/mate');
  assert.equal(normalizeMateListReturnTo({ pathname: '/mate' }), '/mate');
});
