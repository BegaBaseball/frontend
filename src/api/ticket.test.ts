import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeTicket } from './ticket';

const resolveRequestUrl = (input: string | URL | Request): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

test('analyzeTicket은 multipart payload로 티켓 OCR endpoint를 호출한다', async (t) => {
  let requestedUrl = '';
  let requestBody: BodyInit | null | undefined;
  let requestHeaders: HeadersInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = resolveRequestUrl(input);
    requestBody = init?.body;
    requestHeaders = init?.headers;

    return new Response(JSON.stringify({
      date: '2026-04-01',
      time: '18:30',
      stadium: '잠실야구장',
      homeTeam: 'LG',
      awayTeam: '두산',
      section: '1루',
      row: 'A',
      seat: '12',
      peopleCount: 2,
      price: 30000,
      reservationNumber: 'ABC123',
      gameId: 1,
      verificationToken: 'token',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const file = new File(['ticket'], 'ticket.png', { type: 'image/png' });
  const response = await analyzeTicket(file);

  assert.equal(requestedUrl, '/api/tickets/analyze');
  assert.ok(requestBody instanceof FormData);
  assert.equal(response.stadium, '잠실야구장');

  if (requestHeaders && !Array.isArray(requestHeaders) && !(requestHeaders instanceof Headers)) {
    assert.equal(requestHeaders['Content-Type'], undefined);
  }
});
