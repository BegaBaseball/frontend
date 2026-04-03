import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchGames, fetchSeatViews, uploadDiaryImages } from './diary';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchGames는 인증 same-origin fetch로 날짜 쿼리를 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse([
      {
        id: 1,
        homeTeam: 'LG',
        awayTeam: 'SS',
        stadium: '잠실야구장',
        date: '2026-04-02',
      },
    ]);
  });

  const response = await fetchGames('2026-04-02');

  assert.equal(response[0]?.stadium, '잠실야구장');
  assert.match(requestUrl, /\/api\/diary\/games\?date=2026-04-02$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'GET');
});

test('uploadDiaryImages는 multipart 결과를 photos/candidates로 정규화한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      data: {
        photos: ['https://cdn.example.com/photo.jpg'],
        candidates: [
          {
            id: 11,
            storagePath: 'seat-view.jpg',
            previewUrl: 'https://cdn.example.com/preview.jpg',
            sourceType: 'DIARY_UPLOAD',
            aiSuggestedLabel: 'SEAT_VIEW',
            aiConfidence: 0.93,
            shareEligible: true,
          },
        ],
      },
    });
  });

  const file = new File(['stub'], 'seat-view.jpg', { type: 'image/jpeg' });
  const response = await uploadDiaryImages(17, [{ file, sourceType: 'DIARY_UPLOAD' }]);

  assert.match(requestUrl, /\/api\/diary\/17\/images$/);
  assert.equal(requestInit?.method, 'POST');
  assert.ok(requestInit?.body instanceof FormData);
  assert.equal(response.photos[0], 'https://cdn.example.com/photo.jpg');
  assert.equal(response.candidates[0]?.id, 11);
});

test('fetchSeatViews는 공개 same-origin fetch로 쿼리스트링을 구성한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse([
      {
        photoUrl: 'https://cdn.example.com/view.jpg',
        stadium: '잠실야구장',
        section: '1루 내야',
        block: null,
        diaryDate: '2026-04-01',
      },
    ]);
  });

  const response = await fetchSeatViews('JAMSIL', '1루 내야', 12);

  assert.equal(response[0]?.section, '1루 내야');
  assert.match(requestUrl, /\/api\/diary\/seat-views\?stadium=JAMSIL&section=1%EB%A3%A8\+%EB%82%B4%EC%95%BC&limit=12$/);
  assert.equal(requestInit?.credentials, 'include');
});
