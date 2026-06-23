import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMatePopularSearchTermsQueryOptions,
  getMateMyPartiesQueryOptions,
  getMateMyPartyHistoryQueryOptions,
  getMatePartyApplicationsQueryOptions,
  getMatePartyCheckInsQueryOptions,
  getMatePartyListQueryOptions,
  getMatePartyMessagesQueryOptions,
  getMatePartyMyApplicationQueryOptions,
  getMatePartyQueryOptions,
  getMatePartyReviewsQueryOptions,
} from './mateQueryOptions';

test('mate query options는 mate query key를 일관되게 구성한다', () => {
  assert.deepEqual(
    getMatePartyListQueryOptions({
      teamId: 'LG',
      page: 1,
      size: 9,
      status: 'PENDING',
      searchQuery: '잠실',
      gameDate: '2026-03-28',
      sortBy: 'gameDate',
      sortDir: 'asc',
    }).queryKey,
    ['mate', 'parties', 'list', {
      teamId: 'LG',
      stadium: 'all',
      page: 1,
      size: 9,
      status: 'PENDING',
      searchQuery: '잠실',
      gameDate: '2026-03-28',
      sortBy: 'gameDate',
      sortDir: 'asc',
    }],
  );
  assert.deepEqual(
    getMateMyPartiesQueryOptions(99).queryKey,
    ['mate', 'my-parties', 99],
  );
  assert.deepEqual(
    getMateMyPartyHistoryQueryOptions(99, 'completed').queryKey,
    ['mate', 'my-party-history', 99, { group: 'completed', size: 20 }],
  );
  assert.deepEqual(getMatePartyQueryOptions(3).queryKey, ['mate', 'parties', 3]);
  assert.deepEqual(getMatePartyReviewsQueryOptions(3).queryKey, ['mate', 'parties', 3, 'reviews']);
  assert.deepEqual(
    getMatePartyMyApplicationQueryOptions(3, 99).queryKey,
    ['mate', 'parties', 3, 'my-application', 99],
  );
  assert.deepEqual(
    getMatePartyApplicationsQueryOptions(3).queryKey,
    ['mate', 'parties', 3, 'applications'],
  );
  assert.deepEqual(
    getMatePartyMessagesQueryOptions(3).queryKey,
    ['mate', 'parties', 3, 'messages'],
  );
  assert.deepEqual(
    getMatePartyCheckInsQueryOptions(3).queryKey,
    ['mate', 'parties', 3, 'check-ins'],
  );
  assert.deepEqual(
    getMatePopularSearchTermsQueryOptions(5).queryKey,
    ['mate', 'search-terms', 'popular', 5],
  );
});

test('mate query options는 shared staleTime 정책을 유지한다', () => {
  assert.equal(getMatePartyListQueryOptions({}).staleTime, 30 * 1000);
  assert.equal(getMateMyPartiesQueryOptions(99).staleTime, 5 * 60 * 1000);
  assert.equal(getMateMyPartiesQueryOptions(99).gcTime, 30 * 60 * 1000);
  assert.equal(getMateMyPartyHistoryQueryOptions(99, 'all').staleTime, 5 * 60 * 1000);
  assert.equal(getMateMyPartyHistoryQueryOptions(99, 'all').gcTime, 30 * 60 * 1000);
  assert.equal(getMatePartyReviewsQueryOptions(3).staleTime, 60 * 1000);
  assert.equal(getMatePartyMyApplicationQueryOptions(3, 99).staleTime, 30 * 1000);
  assert.equal(getMatePartyApplicationsQueryOptions(3).staleTime, 30 * 1000);
  assert.equal(getMatePartyMessagesQueryOptions(3).staleTime, 10 * 1000);
  assert.equal(getMatePartyCheckInsQueryOptions(3).refetchInterval, 15 * 1000);
  assert.equal(getMatePopularSearchTermsQueryOptions(5).staleTime, 60 * 1000);
});
