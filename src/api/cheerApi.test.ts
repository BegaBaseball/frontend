import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import { fetchComments, fetchPosts, uploadPostImages } from './cheerApi';

test('fetchPosts는 공개 응답에서 authorId 없이 cheer post를 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
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
    },
  }) as never);

  const response = await fetchPosts();
  const post = response.content[0];

  assert.equal(post?.authorHandle, '@slug');
  assert.equal(post?.authorId, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(post ?? {}, 'authorId'), false);
  assert.equal(post?.originalPost?.authorHandle, '@embedded');
  assert.equal(post?.originalPost && Object.prototype.hasOwnProperty.call(post.originalPost, 'authorId'), false);
});

test('fetchComments는 공개 응답에서 authorEmail 없이 댓글을 정규화한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
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
    },
  }) as never);

  const response = await fetchComments(1);
  const comment = response.content[0];

  assert.equal(comment?.authorHandle, '@commenter');
  assert.equal(Object.prototype.hasOwnProperty.call(comment ?? {}, 'authorEmail'), false);
});

test('uploadPostImages는 string[]와 PostImageDto[] 응답을 모두 URL 배열로 정규화한다', async (t) => {
  const responses = [
    {
      data: [
        {
          id: 1,
          storagePath: 'images/1.webp',
          mimeType: 'image/webp',
          bytes: 1234,
          isThumbnail: false,
          url: 'https://cdn.example.com/1.webp',
        },
      ],
    },
    {
      data: ['https://cdn.example.com/legacy-1.webp', 'https://cdn.example.com/legacy-2.webp'],
    },
  ];

  let callIndex = 0;
  t.mock.method(api, 'post', async () => responses[callIndex++] as never);

  const file = new File(['hello'], 'hello.png', { type: 'image/png' });
  const first = await uploadPostImages(1, [file]);
  const second = await uploadPostImages(1, [file]);

  assert.deepEqual(first, ['https://cdn.example.com/1.webp']);
  assert.deepEqual(second, ['https://cdn.example.com/legacy-1.webp', 'https://cdn.example.com/legacy-2.webp']);
});
