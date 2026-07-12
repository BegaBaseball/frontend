import assert from 'node:assert/strict';
import test from 'node:test';

import { submitCheerPost } from './cheerSubmit';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

const installImageTestDoubles = (t: test.TestContext) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 1280;
      naturalHeight = 720;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:mock-cheer');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
};

test('submitCheerPost는 direct upload key를 create post payload images에 포함한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestBodies: unknown[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestBodies.push(init?.body);

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 61,
          uploadUrl: 'https://object.example.com/upload/cheer-61',
          stagingObjectKey: 'media/staging/cheer/1/61-cheer.png',
          expiresAt: '2026-04-14T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/png',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/cheer-61') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/61/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 61,
          storagePath: 'media/cheer/1/61.webp',
          publicUrl: 'https://cdn.example.com/media/cheer/1/61.webp',
        },
      });
    }

    if (requestUrl.endsWith('/api/cheer/posts')) {
      return buildJsonResponse({
        id: 99,
        teamId: 'HH',
        content: 'image cheer post',
        author: 'TestUser',
        authorHandle: 'testuser',
        createdAt: '2026-04-14T00:00:00Z',
        updatedAt: '2026-04-14T00:00:00Z',
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
        postType: 'NORMAL',
        imageUrls: ['https://cdn.example.com/media/cheer/1/61.webp'],
      });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'cheer.png', { type: 'image/png' });
  const result = await submitCheerPost({
    teamId: 'HH',
    content: 'image cheer post',
    files: [file],
  });

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/cheer-61',
    '/api/media/uploads/61/finalize',
    '/api/cheer/posts',
  ]);
  assert.equal(result.uploadedUrls[0], 'media/cheer/1/61.webp');
  assert.equal(result.created.content, 'image cheer post');

  const createBody = JSON.parse(String(requestBodies[3]));
  assert.deepEqual(createBody.images, ['media/cheer/1/61.webp']);
});

test('submitCheerPost preserves linked post types and source IDs', async (t) => {
  const requestBodies: unknown[] = [];
  const responseTypes = ['CHECKIN', 'RECRUITMENT'];
  let callIndex = 0;

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body)));
    const postType = responseTypes[callIndex++];
    return buildJsonResponse({
      id: callIndex,
      teamId: 'LG',
      content: 'linked post',
      author: 'Writer',
      authorHandle: '@writer',
      createdAt: '2026-04-14T00:00:00Z',
      updatedAt: '2026-04-14T00:00:00Z',
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
      postType,
      imageUrls: [],
    }, 201);
  });

  await submitCheerPost({
    teamId: 'LG',
    content: 'checked in',
    files: [],
    postType: 'CHECKIN',
    diaryId: 17,
  });
  await submitCheerPost({
    teamId: 'LG',
    content: 'join us',
    files: [],
    postType: 'RECRUITMENT',
    partyId: 29,
  });

  assert.deepEqual(requestBodies, [
    {
      teamId: 'LG',
      content: 'checked in',
      images: [],
      postType: 'CHECKIN',
      diaryId: 17,
    },
    {
      teamId: 'LG',
      content: 'join us',
      images: [],
      postType: 'RECRUITMENT',
      partyId: 29,
    },
  ]);
});

test('submitCheerPost rejects present empty and unknown post types before fetch', async (t) => {
  installImageTestDoubles(t);
  let fetchCalls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCalls += 1;
    return buildJsonResponse({}, 201);
  });

  const invalidPayloads = [
    {
      teamId: 'LG',
      content: 'empty',
      files: [new File(['stub'], 'invalid.png', { type: 'image/png' })],
      postType: '',
    },
    { teamId: 'LG', content: 'unknown', files: [], postType: 'FUTURE_TYPE' },
  ] as unknown as Array<Parameters<typeof submitCheerPost>[0]>;

  for (const payload of invalidPayloads) {
    await assert.rejects(() => submitCheerPost(payload), /UNKNOWN_CHEER_POST_TYPE:/);
  }
  assert.equal(fetchCalls, 0);
});
