import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addChatFavorite,
  createChatSession,
  deleteChatSession,
  getChatSessionMessages,
  listChatFavorites,
  listChatSessions,
  removeChatFavorite,
  saveAssistantChatMessage,
  saveUserChatMessage,
} from './chatSessions';
import { getApiBaseUrl } from './apiBase';

const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

test('listChatSessions는 세션 목록을 반환하고 글로벌 에러 핸들러를 건너뛴다', async (t) => {
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
      success: true,
      data: [
        {
          sessionId: 101,
          title: '첫 질문',
          messageCount: 2,
          latestMessagePreview: '응답 미리보기',
          createdAt: '2026-03-22T12:00:00.000Z',
          updatedAt: '2026-03-22T12:01:00.000Z',
          lastMessageAt: '2026-03-22T12:01:00.000Z',
        },
      ],
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const sessions = await listChatSessions();

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionId, 101);
  assert.equal(requestUrl, buildApiUrl('/ai/chat/sessions'));
  assert.equal(requestInit?.method, 'GET');
  assert.equal(requestInit?.credentials, 'include');
});

test('createChatSession은 새 세션을 생성하고 응답 payload를 반환한다', async (t) => {
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
      success: true,
      data: {
        sessionId: 102,
        title: '새 대화',
        messageCount: 0,
        latestMessagePreview: null,
        createdAt: '2026-03-22T12:00:00.000Z',
        updatedAt: '2026-03-22T12:00:00.000Z',
        lastMessageAt: '2026-03-22T12:00:00.000Z',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const session = await createChatSession();

  assert.equal(session.sessionId, 102);
  assert.equal(requestUrl, buildApiUrl('/ai/chat/sessions'));
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, undefined);
});

test('saveUserChatMessage와 saveAssistantChatMessage는 각 payload를 그대로 전달한다', async (t) => {
  const capturedPosts: Array<{ url: string; body: string | null | undefined }> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    capturedPosts.push({ url, body: typeof init?.body === 'string' ? init.body : undefined });

    if (capturedPosts.length === 1) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          messageId: 5001,
          sessionId: 102,
          role: 'USER',
          status: 'COMPLETED',
          content: '질문입니다.',
          cancelled: false,
          favorite: false,
          createdAt: '2026-03-22T12:00:00.000Z',
          updatedAt: '2026-03-22T12:00:00.000Z',
        },
      }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        messageId: 5002,
        sessionId: 102,
        role: 'ASSISTANT',
        status: 'ERROR',
        content: '서비스 점검 중이거나 일시적인 오류입니다.',
        cancelled: false,
        errorCode: 'STATUS_503',
        favorite: false,
        createdAt: '2026-03-22T12:00:05.000Z',
        updatedAt: '2026-03-22T12:00:05.000Z',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const userMessage = await saveUserChatMessage(102, '질문입니다.');
  const assistantMessage = await saveAssistantChatMessage(102, {
    content: '서비스 점검 중이거나 일시적인 오류입니다.',
    status: 'ERROR',
    errorCode: 'STATUS_503',
  });

  assert.equal(userMessage.role, 'USER');
  assert.equal(assistantMessage.role, 'ASSISTANT');
  assert.deepEqual(capturedPosts, [
    {
      url: buildApiUrl('/ai/chat/sessions/102/messages/user'),
      body: JSON.stringify({ content: '질문입니다.' }),
    },
    {
      url: buildApiUrl('/ai/chat/sessions/102/messages/assistant'),
      body: JSON.stringify({
        content: '서비스 점검 중이거나 일시적인 오류입니다.',
        status: 'ERROR',
        errorCode: 'STATUS_503',
      }),
    },
  ]);
});

test('getChatSessionMessages, 즐겨찾기 조회/변경, 세션 삭제는 올바른 엔드포인트를 사용한다', async (t) => {
  const getCalls: string[] = [];
  const postCalls: string[] = [];
  const deleteCalls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const method = init?.method ?? 'GET';

    if (method === 'GET') {
      getCalls.push(url);
      if (url.includes('/messages')) {
        return new Response(JSON.stringify({
          success: true,
          data: [
            {
              messageId: 5001,
              sessionId: 102,
              role: 'USER',
              status: 'COMPLETED',
              content: '질문입니다.',
              cancelled: false,
              favorite: false,
              createdAt: '2026-03-22T12:00:00.000Z',
              updatedAt: '2026-03-22T12:00:00.000Z',
            },
          ],
        }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: [
          {
            messageId: 5002,
            sessionId: 102,
            sessionTitle: '첫 질문',
            content: '저장한 답변입니다.',
            prompt: '질문입니다.',
            favoritedAt: '2026-03-22T12:00:05.000Z',
            messageCreatedAt: '2026-03-22T12:00:05.000Z',
          },
        ],
      }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    if (method === 'POST') {
      postCalls.push(url);
      return new Response(JSON.stringify({
        success: true,
        data: {
          messageId: 5002,
          sessionId: 102,
          sessionTitle: '첫 질문',
          content: '저장한 답변입니다.',
          prompt: '질문입니다.',
          favoritedAt: '2026-03-22T12:00:05.000Z',
          messageCreatedAt: '2026-03-22T12:00:05.000Z',
        },
      }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    deleteCalls.push(url);
    return new Response(null, { status: 204 });
  });

  const messages = await getChatSessionMessages(102);
  const favorites = await listChatFavorites();
  const favorite = await addChatFavorite(5002);
  await removeChatFavorite(5002);
  await deleteChatSession(102);

  assert.equal(messages.length, 1);
  assert.equal(favorites.length, 1);
  assert.equal(favorite.messageId, 5002);
  assert.deepEqual(getCalls, [
    buildApiUrl('/ai/chat/sessions/102/messages'),
    buildApiUrl('/ai/chat/favorites'),
  ]);
  assert.deepEqual(postCalls, [
    buildApiUrl('/ai/chat/favorites/5002'),
  ]);
  assert.deepEqual(deleteCalls, [
    buildApiUrl('/ai/chat/favorites/5002'),
    buildApiUrl('/ai/chat/sessions/102'),
  ]);
});

test('chat 저장 API는 success/data가 없으면 명시적인 오류를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: false,
    message: '세션을 불러오지 못했습니다.',
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  await assert.rejects(
    () => listChatSessions(),
    {
      message: '세션을 불러오지 못했습니다.',
    },
  );
});
