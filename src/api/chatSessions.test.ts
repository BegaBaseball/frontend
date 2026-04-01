import assert from 'node:assert/strict';
import test from 'node:test';

import api from './axios';
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

test('listChatSessions는 세션 목록을 반환하고 글로벌 에러 핸들러를 건너뛴다', async (t) => {
  let capturedConfig: unknown;

  t.mock.method(api, 'get', async (_url: string, config: unknown) => {
    capturedConfig = config;
    return ({
      data: {
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
      },
    }) as never;
  });

  const sessions = await listChatSessions();

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionId, 101);
  assert.deepEqual(capturedConfig, {
    skipGlobalErrorHandler: true,
  });
});

test('createChatSession은 새 세션을 생성하고 응답 payload를 반환한다', async (t) => {
  let capturedArgs: unknown[] = [];

  t.mock.method(api, 'post', async (...args: unknown[]) => {
    capturedArgs = args;
    return ({
      data: {
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
      },
    }) as never;
  });

  const session = await createChatSession();

  assert.equal(session.sessionId, 102);
  assert.deepEqual(capturedArgs, [
    '/ai/chat/sessions',
    undefined,
    { skipGlobalErrorHandler: true },
  ]);
});

test('saveUserChatMessage와 saveAssistantChatMessage는 각 payload를 그대로 전달한다', async (t) => {
  const capturedPosts: unknown[][] = [];

  t.mock.method(api, 'post', async (...args: unknown[]) => {
    capturedPosts.push(args);

    if (capturedPosts.length === 1) {
      return ({
        data: {
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
        },
      }) as never;
    }

    return ({
      data: {
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
      },
    }) as never;
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
    [
      '/ai/chat/sessions/102/messages/user',
      { content: '질문입니다.' },
      { skipGlobalErrorHandler: true },
    ],
    [
      '/ai/chat/sessions/102/messages/assistant',
      {
        content: '서비스 점검 중이거나 일시적인 오류입니다.',
        status: 'ERROR',
        errorCode: 'STATUS_503',
      },
      { skipGlobalErrorHandler: true },
    ],
  ]);
});

test('getChatSessionMessages, 즐겨찾기 조회/변경, 세션 삭제는 올바른 엔드포인트를 사용한다', async (t) => {
  const getCalls: unknown[][] = [];
  const postCalls: unknown[][] = [];
  const deleteCalls: unknown[][] = [];

  t.mock.method(api, 'get', async (...args: unknown[]) => {
    getCalls.push(args);

    if (String(args[0]).includes('/messages')) {
      return ({
        data: {
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
        },
      }) as never;
    }

    return ({
      data: {
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
      },
    }) as never;
  });

  t.mock.method(api, 'post', async (...args: unknown[]) => {
    postCalls.push(args);
    return ({
      data: {
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
      },
    }) as never;
  });

  t.mock.method(api, 'delete', async (...args: unknown[]) => {
    deleteCalls.push(args);
    return undefined as never;
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
    [
      '/ai/chat/sessions/102/messages',
      { skipGlobalErrorHandler: true },
    ],
    [
      '/ai/chat/favorites',
      { skipGlobalErrorHandler: true },
    ],
  ]);
  assert.deepEqual(postCalls, [
    [
      '/ai/chat/favorites/5002',
      undefined,
      { skipGlobalErrorHandler: true },
    ],
  ]);
  assert.deepEqual(deleteCalls, [
    [
      '/ai/chat/favorites/5002',
      { skipGlobalErrorHandler: true },
    ],
    [
      '/ai/chat/sessions/102',
      { skipGlobalErrorHandler: true },
    ],
  ]);
});

test('chat 저장 API는 success/data가 없으면 명시적인 오류를 던진다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      success: false,
      message: '세션을 불러오지 못했습니다.',
    },
  }) as never);

  await assert.rejects(
    () => listChatSessions(),
    {
      message: '세션을 불러오지 못했습니다.',
    },
  );
});
