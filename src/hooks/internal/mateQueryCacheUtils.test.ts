import test from 'node:test';
import assert from 'node:assert/strict';

import type { Application, CheckIn, Party } from '../../types/mate';
import { MATE_KEYS } from '../mateQueryKeys';
import {
  appendMatePartyCheckIns,
  extractMatePartyListParams,
  matchesMatePartyListParams,
  updateMatePartyApplicationsArray,
  updateMatePartyArray,
  updateMatePartyListResponse,
} from './mateQueryCacheUtils';

const createParty = (overrides: Partial<Party> = {}): Party => ({
  id: 11,
  hostId: 1,
  hostHandle: '@host',
  hostName: '호스트',
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.7,
  hostReviewCount: 5,
  teamId: 'LG',
  gameDate: '2026-03-29',
  gameTime: '18:30',
  stadium: '잠실야구장',
  homeTeam: 'LG',
  awayTeam: 'OB',
  section: '1루',
  maxParticipants: 2,
  currentParticipants: 1,
  description: '잠실에서 같이 안전하게 관람할 분 찾습니다',
  ticketVerified: true,
  status: 'PENDING',
  createdAt: '2026-03-01T00:00:00',
  ...overrides,
});

const createApplication = (overrides: Partial<Application> = {}): Application => ({
  id: 101,
  partyId: 11,
  applicantHandle: '@guest',
  applicantName: '게스트',
  applicantBadge: 'NEW',
  applicantRating: 4.2,
  message: '참여하고 싶어요',
  isApproved: false,
  isRejected: false,
  createdAt: '2026-03-10T10:00:00',
  ...overrides,
});

const createCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  id: 1,
  partyId: 11,
  userHandle: '@host',
  userName: '호스트',
  location: '잠실',
  checkedInAt: '2026-03-29T17:45:00',
  ...overrides,
});

test('matchesMatePartyListParams는 search token과 숨김 status를 함께 처리한다', () => {
  const party = createParty();

  assert.equal(
    matchesMatePartyListParams(party, {
      teamId: 'LG',
      stadium: '잠실',
      gameDate: '2026-03-29',
      searchQuery: '잠실 안전하게',
      status: 'PENDING',
    }),
    true,
  );
  assert.equal(
    matchesMatePartyListParams(
      createParty({ status: 'CHECKED_IN' }),
      {
        searchQuery: '잠실',
      },
    ),
    false,
  );
});

test('updateMatePartyArray는 대상 party만 갱신하거나 제거한다', () => {
  const firstParty = createParty({ id: 1 });
  const secondParty = createParty({ id: 2, teamId: 'KIA' });

  const updated = updateMatePartyArray([firstParty, secondParty], 1, (party) => ({
    ...party,
    status: 'MATCHED',
  }));
  const removed = updateMatePartyArray([firstParty, secondParty], 2, () => null);
  const untouched = updateMatePartyArray([firstParty, secondParty], 999, (party) => ({
    ...party,
    status: 'MATCHED',
  }));

  assert.equal(updated[0]?.status, 'MATCHED');
  assert.deepEqual(removed, [firstParty]);
  assert.equal(untouched[0], firstParty);
  assert.equal(untouched[1], secondParty);
});

test('updateMatePartyListResponse는 필터에서 벗어난 party를 목록과 total에서 제거한다', () => {
  const pendingParty = createParty({ id: 31, status: 'PENDING' });
  const response = {
    content: [pendingParty],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 9,
  };

  const updated = updateMatePartyListResponse(
    response,
    { status: 'PENDING' },
    31,
    (party) => ({ ...party, status: 'MATCHED' }),
  );

  assert.deepEqual(updated.content, []);
  assert.equal(updated.totalElements, 0);
  assert.equal(updated.totalPages, 0);
});

test('updateMatePartyApplicationsArray는 application을 수정하거나 제거한다', () => {
  const firstApplication = createApplication({ id: 1 });
  const secondApplication = createApplication({ id: 2, applicantHandle: '@guest2' });

  const updated = updateMatePartyApplicationsArray([firstApplication, secondApplication], 1, (application) => ({
    ...application,
    isApproved: true,
  }));
  const removed = updateMatePartyApplicationsArray([firstApplication, secondApplication], 2, () => null);

  assert.equal(updated[0]?.isApproved, true);
  assert.deepEqual(removed, [firstApplication]);
});

test('extractMatePartyListParams는 list key만 파싱한다', () => {
  const listKey = MATE_KEYS.partyList({
    teamId: 'LG',
    searchQuery: '잠실',
  });

  assert.deepEqual(extractMatePartyListParams(listKey), {
    teamId: 'LG',
    stadium: 'all',
    page: 0,
    size: 9,
    status: 'all',
    searchQuery: '잠실',
    gameDate: 'all',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  assert.equal(extractMatePartyListParams(MATE_KEYS.party(3)), null);
});

test('appendMatePartyCheckIns는 id 또는 userHandle 중복을 막는다', () => {
  const existing = [createCheckIn()];

  const withNewGuest = appendMatePartyCheckIns(existing, createCheckIn({
    id: 2,
    userHandle: '@guest',
    userName: '게스트',
  }));
  const duplicateById = appendMatePartyCheckIns(existing, createCheckIn({ id: 1, userHandle: '@another' }));
  const duplicateByHandle = appendMatePartyCheckIns(existing, createCheckIn({ id: 3, userHandle: '@host' }));

  assert.equal(withNewGuest.length, 2);
  assert.equal(duplicateById, existing);
  assert.equal(duplicateByHandle, existing);
});
