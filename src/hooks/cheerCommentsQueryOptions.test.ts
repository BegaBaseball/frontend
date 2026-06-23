import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMMENT_PAGE_SIZE,
  getCheerCommentsQueryOptions,
  getNextCommentsPageParam,
} from './cheerCommentsQueryOptions';

test('cheer comments query options expose stable post-scoped keys', () => {
  const options = getCheerCommentsQueryOptions(42);

  assert.equal(COMMENT_PAGE_SIZE, 20);
  assert.deepEqual(options.queryKey, ['cheer', 'post', 42, 'comments']);
  assert.equal(options.initialPageParam, 0);
});

test('getNextCommentsPageParam stops on last page', () => {
  assert.equal(getNextCommentsPageParam({ last: true, number: 0, totalPages: 2 }), undefined);
});

test('getNextCommentsPageParam advances while pages remain', () => {
  assert.equal(getNextCommentsPageParam({ last: false, number: 0, totalPages: 3 }), 1);
  assert.equal(getNextCommentsPageParam({ last: false, number: 2, totalPages: 3 }), undefined);
});
