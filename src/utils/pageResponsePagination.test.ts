import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextPageParamFromPageResponse, normalizePageResponseMeta } from './pageResponsePagination';

test('getNextPageParamFromPageResponse stops when the backend marks the page as last', () => {
  assert.equal(
    getNextPageParamFromPageResponse({ last: true, number: 0, totalPages: 2 }),
    undefined,
  );
});

test('getNextPageParamFromPageResponse stops when totalPages proves there are no more pages', () => {
  assert.equal(
    getNextPageParamFromPageResponse({ last: false, number: 0, totalPages: 1 }),
    undefined,
  );
  assert.equal(
    getNextPageParamFromPageResponse({ last: false, number: 2, totalPages: 3 }),
    undefined,
  );
});

test('getNextPageParamFromPageResponse advances while totalPages leaves another page', () => {
  assert.equal(
    getNextPageParamFromPageResponse({ last: false, number: 0, totalPages: 3 }),
    1,
  );
});

test('getNextPageParamFromPageResponse falls back to loaded page count without a page number', () => {
  assert.equal(
    getNextPageParamFromPageResponse(
      { last: false, totalPages: 4 },
      [{ number: 0 }, { number: 1 }],
    ),
    2,
  );
});

test('getNextPageParamFromPageResponse stops when page metadata is absent', () => {
  assert.equal(
    getNextPageParamFromPageResponse({ last: false }),
    undefined,
  );
});

test('getNextPageParamFromPageResponse stops on short pages when totalPages is missing', () => {
  assert.equal(
    getNextPageParamFromPageResponse({
      content: [1, 2, 3],
      last: false,
      number: 0,
      size: 10,
    }),
    undefined,
  );
});

test('getNextPageParamFromPageResponse advances on full pages when total metadata is missing', () => {
  assert.equal(
    getNextPageParamFromPageResponse({
      content: Array.from({ length: 10 }, (_, index) => index),
      last: false,
      number: 0,
      size: 10,
    }),
    1,
  );
});

test('getNextPageParamFromPageResponse reads Spring page metadata when root fields are missing', () => {
  assert.equal(
    getNextPageParamFromPageResponse({
      content: [1],
      page: {
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    }),
    undefined,
  );
});

test('normalizePageResponseMeta keeps unknown full pages open and derives a conservative next boundary', () => {
  assert.deepEqual(
    normalizePageResponseMeta({
      content: Array.from({ length: 20 }, (_, index) => index),
      number: 2,
      size: 20,
    }, 20),
    {
      last: false,
      number: 2,
      size: 20,
      totalElements: 60,
      totalPages: 4,
    },
  );
});
