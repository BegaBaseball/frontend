const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

const normalizeRelativePath = (value: string): string => {
    const normalized = value.trim().replace(/\/+$/, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const ensureApiPath = (url: string): string => {
    if (url === '') {
        return '/api';
    }

    const withApiPath = url.endsWith('/api') ? url : `${url}/api`;
    if (withApiPath === '/api') {
        return '/api';
    }

    return withApiPath;
};

const isLoopbackHost = (host: string): boolean => LOOPBACK_HOSTS.has(host);

const isLoopbackHostName = (host: string): boolean => isLoopbackHost(host);

const shouldUseRelativeApiBase = (pageHost: string, targetHost: string): boolean => {
    // Same-loopback and missing page host both indicate local direct-backend calls,
    // so prefer same-origin /api to keep CORS/proxy behavior stable.
    if (!pageHost) {
        return isLoopbackHostName(targetHost);
    }

    return isLoopbackHostName(pageHost) && isLoopbackHostName(targetHost);
};

export const getApiBaseUrl = (value = import.meta.env.VITE_API_BASE_URL): string => {
    // Cypress should always use same-origin path for stable stubs
    if (typeof window !== 'undefined' && (window as Window & { Cypress?: unknown }).Cypress) {
        return '/api';
    }

    const fallback = '/api';
    const raw = (value ?? '').trim();

    if (!raw) {
        return fallback;
    }

    const isAbsolute = /^https?:\/\//i.test(raw);
    if (!isAbsolute) {
        return normalizeRelativePath(ensureApiPath(raw));
    }

    try {
        const target = new URL(raw);
        const pageHost = typeof window !== 'undefined' ? window.location.hostname : '';

        if (shouldUseRelativeApiBase(pageHost, target.hostname)) {
            return fallback;
        }

        const path = target.pathname ? target.pathname.replace(/\/+$/, '') : '';
        const base = `${target.protocol}//${target.host}`;
        return ensureApiPath(`${base}${path || '/api'}`);
    } catch {
        return fallback;
    }
};
