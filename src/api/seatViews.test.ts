import assert from 'node:assert/strict';
import test from 'node:test';

import { submitDirectSeatViewUpload } from './seatViews';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

const readJsonBody = (body: BodyInit | null | undefined) => {
  if (typeof body !== 'string') {
    throw new Error('Expected JSON request body');
  }
  return JSON.parse(body);
};

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
  t.mock.method(URL, 'createObjectURL', () => 'blob:mock-seat-view');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
};

test('submitDirectSeatViewUpload uploads SEAT_VIEW media before creating seat view', async (t) => {
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
    requestBodies.push(typeof init?.body === 'string' ? readJsonBody(init.body) : null);

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 91,
          uploadUrl: 'https://object.example.com/upload/seat-view-91',
          stagingObjectKey: 'media/staging/seat-view/7/91-seat.webp',
          expiresAt: '2026-07-07T00:00:00Z',
          requiredHeaders: { 'Content-Type': 'image/webp' },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/seat-view-91') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/91/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 91,
          storagePath: 'media/seat-view/7/91.webp',
          publicUrl: 'https://cdn.example.com/media/seat-view/7/91.webp',
        },
      });
    }

    if (requestUrl.endsWith('/api/seat-views')) {
      return buildJsonResponse({
        success: true,
        data: {
          id: 501,
          photoUrl: 'https://cdn.example.com/media/seat-view/7/91.webp',
          storagePath: 'media/seat-view/7/91.webp',
          stadium: 'JAMSIL',
          section: '205블록',
          block: '205',
          seatRow: '10열',
          seatNumber: '12번',
          rating: 5,
          comment: '전광판이 잘 보여요',
          tags: ['전광판 잘 보임'],
          moderationStatus: 'PENDING',
          sourceType: 'SEATMAP_UPLOAD',
        },
      });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['seat-view'], 'seat.webp', { type: 'image/webp' });
  const result = await submitDirectSeatViewUpload({
    file,
    stadium: 'JAMSIL',
    section: '205블록',
    block: '205',
    seatRow: '10열',
    seatNumber: '12번',
    rating: 5,
    comment: '전광판이 잘 보여요',
    tags: ['전광판 잘 보임'],
  });

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/seat-view-91',
    '/api/media/uploads/91/finalize',
    '/api/seat-views',
  ]);
  assert.deepEqual(requestBodies[0], {
    domain: 'SEAT_VIEW',
    fileName: 'seat.webp',
    contentType: 'image/webp',
    contentLength: 9,
    width: 1280,
    height: 720,
  });
  assert.deepEqual(requestBodies[3], {
    storagePath: 'media/seat-view/7/91.webp',
    stadium: 'JAMSIL',
    section: '205블록',
    block: '205',
    seatRow: '10열',
    seatNumber: '12번',
    rating: 5,
    comment: '전광판이 잘 보여요',
    tags: ['전광판 잘 보임'],
  });
  assert.equal(result.id, 501);
  assert.equal(result.moderationStatus, 'PENDING');
});

test('submitDirectSeatViewUpload surfaces backend submit failures after upload', async (t) => {
  installImageTestDoubles(t);
  let cleanupCalled = false;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 92,
          uploadUrl: 'https://object.example.com/upload/seat-view-92',
          stagingObjectKey: 'media/staging/seat-view/7/92-seat.webp',
          expiresAt: '2026-07-07T00:00:00Z',
          requiredHeaders: { 'Content-Type': 'image/webp' },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/seat-view-92') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/92/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 92,
          storagePath: 'media/seat-view/7/92.webp',
          publicUrl: 'https://cdn.example.com/media/seat-view/7/92.webp',
        },
      });
    }

    if (requestUrl.endsWith('/api/seat-views')) {
      return buildJsonResponse({
        success: false,
        message: '별점은 1에서 5 사이여야 합니다.',
      });
    }

    if (requestUrl.endsWith('/api/media/uploads/92') && init?.method === 'DELETE') {
      cleanupCalled = true;
      return buildJsonResponse({ success: true });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['seat-view'], 'seat.webp', { type: 'image/webp' });

  await assert.rejects(
    () => submitDirectSeatViewUpload({
      file,
      stadium: 'JAMSIL',
      rating: 5,
      tags: [],
    }),
    {
      message: '별점은 1에서 5 사이여야 합니다.',
    },
  );
  assert.equal(cleanupCalled, true);
});
