import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import type {
  InvalidateMatePartyQueriesOptions,
  MatePartyCollectionsRemoveOptions,
  MatePartyCollectionsUpdateOptions,
} from './mateQueryCacheContracts';
import {
  appendMatePartyCheckInQueryData,
  invalidateMateCollectionQueries,
  invalidateMatePartyQueries,
  removeMatePartyFromCollections,
  removeMatePartyQueries,
  seedMatePartyQueryData,
  setMatePartyDetailQueryData,
  setMatePartyMyApplicationQueryData,
  syncMatePartyQueryData,
  updateMatePartyApplicationQueryData,
  updateMatePartyCollectionQueryData,
} from './mateQueryCache';
import { MATE_KEYS } from './mateQueryKeys';
import {
  getMateMyPartiesQueryOptions,
  getMatePartyApplicationsQueryOptions,
  getMatePartyCheckInsQueryOptions,
  getMatePartyListQueryOptions,
  getMatePartyMyApplicationQueryOptions,
  getMatePartyQueryOptions,
} from './mateQueryOptions';

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

const createParty = (overrides: Partial<{
  id: number;
  hostId: number;
  hostHandle: string;
  hostName: string;
  teamId: string;
  gameDate: string;
  gameTime: string;
  stadium: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
  maxParticipants: number;
  currentParticipants: number;
  description: string;
  status: 'PENDING' | 'MATCHED' | 'CHECKED_IN';
}> = {}) => ({
  id: 11,
  hostId: 1,
  hostHandle: '@host',
  hostName: '호스트',
  hostBadge: 'TRUSTED' as const,
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
  status: 'PENDING' as const,
  createdAt: '2026-03-01T00:00:00',
  ...overrides,
});

const createPaginatedResponse = <T,>(content: T[]) => ({
  content,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  number: 0,
  size: 9,
});

const createApplication = (overrides: Partial<{
  id: number;
  partyId: number;
  applicantHandle: string;
  applicantName: string;
  isApproved: boolean;
  isRejected: boolean;
}> = {}) => ({
  id: 101,
  partyId: 11,
  applicantHandle: '@guest',
  applicantName: '게스트',
  applicantBadge: 'NEW' as const,
  applicantRating: 4.2,
  message: '참여하고 싶어요',
  isApproved: false,
  isRejected: false,
  createdAt: '2026-03-10T10:00:00',
  ...overrides,
});

const createCheckIn = (overrides: Partial<{
  id: number;
  partyId: number;
  userHandle: string;
  userName: string;
}> = {}) => ({
  id: 1,
  partyId: 11,
  userHandle: '@host',
  userName: '호스트',
  location: '잠실',
  checkedInAt: '2026-03-28T17:45:00',
  ...overrides,
});

test('mate query cache helper는 party mutation 후 관련 query를 일관되게 무효화한다', async () => {
  const { queryClient, invalidateCalls } = createInvalidateRecorder();
  const options: InvalidateMatePartyQueriesOptions = {
    includeApplications: true,
    includeCheckIns: true,
    includeCollections: true,
    userId: 99,
  };

  await invalidateMatePartyQueries(queryClient, 3, options);

  assert.deepEqual(invalidateCalls, [
    MATE_KEYS.party(3),
    MATE_KEYS.partyApplications(3),
    MATE_KEYS.partyMyApplication(3, 99),
    MATE_KEYS.partyCheckIns(3),
    MATE_KEYS.partyLists(),
    MATE_KEYS.myParties(),
    MATE_KEYS.myPartyHistories(),
  ]);
});

test('mate query cache helper는 host 관리용 my-application prefix invalidate를 지원한다', async () => {
  const { queryClient, invalidateCalls } = createInvalidateRecorder();
  const options: InvalidateMatePartyQueriesOptions = {
    includeApplications: true,
    includeCollections: true,
    includeMyApplications: true,
  };

  await invalidateMatePartyQueries(queryClient, 7, options);

  assert.deepEqual(invalidateCalls, [
    MATE_KEYS.party(7),
    MATE_KEYS.partyApplications(7),
    MATE_KEYS.partyMyApplications(7),
    MATE_KEYS.partyLists(),
    MATE_KEYS.myParties(),
    MATE_KEYS.myPartyHistories(),
  ]);
});

test('mate query cache helper는 collection invalidate와 party cache set/remove를 공통화한다', async () => {
  const realQueryClient = new QueryClient();
  const { queryClient, invalidateCalls, removeCalls } = createInvalidateRecorder();
  const party = createParty();

  setMatePartyDetailQueryData(realQueryClient, party);
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
    MATE_KEYS.myPartyHistories(),
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
    cheeringSide: null,
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
    reservationDepositAmount: null,
    hostTrustMetrics: null,
    createdAt: '',
  });
});

test('seedMatePartyQueryData는 이미 있는 상세 cache를 placeholder로 덮어쓰지 않는다', () => {
  const queryClient = new QueryClient();
  const existingParty = createParty({
    id: 7,
    hostId: 101,
    hostHandle: '@detail',
    hostName: '상세호스트',
    teamId: 'KIA',
    stadium: '광주',
    homeTeam: 'KIA',
    awayTeam: 'LG',
    section: '중앙석',
    maxParticipants: 4,
    currentParticipants: 3,
    description: '상세 캐시',
    status: 'MATCHED',
  });

  setMatePartyDetailQueryData(queryClient, existingParty);

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

test('mate query cache helper는 승인 후 detail/list/myParties를 직접 갱신한다', () => {
  const queryClient = new QueryClient();
  const party = createParty();

  setMatePartyDetailQueryData(queryClient, party);
  queryClient.setQueryData(getMatePartyListQueryOptions({}).queryKey, createPaginatedResponse([party]));
  queryClient.setQueryData(
    getMatePartyListQueryOptions({ status: 'PENDING' }).queryKey,
    createPaginatedResponse([party]),
  );
  queryClient.setQueryData(getMateMyPartiesQueryOptions(99).queryKey, [party]);

  updateMatePartyCollectionQueryData(queryClient, party.id, (currentParty) => ({
    ...currentParty,
    currentParticipants: 2,
    status: 'MATCHED',
  }));

  assert.equal(
    (queryClient.getQueryData(getMatePartyQueryOptions(party.id).queryKey) as ReturnType<typeof createParty>).status,
    'MATCHED',
  );
  assert.equal(
    (queryClient.getQueryData(getMatePartyListQueryOptions({}).queryKey) as { content: Array<ReturnType<typeof createParty>> })
      .content[0]?.currentParticipants,
    2,
  );
  assert.deepEqual(
    (queryClient.getQueryData(getMatePartyListQueryOptions({ status: 'PENDING' }).queryKey) as { content: Array<ReturnType<typeof createParty>> })
      .content,
    [],
  );
  assert.equal(
    (queryClient.getQueryData(getMateMyPartiesQueryOptions(99).queryKey) as Array<ReturnType<typeof createParty>>)[0]?.status,
    'MATCHED',
  );
});

test('mate query cache helper는 승인 취소 후 myApplication과 myParties를 직접 정리한다', () => {
  const queryClient = new QueryClient();
  const party = createParty({
    id: 21,
    currentParticipants: 2,
    status: 'MATCHED',
  });
  const application = createApplication({
    id: 301,
    partyId: 21,
    isApproved: true,
  });

  setMatePartyDetailQueryData(queryClient, party);
  queryClient.setQueryData(getMateMyPartiesQueryOptions(99).queryKey, [party]);
  queryClient.setQueryData(getMatePartyApplicationsQueryOptions(21).queryKey, [application]);
  setMatePartyMyApplicationQueryData(queryClient, 21, 99, application);

  setMatePartyMyApplicationQueryData(queryClient, 21, 99, null);
  updateMatePartyApplicationQueryData(queryClient, 21, application.id, () => null);
  const updateOptions: MatePartyCollectionsUpdateOptions = {
    includeMyParties: false,
  };
  const removeOptions: MatePartyCollectionsRemoveOptions = {
    includePartyLists: false,
    includeMyParties: true,
  };

  updateMatePartyCollectionQueryData(queryClient, 21, (currentParty) => ({
    ...currentParty,
    currentParticipants: 1,
    status: 'PENDING',
  }), updateOptions);
  removeMatePartyFromCollections(queryClient, 21, removeOptions);

  assert.equal(queryClient.getQueryData(getMatePartyMyApplicationQueryOptions(21, 99).queryKey), null);
  assert.deepEqual(queryClient.getQueryData(getMatePartyApplicationsQueryOptions(21).queryKey), []);
  assert.equal(
    (queryClient.getQueryData(getMatePartyQueryOptions(21).queryKey) as ReturnType<typeof createParty>).currentParticipants,
    1,
  );
  assert.deepEqual(queryClient.getQueryData(getMateMyPartiesQueryOptions(99).queryKey), []);
});

test('mate query cache helper는 마지막 체크인 후 public list에서 파티를 숨긴다', () => {
  const queryClient = new QueryClient();
  const party = createParty({
    id: 31,
    currentParticipants: 2,
    status: 'MATCHED',
  });

  setMatePartyDetailQueryData(queryClient, party);
  queryClient.setQueryData(getMatePartyListQueryOptions({}).queryKey, createPaginatedResponse([party]));
  queryClient.setQueryData(getMateMyPartiesQueryOptions(77).queryKey, [party]);
  queryClient.setQueryData(getMatePartyCheckInsQueryOptions(31).queryKey, [createCheckIn({ partyId: 31 })]);

  const nextCheckIns = appendMatePartyCheckInQueryData(queryClient, 31, createCheckIn({
    id: 2,
    partyId: 31,
    userHandle: '@guest',
    userName: '게스트',
  }));

  assert.equal(nextCheckIns.length, 2);

  updateMatePartyCollectionQueryData(queryClient, 31, (currentParty) => ({
    ...currentParty,
    status: 'CHECKED_IN',
  }));

  assert.equal(
    (queryClient.getQueryData(getMatePartyQueryOptions(31).queryKey) as ReturnType<typeof createParty>).status,
    'CHECKED_IN',
  );
  assert.deepEqual(
    (queryClient.getQueryData(getMatePartyListQueryOptions({}).queryKey) as { content: Array<ReturnType<typeof createParty>> })
      .content,
    [],
  );
  assert.equal(
    (queryClient.getQueryData(getMateMyPartiesQueryOptions(77).queryKey) as Array<ReturnType<typeof createParty>>)[0]?.status,
    'CHECKED_IN',
  );
});

test('syncMatePartyQueryData는 기존 collection cache에 최신 party를 반영한다', () => {
  const queryClient = new QueryClient();
  const initialParty = createParty({ id: 41, description: 'before' });
  const updatedParty = createParty({ id: 41, description: 'after', status: 'MATCHED' });

  setMatePartyDetailQueryData(queryClient, initialParty);
  queryClient.setQueryData(getMatePartyListQueryOptions({}).queryKey, createPaginatedResponse([initialParty]));
  queryClient.setQueryData(getMateMyPartiesQueryOptions(1).queryKey, [initialParty]);

  syncMatePartyQueryData(queryClient, updatedParty);

  assert.equal(
    (queryClient.getQueryData(getMatePartyQueryOptions(41).queryKey) as ReturnType<typeof createParty>).description,
    'after',
  );
  assert.equal(
    (queryClient.getQueryData(getMatePartyListQueryOptions({}).queryKey) as { content: Array<ReturnType<typeof createParty>> })
      .content[0]?.status,
    'MATCHED',
  );
  assert.equal(
    (queryClient.getQueryData(getMateMyPartiesQueryOptions(1).queryKey) as Array<ReturnType<typeof createParty>>)[0]?.description,
    'after',
  );
});
