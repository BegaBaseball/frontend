import assert from 'node:assert/strict';
import test from 'node:test';

import { uploadMediaFile } from './media';

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
      naturalWidth = 1024;
      naturalHeight = 768;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:mock-media');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
};

test('uploadMediaFile는 init, PUT, finalize 순서로 direct upload를 완료한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestInits: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestInits.push(init ?? {});

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 51,
          uploadUrl: 'https://object.example.com/upload/chat-51',
          stagingObjectKey: 'media/staging/chat/1/51-chat.png',
          expiresAt: '2026-04-14T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/png',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/chat-51') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/51/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 51,
          storagePath: 'media/chat/1/51.webp',
          publicUrl: 'https://cdn.example.com/media/chat/1/51.webp',
        },
      });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'chat.png', { type: 'image/png' });
  const response = await uploadMediaFile('CHAT', file);

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/chat-51',
    '/api/media/uploads/51/finalize',
  ]);
  assert.equal(requestInits[0]?.method, 'POST');
  assert.equal(requestInits[1]?.method, 'PUT');
  assert.equal(requestInits[2]?.method, 'POST');
  assert.equal(response.storagePath, 'media/chat/1/51.webp');
});

test('uploadMediaFile는 direct upload 실패 시 asset cleanup을 호출한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestInits: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestInits.push(init ?? {});

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 77,
          uploadUrl: 'https://object.example.com/upload/diary-77',
          stagingObjectKey: 'media/staging/diary/1/77-photo.jpg',
          expiresAt: '2026-04-14T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/jpeg',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/diary-77') {
      return new Response(null, { status: 500 });
    }

    if (requestUrl.endsWith('/api/media/uploads/77')) {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'photo.jpg', { type: 'image/jpeg' });

  await assert.rejects(
    () => uploadMediaFile('DIARY', file),
    {
      message: '스토리지 업로드 실패 (500)',
    },
  );

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/diary-77',
    '/api/media/uploads/77',
  ]);
  assert.equal(requestInits[2]?.method, 'DELETE');
});
