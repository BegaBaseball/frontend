import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import {
  invalidateMateCollectionQueries,
  invalidateMatePartyQueries,
  removeMatePartyQueries,
  seedMatePartyQueryData,
  setMatePartyDetailQueryData,
} from './mateQueryCache';
import { getMatePartyQueryOptions } from './mateQueryOptions';
import { MATE_KEYS } from './mateQueryKeys';

const createInvalidateRecorder = () => {
  const invalidateCalls: unknown[] = [];
  const removeCalls: unknown[] = [];

  const queryClient = {
    invalidateQueries: (options: { queryKey: unknown }) => {
      invalidateCalls.push(options.queryKey);
      return Promise.resolve();
    },
    removeQueries: (options: { queryKey: unknown }) => {
      removeCalls.push(options.queryKey);
    },
  } as unknown as QueryClient;

  return {
    queryClient,
    invalidateCalls,
    removeCalls,
  };
};

test('mate query cache helper는 party mutation 후 관련 query를 일관되게 무효화한다', async () => {
  const { queryClient, invalidateCalls } = createInvalidateRecorder();

  await invalidateMatePartyQueries(queryClient, 3, {
    includeApplications: true,
    includeCheckIns: true,
    includeCollections: true,
    userId: 99,
  });

  assert.deepEqual(invalidateCalls, [
    MATE_KEYS.party(3),
    MATE_KEYS.partyApplications(3),
    MATE_KEYS.partyMyApplication(3, 99),
    MATE_KEYS.partyCheckIns(3),
    MATE_KEYS.partyLists(),
    MATE_KEYS.myParties(),
  ]);
});

test('mate query cache helper는 host 관리용 my-application prefix invalidate를 지원한다', async () => {
  const { queryClient, invalidateCalls } = createInvalidateRecorder();

  await invalidateMatePartyQueries(queryClient, 7, {
    includeApplications: true,
    includeCollections: true,
    includeMyApplications: true,
  });

  assert.deepEqual(invalidateCalls, [
    MATE_KEYS.party(7),
    MATE_KEYS.partyApplications(7),
    MATE_KEYS.partyMyApplications(7),
    MATE_KEYS.partyLists(),
    MATE_KEYS.myParties(),
  ]);
});

test('mate query cache helper는 collection invalidate와 party cache set/remove를 공통화한다', async () => {
  const realQueryClient = new QueryClient();
  const { queryClient, invalidateCalls, removeCalls } = createInvalidateRecorder();

  setMatePartyDetailQueryData(realQueryClient, {
    id: 11,
    hostId: 1,
    hostHandle: '@host',
    hostName: '호스트',
    hostBadge: 'TRUSTED',
    hostAverageRating: 4.7,
    hostReviewCount: 5,
    teamId: 'LG',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    maxParticipants: 2,
    currentParticipants: 1,
    description: '테스트',
    ticketVerified: true,
    status: 'PENDING',
    createdAt: '2026-03-01T00:00:00',
  });
  realQueryClient.setQueryData(MATE_KEYS.partyReviews(11), [{ id: 1 }]);

  assert.equal(realQueryClient.getQueryData(MATE_KEYS.party(11)) !== undefined, true);
  assert.equal(realQueryClient.getQueryData(MATE_KEYS.partyReviews(11)) !== undefined, true);

  removeMatePartyQueries(realQueryClient, 11);

  assert.equal(realQueryClient.getQueryData(MATE_KEYS.party(11)), undefined);
  assert.equal(realQueryClient.getQueryData(MATE_KEYS.partyReviews(11)), undefined);

  await invalidateMateCollectionQueries(queryClient);

  assert.deepEqual(invalidateCalls, [
    MATE_KEYS.partyLists(),
    MATE_KEYS.myParties(),
  ]);
  assert.deepEqual(removeCalls, []);
});

test('seedMatePartyQueryData는 비어 있는 party detail cache에 preview를 심는다', () => {
  const queryClient = new QueryClient();

  seedMatePartyQueryData(queryClient, {
    id: 3,
    hostHandle: '@host',
    teamId: 'LG',
    stadium: '잠실',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    section: '1루',
    currentParticipants: 1,
    maxParticipants: 2,
    status: 'PENDING',
    homeTeam: 'LG',
    awayTeam: 'OB',
  });

  assert.deepEqual(queryClient.getQueryData(getMatePartyQueryOptions(3).queryKey), {
    id: 3,
    hostId: undefined,
    hostHandle: '@host',
    hostName: '',
    hostBadge: 'NEW',
    hostAverageRating: null,
    hostReviewCount: 0,
    teamId: 'LG',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    stadium: '잠실',
    homeTeam: 'LG',
    awayTeam: 'OB',
    section: '1루',
    maxParticipants: 2,
    currentParticipants: 1,
    description: '',
    ticketVerified: false,
    status: 'PENDING',
    createdAt: '',
  });
});

test('seedMatePartyQueryData는 이미 있는 상세 cache를 placeholder로 덮어쓰지 않는다', () => {
  const queryClient = new QueryClient();
  const existingParty = {
    id: 7,
    hostId: 101,
    hostHandle: '@detail',
    hostName: '상세호스트',
    hostBadge: 'TRUSTED' as const,
    hostAverageRating: 4.8,
    hostReviewCount: 12,
    teamId: 'KIA',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    stadium: '광주',
    homeTeam: 'KIA',
    awayTeam: 'LG',
    section: '중앙석',
    maxParticipants: 4,
    currentParticipants: 3,
    description: '상세 캐시',
    ticketVerified: true,
    status: 'MATCHED' as const,
    createdAt: '2026-03-01T00:00:00',
  };

  queryClient.setQueryData(getMatePartyQueryOptions(7).queryKey, existingParty);

  seedMatePartyQueryData(queryClient, {
    id: 7,
    hostHandle: '@seed',
    teamId: 'KIA',
    stadium: '광주',
    gameDate: '2026-03-28',
    gameTime: '18:30',
    section: '외야',
    currentParticipants: 1,
    maxParticipants: 2,
    status: 'PENDING',
    homeTeam: 'KIA',
    awayTeam: 'LG',
  });

  assert.deepEqual(queryClient.getQueryData(getMatePartyQueryOptions(7).queryKey), existingParty);
});
