import test from 'node:test';
import assert from 'node:assert/strict';

import worker, {
  buildCanonicalRedirect,
  isApiPath,
  isHtmlNavigation,
  shouldBlockPreviewHost,
} from './index';

test('redirects bare domain to canonical www host with path and query intact', async () => {
  const response = buildCanonicalRedirect(new URL('http://begabaseball.xyz/auth/callback?code=123'));

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://www.begabaseball.xyz/auth/callback?code=123');
});

test('identifies api paths that should not fall through to the SPA', () => {
  assert.equal(isApiPath('/api'), true);
  assert.equal(isApiPath('/api/auth/login'), true);
  assert.equal(isApiPath('/apis'), false);
  assert.equal(isApiPath('/auth/login'), false);
});

test('treats html accept headers as SPA navigations only for get or head requests', () => {
  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/home', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  })), true);

  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/home', {
    method: 'POST',
    headers: { accept: 'text/html,application/xhtml+xml' },
  })), false);

  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/assets/app.js', {
    headers: { accept: '*/*' },
  })), false);
});

test('blocks pages.dev preview hosts in production routing', () => {
  assert.equal(shouldBlockPreviewHost(new URL('https://preview.begabaseball.pages.dev')), true);
  assert.equal(shouldBlockPreviewHost(new URL('https://www.begabaseball.xyz')), false);
});

test('worker redirects bare-domain requests before touching assets', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('https://begabaseball.xyz/mypage?view=accountSettings'),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected');
        },
      },
    },
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://www.begabaseball.xyz/mypage?view=accountSettings');
  assert.equal(assetFetchCount, 0);
});

test('worker returns 404 for pages.dev preview hosts before touching assets', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('https://preview.begabaseball.pages.dev/mypage'),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected');
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(assetFetchCount, 0);
});

test('worker returns 404 for api paths on the frontend host', async () => {
  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/api/auth/login'),
    {
      ASSETS: {
        fetch: async () => new Response('unexpected'),
      },
    },
  );

  assert.equal(response.status, 404);
});

test('worker falls back to index.html for missing html routes', async () => {
  const seenUrls: string[] = [];

  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/protected/route', {
      headers: { accept: 'text/html,application/xhtml+xml' },
    }),
    {
      ASSETS: {
        fetch: async (input) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          seenUrls.push(url);

          if (url.endsWith('/index.html')) {
            return new Response('<html>ok</html>', {
              status: 200,
              headers: { 'content-type': 'text/html' },
            });
          }

          return new Response('missing', { status: 404 });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(seenUrls, [
    'https://www.begabaseball.xyz/protected/route',
    'https://www.begabaseball.xyz/index.html',
  ]);
});
