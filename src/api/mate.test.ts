import test from 'node:test';
import assert from 'node:assert/strict';

import { api as requestApi, ApiError } from '../utils/api';
import {
  fetchPartyApplications,
  fetchPartyMyApplication,
  fetchPartyReviews,
} from './mate';

test('fetchPartyMyApplication은 404를 null로 정규화하고 전체 신청 목록 fallback을 사용하지 않는다', async (t) => {
  let myApplicationCalls = 0;
  let myApplicationsCalls = 0;

  t.mock.method(requestApi, 'getMyApplicationByParty', async () => {
    myApplicationCalls += 1;
    throw new ApiError('not found', 404);
  });
  t.mock.method(requestApi, 'getMyApplications', async () => {
    myApplicationsCalls += 1;
    return [];
  });

  const response = await fetchPartyMyApplication(7);

  assert.equal(response, null);
  assert.equal(myApplicationCalls, 1);
  assert.equal(myApplicationsCalls, 0);
});

test('fetchPartyMyApplication은 404가 아닌 오류를 그대로 던진다', async (t) => {
  const expectedError = new ApiError('forbidden', 403);

  t.mock.method(requestApi, 'getMyApplicationByParty', async () => {
    throw expectedError;
  });

  await assert.rejects(() => fetchPartyMyApplication(9), expectedError);
});

test('fetchPartyApplications와 fetchPartyReviews는 전용 endpoint fetcher를 그대로 사용한다', async (t) => {
  let requestedPartyIdForApplications: string | number | null = null;
  let requestedPartyIdForReviews: number | null = null;

  t.mock.method(requestApi, 'getApplicationsByParty', async (partyId: string | number) => {
    requestedPartyIdForApplications = partyId;
    return [{ id: 1, partyId: Number(partyId) }] as never;
  });

  t.mock.method(requestApi, 'getPartyReviews', async (partyId: number) => {
    requestedPartyIdForReviews = partyId;
    return [{ id: 2, partyId, rating: 5, createdAt: '2026-03-28T00:00:00Z' }] as never;
  });

  const applications = await fetchPartyApplications(11);
  const reviews = await fetchPartyReviews('12');

  assert.equal(requestedPartyIdForApplications, 11);
  assert.equal(requestedPartyIdForReviews, 12);
  assert.equal(applications[0]?.partyId, 11);
  assert.equal(reviews[0]?.partyId, 12);
});
