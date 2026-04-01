import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchNoticePosts } from './noticePublic';

test('fetchNoticePosts는 공개 공지 목록 경로를 same-origin fetch로 호출한다', async (t) => {
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
          id: 901,
          teamId: 'LG',
          content: '공지 게시글 샘플',
          author: 'Admin',
          authorHandle: 'admin',
          createdAt: '2026-04-01T10:00:00Z',
          updatedAt: '2026-04-01T10:00:00Z',
          likeCount: 3,
          commentCount: 2,
          bookmarkCount: 1,
          repostCount: 0,
          views: 8,
          postType: 'NOTICE',
          imageUrls: [],
        },
      ],
      last: true,
      totalPages: 1,
      totalElements: 1,
      size: 100,
      number: 0,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchNoticePosts();

  assert.equal(response.content[0]?.id, 901);
  assert.equal(response.content[0]?.postType, 'NOTICE');
  assert.equal(response.content[0]?.author, 'Admin');
  assert.equal(response.content[0]?.likeCount, 3);
  assert.equal(response.content[0]?.commentCount, 2);
  assert.match(requestUrl, /\/api\/cheer\/posts\?postType=NOTICE&page=0&size=100$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
});
