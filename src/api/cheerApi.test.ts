import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createComment,
  createPost,
  fetchComments,
  fetchLinkedPostTarget,
  fetchPostDetail,
  fetchPosts,
  uploadPostImages,
} from './cheerApi';

const resolveRequestUrl = (input: string | URL | Request): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

const buildPostResponse = (postType?: string) => ({
  id: 1,
  teamId: 'LG',
  content: 'content',
  author: 'Writer',
  authorHandle: '@writer',
  createdAt: '2026-03-10T00:00:00Z',
  updatedAt: '2026-03-10T00:00:00Z',
  commentCount: 0,
  likeCount: 0,
  bookmarkCount: 0,
  repostCount: 0,
  views: 0,
  liked: false,
  isBookmarked: false,
  isOwner: true,
  repostedByMe: false,
  isHot: false,
  ...(postType === undefined ? {} : { postType }),
  imageUrls: [],
});

test('fetchPostDetail preserves all four supported post types', async (t) => {
  const postTypes = ['NORMAL', 'NOTICE', 'CHECKIN', 'RECRUITMENT'] as const;
  let callIndex = 0;

  t.mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify(buildPostResponse(postTypes[callIndex++])),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  ) as never);

  for (const postType of postTypes) {
    assert.equal((await fetchPostDetail(1)).postType, postType);
  }
});

test('fetchPostDetail defaults only an absent post type to NORMAL', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify(buildPostResponse()),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  ) as never);

  assert.equal((await fetchPostDetail(1)).postType, 'NORMAL');
});

test('fetchPostDetail rejects present empty and unknown post types', async (t) => {
  const postTypes = ['', 'FUTURE_TYPE'];
  let callIndex = 0;

  t.mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify(buildPostResponse(postTypes[callIndex++])),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  ) as never);

  await assert.rejects(() => fetchPostDetail(1), /UNKNOWN_CHEER_POST_TYPE:/);
  await assert.rejects(() => fetchPostDetail(1), /UNKNOWN_CHEER_POST_TYPE:FUTURE_TYPE/);
});

test('createPost preserves linked post types and source IDs in request payloads', async (t) => {
  const requestBodies: unknown[] = [];
  const responseTypes = ['CHECKIN', 'RECRUITMENT'];
  let callIndex = 0;

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify(buildPostResponse(responseTypes[callIndex++])), {
      headers: { 'content-type': 'application/json' },
      status: 201,
    });
  });

  await createPost({ teamId: 'LG', content: 'checked in', postType: 'CHECKIN', diaryId: 17 });
  await createPost({ teamId: 'LG', content: 'join us', postType: 'RECRUITMENT', partyId: 29 });

  assert.deepEqual(requestBodies, [
    { teamId: 'LG', content: 'checked in', postType: 'CHECKIN', diaryId: 17 },
    { teamId: 'LG', content: 'join us', postType: 'RECRUITMENT', partyId: 29 },
  ]);
});

test('createPost rejects present empty and unknown post types before fetch', async (t) => {
  let fetchCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify(buildPostResponse('NORMAL')), {
      headers: { 'content-type': 'application/json' },
      status: 201,
    });
  });

  const invalidPayloads = [
    { teamId: 'LG', content: 'empty', postType: '' },
    { teamId: 'LG', content: 'unknown', postType: 'FUTURE_TYPE' },
  ] as unknown as Array<Parameters<typeof createPost>[0]>;

  for (const payload of invalidPayloads) {
    await assert.rejects(() => createPost(payload), /UNKNOWN_CHEER_POST_TYPE:/);
  }
  assert.equal(fetchCalls, 0);
});

test('fetchLinkedPostTarget sends authenticated diary and party lookup params', async (t) => {
  const requestUrls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrls.push(resolveRequestUrl(input));
    return new Response(JSON.stringify({
      postId: null,
      preview: {
        kind: 'CHECKIN',
        available: false,
        unavailableReason: 'SOURCE_MISSING',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const diaryLookup = await fetchLinkedPostTarget({ diaryId: 17 });
  await fetchLinkedPostTarget({ partyId: 29 });

  assert.deepEqual(diaryLookup.preview, {
    kind: 'CHECKIN',
    available: false,
    unavailableReason: 'SOURCE_MISSING',
  });
  assert.deepEqual(requestUrls, [
    '/api/cheer/posts/linked?diaryId=17',
    '/api/cheer/posts/linked?partyId=29',
  ]);
});

test('fetchPosts는 공개 응답에서 authorId 없이 cheer post를 정규화한다', async (t) => {
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
        originalPost: {
          id: 2,
          teamId: 'LG',
          content: 'embedded',
          author: 'Embedded User',
          authorHandle: '@embedded',
          createdAt: '2026-03-10T00:00:00Z',
          likeCount: 0,
          commentCount: 0,
          repostCount: 0,
          imageUrls: [],
          deleted: false,
        },
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
  }) as never);

  const response = await fetchPosts();
  const post = response.content[0];

  assert.equal(post?.authorHandle, '@slug');
  assert.equal(post?.authorId, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(post ?? {}, 'authorId'), false);
  assert.equal(post?.originalPost?.authorHandle, '@embedded');
  assert.equal(post?.originalPost && Object.prototype.hasOwnProperty.call(post.originalPost, 'authorId'), false);
});

test('fetchPosts는 중첩 page 메타 응답을 페이지 정보로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 3,
        teamId: 'LG',
        content: 'single',
        author: 'Writer',
        authorHandle: '@writer',
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
  }) as never);

  const response = await fetchPosts();

  assert.equal(response.content.length, 1);
  assert.equal(response.last, true);
  assert.equal(response.number, 0);
  assert.equal(response.size, 20);
  assert.equal(response.totalElements, 1);
  assert.equal(response.totalPages, 1);
});

test('fetchPosts는 짧은 페이지 응답에서 last가 없어도 마지막 페이지로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 4,
        teamId: 'LG',
        content: 'short',
        author: 'Writer',
        authorHandle: '@writer',
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
    size: 20,
    number: 0,
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }) as never);

  const response = await fetchPosts();

  assert.equal(response.last, true);
  assert.equal(response.totalPages, 1);
});

test('fetchComments는 공개 응답에서 authorEmail 없이 댓글을 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 10,
        author: 'Commenter',
        authorHandle: '@commenter',
        content: 'hello',
        createdAt: '2026-03-10T00:00:00Z',
        likeCount: 1,
        likedByMe: false,
        replies: [],
      },
    ],
    totalElements: 1,
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }) as never);

  const response = await fetchComments(1);
  const comment = response.content[0];

  assert.equal(comment?.authorHandle, '@commenter');
  assert.equal(Object.prototype.hasOwnProperty.call(comment ?? {}, 'authorEmail'), false);
});

test('fetchComments는 중첩 page 메타 응답을 페이지 정보로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [
      {
        id: 12,
        author: 'Commenter',
        authorHandle: '@commenter',
        content: 'nested page',
        createdAt: '2026-03-10T00:00:00Z',
        likeCount: 0,
        likedByMe: false,
        replies: [],
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
  }) as never);

  const response = await fetchComments(1);

  assert.equal(response.content.length, 1);
  assert.equal(response.last, true);
  assert.equal(response.number, 0);
  assert.equal(response.size, 20);
  assert.equal(response.totalElements, 1);
  assert.equal(response.totalPages, 1);
});

test('createComment는 비공개 응답을 댓글 뷰 모델로 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    id: 11,
    author: 'Writer',
    authorHandle: '@writer',
    content: 'created',
    createdAt: '2026-03-10T00:00:00Z',
    likeCount: 0,
    likedByMe: false,
    replies: [],
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }) as never);

  const comment = await createComment(1, 'created');

  assert.equal(comment.authorHandle, '@writer');
  assert.equal(comment.timeAgo.length > 0, true);
  assert.deepEqual(comment.replies, []);
});

test('uploadPostImages는 string[]와 PostImageDto[] 응답을 모두 URL 배열로 정규화한다', async (t) => {
  const responses = [
    [
      {
        id: 1,
        storagePath: 'images/1.webp',
        mimeType: 'image/webp',
        bytes: 1234,
        isThumbnail: false,
        url: 'https://cdn.example.com/1.webp',
      },
    ],
    ['https://cdn.example.com/legacy-1.webp', 'https://cdn.example.com/legacy-2.webp'],
  ];

  let callIndex = 0;
  const requestUrls: string[] = [];
  const requestBodies: Array<BodyInit | null | undefined> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrls.push(resolveRequestUrl(input));
    requestBodies.push(init?.body);

    return new Response(JSON.stringify(responses[callIndex++]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const file = new File(['hello'], 'hello.png', { type: 'image/png' });
  const first = await uploadPostImages(1, [file]);
  const second = await uploadPostImages(1, [file]);

  assert.deepEqual(requestUrls, ['/api/cheer/posts/1/images', '/api/cheer/posts/1/images']);
  assert.ok(requestBodies[0] instanceof FormData);
  assert.deepEqual(first, ['https://cdn.example.com/1.webp']);
  assert.deepEqual(second, ['https://cdn.example.com/legacy-1.webp', 'https://cdn.example.com/legacy-2.webp']);
});
