import assert from 'node:assert/strict';
import test from 'node:test';

import type { CheerPost, PageResponse } from '../api/cheerApi';
import {
  applyCheerLikeState,
  applyCheerLikeStateToContentPage,
  applyCheerLikeStateToInfiniteData,
  buildOptimisticCheerLikeState,
  resolveCheerLikeActionPostId,
  resolveCheerLikeDisplayCount,
} from './cheerLikeState';

const createPost = (overrides: Partial<CheerPost> = {}): CheerPost => ({
  id: 1,
  teamId: 'LG',
  team: 'LG',
  postType: 'NORMAL',
  author: 'writer',
  authorHandle: '@writer',
  content: 'content',
  timeAgo: '방금 전',
  teamColor: '#C30452',
  likeCount: 3,
  commentCount: 2,
  bookmarkCount: 1,
  repostCount: 0,
  views: 0,
  isHot: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  liked: false,
  bookmarked: false,
  isOwner: false,
  repostedByMe: false,
  ...overrides,
});

test('resolveCheerLikeActionPostId는 리포스트 원글 ID를 우선한다', () => {
  const repost = createPost({
    id: 10,
    repostOfId: 99,
    repostType: 'QUOTE',
    originalPost: {
      id: 99,
      teamId: 'LG',
      teamColor: '#C30452',
      content: '원글',
      author: 'origin',
      authorHandle: '@origin',
      createdAt: '2026-04-01T00:00:00Z',
      imageUrls: [],
      deleted: false,
      likeCount: 12,
      commentCount: 4,
      repostCount: 2,
    },
  });

  assert.equal(resolveCheerLikeActionPostId(repost), 99);
  assert.equal(resolveCheerLikeActionPostId(createPost({ id: 7 })), 7);
});

test('resolveCheerLikeDisplayCount는 리포스트에서 원글 좋아요 수를 사용한다', () => {
  const repost = createPost({
    likeCount: 1,
    repostOfId: 99,
    repostType: 'QUOTE',
    originalPost: {
      id: 99,
      teamId: 'LG',
      teamColor: '#C30452',
      content: '원글',
      author: 'origin',
      authorHandle: '@origin',
      createdAt: '2026-04-01T00:00:00Z',
      imageUrls: [],
      deleted: false,
      likeCount: 12,
      commentCount: 4,
      repostCount: 2,
    },
  });

  assert.equal(resolveCheerLikeDisplayCount(repost), 12);
  assert.equal(resolveCheerLikeDisplayCount(createPost({ likeCount: 5 })), 5);
});

test('applyCheerLikeState는 일반 게시글의 liked와 likeCount를 함께 갱신한다', () => {
  const updated = applyCheerLikeState(createPost({ id: 5, likeCount: 3 }), 5, true, 4);

  assert.equal(updated.liked, true);
  assert.equal(updated.likeCount, 4);
});

test('applyCheerLikeState는 리포스트 카드의 표시 카운트와 원글 카운트를 함께 갱신한다', () => {
  const repost = createPost({
    id: 10,
    likeCount: 1,
    repostOfId: 99,
    repostType: 'QUOTE',
    originalPost: {
      id: 99,
      teamId: 'LG',
      teamColor: '#C30452',
      content: '원글',
      author: 'origin',
      authorHandle: '@origin',
      createdAt: '2026-04-01T00:00:00Z',
      imageUrls: [],
      deleted: false,
      likeCount: 12,
      commentCount: 4,
      repostCount: 2,
    },
  });

  const updated = applyCheerLikeState(repost, 99, true, 13);

  assert.equal(updated.liked, true);
  assert.equal(updated.likeCount, 13);
  assert.equal(updated.originalPost?.likeCount, 13);
});

test('buildOptimisticCheerLikeState는 현재 표시 카운트를 기준으로 증감한다', () => {
  const repost = createPost({
    id: 10,
    liked: false,
    likeCount: 1,
    repostOfId: 99,
    repostType: 'QUOTE',
    originalPost: {
      id: 99,
      teamId: 'LG',
      teamColor: '#C30452',
      content: '원글',
      author: 'origin',
      authorHandle: '@origin',
      createdAt: '2026-04-01T00:00:00Z',
      imageUrls: [],
      deleted: false,
      likeCount: 12,
      commentCount: 4,
      repostCount: 2,
    },
  });

  const liked = buildOptimisticCheerLikeState(repost, 99);
  const unliked = buildOptimisticCheerLikeState(createPost({ id: 5, liked: true, likeCount: 3 }), 5);

  assert.equal(liked.liked, true);
  assert.equal(liked.likeCount, 13);
  assert.equal(liked.originalPost?.likeCount, 13);
  assert.equal(unliked.liked, false);
  assert.equal(unliked.likeCount, 2);
});

test('applyCheerLikeStateToContentPage는 hot/bookmark 같은 단일 페이지 캐시도 갱신한다', () => {
  const repost = createPost({
    id: 10,
    repostOfId: 99,
    repostType: 'QUOTE',
    originalPost: {
      id: 99,
      teamId: 'LG',
      teamColor: '#C30452',
      content: '원글',
      author: 'origin',
      authorHandle: '@origin',
      createdAt: '2026-04-01T00:00:00Z',
      imageUrls: [],
      deleted: false,
      likeCount: 12,
      commentCount: 4,
      repostCount: 2,
    },
  });

  const page = {
    content: [repost],
    hasNext: false,
  };

  const updated = applyCheerLikeStateToContentPage(page, 99, true, 13);

  assert.equal(updated?.content[0]?.liked, true);
  assert.equal(updated?.content[0]?.likeCount, 13);
});

test('applyCheerLikeStateToInfiniteData는 피드 페이지 전체에 같은 규칙을 적용한다', () => {
  const page: PageResponse<CheerPost> = {
    content: [createPost({ id: 1, likeCount: 3 })],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  };

  const updated = applyCheerLikeStateToInfiniteData(
    {
      pages: [page],
      pageParams: [0],
    },
    1,
    true,
    4,
  );

  assert.equal(updated?.pages[0]?.content[0]?.liked, true);
  assert.equal(updated?.pages[0]?.content[0]?.likeCount, 4);
});
