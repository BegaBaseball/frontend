interface AssetsBinding {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const CANONICAL_HOST = 'www.begabaseball.xyz';
const BARE_HOST = 'begabaseball.xyz';
const BLOCKED_PREVIEW_HOST_SUFFIX = '.pages.dev';

function shouldBlockPreviewHost(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'pages.dev' || hostname.endsWith(BLOCKED_PREVIEW_HOST_SUFFIX);
}

function shouldRedirectToCanonicalOrigin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === BARE_HOST
    || (hostname === CANONICAL_HOST && url.protocol !== 'https:');
}

function buildCanonicalRedirect(url: URL): Response {
  const targetUrl = new URL(url.toString());
  targetUrl.protocol = 'https:';
  targetUrl.hostname = CANONICAL_HOST;
  return Response.redirect(targetUrl.toString(), 301);
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function isHtmlNavigation(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
}

async function serveSpaAsset(request: Request, env: Env): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404 || !isHtmlNavigation(request)) {
    return assetResponse;
  }

  const fallbackUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (shouldBlockPreviewHost(url)) {
      return new Response(null, { status: 404 });
    }

    if (shouldRedirectToCanonicalOrigin(url)) {
      return buildCanonicalRedirect(url);
    }

    if (isApiPath(url.pathname)) {
      return new Response(null, { status: 404 });
    }

    return serveSpaAsset(request, env);
  },
};

export {
  buildCanonicalRedirect,
  isApiPath,
  isHtmlNavigation,
  serveSpaAsset,
  shouldBlockPreviewHost,
  shouldRedirectToCanonicalOrigin,
};
