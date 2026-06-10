export interface CypressAuthUser {
    id: number;
    email: string;
    name: string;
    handle?: string | null;
    favoriteTeam?: string | null;
    role?: string | null;
    hasPassword?: boolean | null;
    profileImageUrl?: string | null;
}

export const AUTH_BOOTSTRAP_META_KEY = 'auth-bootstrap-meta';
export const CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY = 'cypress:skip-public-auth-bootstrap';

export const DEFAULT_CYPRESS_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

interface SeedAuthOptions {
    skipPublicBootstrap?: boolean;
    theme?: 'light' | 'dark';
}

export function toAuthApiUser(user: CypressAuthUser) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        handle: user.handle?.replace(/^@/, '') ?? null,
        favoriteTeam: user.favoriteTeam ?? null,
        role: user.role ?? 'ROLE_USER',
        hasPassword: user.hasPassword ?? true,
        profileImageUrl: user.profileImageUrl ?? null,
    };
}

export function seedCypressAuthState(
    win: Window,
    user: CypressAuthUser,
    token: string = DEFAULT_CYPRESS_AUTH_TOKEN,
    options: SeedAuthOptions = {},
) {
    const authState = {
        state: {
            user,
            isLoggedIn: true,
            isAdmin: user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN',
            isAuthLoading: false,
        },
        version: 0,
    };

    if (options.skipPublicBootstrap) {
        win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
    } else {
        win.sessionStorage.removeItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY);
    }

    win.localStorage.setItem('auth-storage', JSON.stringify(authState));
    win.localStorage.setItem('accessToken', token);
    win.localStorage.setItem('auth-bootstrap-hint', '1');
    win.localStorage.setItem(AUTH_BOOTSTRAP_META_KEY, JSON.stringify({
        version: 1,
        lastSuccessAt: Date.now(),
        lastFailureAt: null,
    }));
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
    if (options.theme) {
        win.localStorage.setItem('kbo-theme', options.theme);
    }
    win.document.cookie = `Authorization=${token}; path=/`;
}
