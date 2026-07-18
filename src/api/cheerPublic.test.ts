import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchUserPostsByHandle } from './cheerPublic';

const availableCheckin = {
  kind: 'CHECKIN',
  available: true,
  unavailableReason: null,
  checkin: {
    gameDate: '2026-04-14',
    homeTeam: 'LG',
    awayTeam: 'HH',
    cheeringTeam: 'LG',
    stadium: '잠실',
    verified: true,
  },
  recruitment: null,
};

const availableRecruitment = {
  kind: 'RECRUITMENT',
  available: true,
  unavailableReason: null,
  checkin: null,
  recruitment: {
    partyId: 29,
    gameDate: '2026-04-14',
    homeTeam: 'LG',
    awayTeam: 'HH',
    stadium: '잠실',
    currentParticipants: 2,
    maxParticipants: 4,
    recruiting: true,
  },
};

test('fetchUserPostsByHandle는 공개 유저 게시글 경로를 same-origin fetch로 호출한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      content: [
        {
          id: 1,
          teamId: 'LG',
          content: 'content',
          author: 'Slug User',
          authorHandle: '@slug',
          createdAt: '2026-03-10T00:00:00Z',
          updatedAt: '2026-03-10T00:00:00Z',
          commentCount: 0,
          likeCount: 0,
          bookmarkCount: 0,
          repostCount: 0,
          views: 0,
          liked: false,
          isBookmarked: false,
          isOwner: false,
          repostedByMe: false,
          isHot: false,
          postType: 'NORMAL',
          imageUrls: [],
        },
      ],
      last: true,
      totalPages: 1,
      totalElements: 1,
      size: 20,
      number: 0,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchUserPostsByHandle('@slug');

  assert.equal(response.content[0]?.authorHandle, '@slug');
  assert.equal(response.content[0]?.authorId, undefined);
  assert.match(requestUrl, /\/api\/cheer\/user\/slug\/posts\?page=0&size=20$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchUserPostsByHandle는 중첩 page 메타 응답을 마지막 페이지로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 1,
        teamId: 'LG',
        content: 'content',
        author: 'Slug User',
        authorHandle: '@slug',
        createdAt: '2026-03-10T00:00:00Z',
        updatedAt: '2026-03-10T00:00:00Z',
        commentCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 0,
        liked: false,
        isBookmarked: false,
        isOwner: false,
        repostedByMe: false,
        isHot: false,
        postType: 'NORMAL',
        imageUrls: [],
      },
    ],
    page: {
      size: 20,
      number: 0,
      totalElements: 1,
      totalPages: 1,
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await fetchUserPostsByHandle('@slug');

  assert.equal(response.content.length, 1);
  assert.equal(response.last, true);
  assert.equal(response.number, 0);
  assert.equal(response.size, 20);
  assert.equal(response.totalElements, 1);
  assert.equal(response.totalPages, 1);
});

test('fetchUserPostsByHandle preserves CHECKIN and RECRUITMENT linked content on top-level and embedded posts', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 10,
        teamId: 'LG',
        content: 'checkin',
        author: 'Checkin User',
        authorHandle: '@checkin',
        createdAt: '2026-04-14T00:00:00Z',
        comments: 0,
        likes: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 0,
        liked: false,
        isBookmarked: false,
        isOwner: false,
        repostedByMe: false,
        isHot: false,
        postType: 'CHECKIN',
        linkedContent: availableCheckin,
        imageUrls: [],
        originalPost: {
          id: 11,
          teamId: 'LG',
          content: 'embedded recruitment',
          author: 'Recruitment User',
          authorHandle: '@recruitment',
          createdAt: '2026-04-14T00:00:00Z',
          imageUrls: [],
          deleted: false,
          postType: 'RECRUITMENT',
          linkedContent: availableRecruitment,
        },
      },
      {
        id: 12,
        teamId: 'LG',
        content: 'recruitment',
        author: 'Recruitment User',
        authorHandle: '@recruitment',
        createdAt: '2026-04-14T00:00:00Z',
        comments: 0,
        likes: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 0,
        liked: false,
        isBookmarked: false,
        isOwner: false,
        repostedByMe: false,
        isHot: false,
        postType: 'RECRUITMENT',
        linkedContent: availableRecruitment,
        imageUrls: [],
      },
    ],
    last: true,
    totalPages: 1,
    totalElements: 2,
    size: 20,
    number: 0,
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await fetchUserPostsByHandle('@linked');

  assert.equal(response.content[0]?.postType, 'CHECKIN');
  assert.deepEqual(response.content[0]?.linkedContent, availableCheckin);
  assert.equal(response.content[0]?.originalPost?.postType, 'RECRUITMENT');
  assert.deepEqual(response.content[0]?.originalPost?.linkedContent, availableRecruitment);
  assert.equal(response.content[1]?.postType, 'RECRUITMENT');
  assert.deepEqual(response.content[1]?.linkedContent, availableRecruitment);
});

test('fetchUserPostsByHandle rejects an unknown present post type', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [{
      id: 20,
      teamId: 'LG',
      content: 'future',
      author: 'Future User',
      authorHandle: '@future',
      createdAt: '2026-04-14T00:00:00Z',
      comments: 0,
      likes: 0,
      postType: 'FUTURE_TYPE',
      imageUrls: [],
    }],
    last: true,
    totalPages: 1,
    totalElements: 1,
    size: 20,
    number: 0,
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  await assert.rejects(
    () => fetchUserPostsByHandle('@future'),
    /UNKNOWN_CHEER_POST_TYPE:FUTURE_TYPE/,
  );
});
