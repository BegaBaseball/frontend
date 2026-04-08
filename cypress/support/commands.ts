/// <reference types="cypress" />

export {};

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Custom command to login programmatically using a fixture user.
             * @param userType 'user' (default), 'admin', or 'superAdmin'
             */
            login(userType?: 'user' | 'admin' | 'superAdmin'): Chainable<void>;

            /**
             * Custom command to setup default API mocks.
             */
            mockAPI(options?: { skipRankings?: boolean }): Chainable<void>;

            /**
             * Custom command to select by data-testid.
             */
            getBySel(selector: string): Chainable<JQuery<HTMLElement>>;

            /**
             * Custom command to mock follow counts API for public profile.
             */
            mockPublicFollowCounts(
                handle: string,
                body?: {
                    followerCount: number;
                    followingCount: number;
                    isFollowedByMe: boolean;
                    notifyNewPosts: boolean;
                    blockedByMe?: boolean;
                    blockingMe?: boolean;
                }
            ): Chainable<void>;
        }
    }
}

const defaultFollowCounts = {
    followerCount: 10,
    followingCount: 20,
    isFollowedByMe: false,
    notifyNewPosts: false,
    blockedByMe: false,
    blockingMe: false,
};
const AUTH_BOOTSTRAP_META_KEY = 'auth-bootstrap-meta';
const CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY = 'cypress:skip-public-auth-bootstrap';

Cypress.Commands.add('mockPublicFollowCounts', (handle: string, body = defaultFollowCounts) => {
    const normalizedHandle = handle.trim();
    const normalizedHandleWithAt = normalizedHandle.startsWith('@')
        ? normalizedHandle
        : `@${normalizedHandle}`;
    const normalizedHandleWithoutAt = normalizedHandleWithAt.replace(/^@/, '');

    const encodedWithAt = encodeURIComponent(normalizedHandleWithAt);
    const encodedWithoutAt = encodeURIComponent(normalizedHandleWithoutAt);

    const followCountBody = {
        statusCode: 200,
        body: {
            ...defaultFollowCounts,
            ...(body || {}),
        },
    };

    const followCountPatterns = [
        `**/api/users/profile/${normalizedHandleWithAt}/follow-counts*`,
        `**/api/users/profile/${encodedWithAt}/follow-counts*`,
        `**/api/users/profile/${normalizedHandleWithoutAt}/follow-counts*`,
        `**/api/users/profile/${encodedWithoutAt}/follow-counts*`,
        `**/api/users/${normalizedHandleWithAt}/follow-counts*`,
        `**/api/users/${encodedWithAt}/follow-counts*`,
        `**/api/users/${normalizedHandleWithoutAt}/follow-counts*`,
        `**/api/users/${encodedWithoutAt}/follow-counts*`,
    ];

    followCountPatterns.forEach((pattern) => {
        cy.intercept('GET', pattern, followCountBody).as('getFollowCounts');
    });
});

Cypress.Commands.add('login', (userType = 'user') => {
    cy.fixture('user').then((users) => {
        const user = userType === 'admin'
            ? users.adminUser
            : userType === 'superAdmin'
                ? users.superAdminUser
                : users.testUser;
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        // Zustant store persistence structure
        const authState = {
            state: {
                user: user,
                isLoggedIn: true,
                isAdmin: user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN',
                isAuthLoading: false,
            },
            version: 0
        };

        const seedAuthState = (win: Window, options?: { skipPublicBootstrap?: boolean }) => {
            if (options?.skipPublicBootstrap) {
                win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
            } else {
                win.sessionStorage.removeItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY);
            }
            win.localStorage.setItem('auth-storage', JSON.stringify(authState));
            win.localStorage.setItem('accessToken', fakeToken);
            win.localStorage.setItem('auth-bootstrap-hint', '1');
            win.localStorage.setItem(AUTH_BOOTSTRAP_META_KEY, JSON.stringify({
                version: 1,
                lastSuccessAt: Date.now(),
                lastFailureAt: null,
            }));
            win.localStorage.setItem('bega_has_visited', 'true');
            win.localStorage.setItem('bega_dont_show_guide', 'true');
        };

        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    handle: user.handle?.replace(/^@/, ''),
                    favoriteTeam: user.favoriteTeam,
                    role: user.role,
                    hasPassword: user.hasPassword ?? true,
                    profileImageUrl: user.profileImageUrl ?? null,
                },
            },
        }).as('sessionGetMe');

        // Prevent Navbar chat polling from hitting the real backend with a fake JWT,
        // which would trigger auth-session-expired via the axios interceptor.
        cy.intercept('GET', '**/api/chat/my/unread-counts', {
            statusCode: 200,
            body: { success: true, data: 0 },
        });

        // Prevent Navbar notification polling from hitting the real backend during login visit.
        // mockAPI hasn't run yet at this point, so these requests would go unintercepted
        // and potentially flip module-level availability flags in notificationApi.ts.
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 5,
        });
        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: [],
        });

        cy.visit('/', {
            onBeforeLoad(win) {
                seedAuthState(win, { skipPublicBootstrap: true });
            },
        });
        cy.window().then((win) => {
            seedAuthState(win);
        });
        cy.setCookie('Authorization', fakeToken);

        // Mock reissue to prevent loops
        cy.intercept('**/auth/reissue*', {
            statusCode: 200,
            body: { success: true, data: { accessToken: fakeToken } }
        }).as('reissue');
    });
});

Cypress.Commands.add('mockAPI', (options: { skipRankings?: boolean } = {}) => {
    // Mock reissue usage in mockAPI
    cy.intercept('**/auth/reissue*', {
        statusCode: 200,
        body: { success: true, data: { accessToken: 'fake-new-token' } }
    }).as('reissue');

    // Current User
    cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: {
            success: true,
            data: {
                id: 123,
                email: 'test@example.com',
                name: 'TestUser',
                handle: 'testuser',
                favoriteTeam: 'HH',
                role: 'ROLE_USER',
                hasPassword: true,
                profileImageUrl: null,
            }
        }
    }).as('getMe');

    cy.intercept('GET', '**/api/users/*/social-verified', {
        statusCode: 200,
        body: { success: true, data: true },
    }).as('getSocialVerified');

    // Teams
    cy.fixture('teams').then((teams) => {
        cy.intercept('**/api/kbo/teams', {
            statusCode: 200,
            body: teams
        }).as('getTeams');

        // Backward compatibility for some tests
        cy.intercept('**/api/teams', {
            statusCode: 200,
            body: ['Hanwha Eagles', 'LG Twins']
        }).as('getTeamsOld');
    });

    // Connected Providers
    cy.intercept('**/api/auth/providers', {
        statusCode: 200,
        body: {
            success: true,
            data: [
                { provider: 'GOOGLE', connected: true, email: 'test@example.com' },
                { provider: 'KAKAO', connected: false }
            ]
        }
    }).as('getProviders');

    // Stadiums
    cy.intercept('**/api/stadiums', {
        statusCode: 200,
        body: [
            { stadiumId: '1', stadiumName: '대전 한화생명 이글스파크', lat: 36.317, lng: 127.429 },
            { stadiumId: '2', stadiumName: '잠실 야구장', lat: 37.512, lng: 127.072 }
        ]
    }).as('getStadiums');

    cy.intercept('GET', '**/api/stadiums/favorites', {
        statusCode: 200,
        body: { stadiumIds: [] },
    }).as('getStadiumFavorites');

    // Team franchise metadata (used by Cheer page)
    cy.intercept('GET', '**/api/franchises/code/*', {
        statusCode: 200,
        body: {
            id: 1,
            name: 'Hanwha Eagles',
            originalCode: 'HH',
            currentCode: 'HH',
            webUrl: 'https://www.hanwhaeagles.co.kr',
        },
    }).as('getFranchiseByCode');

    cy.intercept('GET', '**/api/franchises/*/metadata', {
        statusCode: 200,
        body: {
            summary: '한화 이글스 공식 팀 소개',
            homeStadium: '대전 한화생명 이글스파크',
            foundedYear: 1986,
            owner: '한화그룹',
        },
    }).as('getFranchiseMetadata');

    // Home Page Stats/Schedules
    cy.intercept('**/api/kbo/schedule*', {
        statusCode: 200,
        body: []
    }).as('getHomeSchedule');

    cy.intercept('**/api/home/bootstrap*', {
        statusCode: 200,
        body: {
            selectedDate: '2026-03-15',
            leagueStartDates: {
                regularSeasonStart: '2026-03-22',
                postseasonStart: '2026-10-06',
                koreanSeriesStart: '2026-10-26',
            },
            navigation: {
                hasPrev: true,
                hasNext: true,
                prevGameDate: '2026-03-14',
                nextGameDate: '2026-03-16',
            },
            games: [],
            scheduledGamesWindow: [],
        },
    }).as('getHomeBootstrap');

    cy.intercept('**/api/home/widgets*', {
        statusCode: 200,
        body: {
            hotCheerPosts: [],
            featuredMates: [],
            rankingSnapshot: {
                rankingSeasonYear: 2025,
                rankingSourceMessage: '2025 시즌 순위 데이터',
                isOffSeason: true,
                rankings: [],
            },
        },
    }).as('getHomeWidgets');

    cy.intercept('**/api/kbo/schedule/navigation*', {
        statusCode: 200,
        body: { hasPrev: true, hasNext: true, prevGameDate: '2024-01-01', nextGameDate: '2024-01-02' }
    }).as('getNav');

    cy.intercept('**/api/kbo/league-start-dates', {
        statusCode: 200,
        body: { regularSeasonStart: '2025-03-22', postseasonStart: '2025-10-06', koreanSeriesStart: '2025-10-26' }
    }).as('getLeagueDates');

    cy.intercept('**/api/prediction/stats/me', {
        statusCode: 200,
        body: {
            success: true,
            data: {
                accuracy: 0,
                streak: 0,
                totalPredictions: 0,
                correctPredictions: 0
            }
        }
    }).as('getPredictionStats');

    cy.intercept('**/api/predictions/my-votes*', {
        statusCode: 200,
        body: { votes: {} }
    }).as('getMyVotes');

    cy.intercept('**/api/matches*', (req) => {
        if (req.url.includes('/api/matches/bounds')) {
            req.reply({
                statusCode: 200,
                body: {
                    hasData: true,
                    earliestGameDate: '2026-01-01',
                    latestGameDate: '2026-12-31',
                },
            });
            return;
        }

        req.reply({
            statusCode: 200,
            body: [],
        });
    }).as('getMatches');

    if (!options.skipRankings) {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: {
                rankingSeasonYear: 2026,
                rankingSourceMessage: '2026 시즌 데이터가 아직 집계되지 않았습니다.',
                isOffSeason: false,
                rankings: [],
            }
        }).as('getRankings');
    }

    // Navbar Mocks
    cy.intercept('**/api/notifications/my', {
        statusCode: 200,
        body: []
    }).as('getMyNotifications');

    cy.intercept('**/api/users/email-to-id*', {
        statusCode: 200,
        body: {
            success: true,
            data: 123,
        },
    }).as('getEmailToId');

    cy.intercept('**/api/notifications/user/*/unread-count', {
        statusCode: 200,
        body: 5,
    }).as('getUnreadCountByUser');

    cy.intercept('**/api/notifications/my/unread-count', {
        statusCode: 200,
        body: 5
    }).as('getUnreadCount');

    cy.intercept('**/api/chat/my/unread-counts', {
        statusCode: 200,
        body: {
            success: true,
            data: 0,
        },
    }).as('getChatUnreadCounts');

    // Follow counts: support both id-based and profile-handle routes with one alias.
    const followCountDefaults = {
        followerCount: 10,
        followingCount: 20,
        isFollowedByMe: false,
        notifyNewPosts: false,
        blockedByMe: false,
        blockingMe: false,
    };

    cy.intercept('GET', /\/api\/users\/(?:\d+|profile\/[^/?#]+|[^/?#]+)\/follow-counts\/?(?:\?.*)?$/, {
        statusCode: 200,
        body: followCountDefaults,
    }).as('getFollowCountsDefault');

    // User Profile (Public) - supports both /api/users/profile/${handle} and /api/users/${handleOrId}
    cy.intercept('GET', /\/api\/users\/(?:profile\/[^/?#]+|[^/?#]+)\/?(?:\?.*)?$/, {
        statusCode: 200,
        body: {
            success: true,
            data: {
                id: 123,
                email: 'test@example.com',
                name: 'TestUser',
                handle: 'testuser',
                favoriteTeam: 'HH',
                role: 'ROLE_USER'
            }
        }
    }).as('getUserProfile');

    // user-parties (Mate history)
    cy.intercept('**/api/mate/my-parties', {
        statusCode: 200,
        body: []
    }).as('getMyParties');

    // Sessions (Account Settings)
    cy.intercept('**/api/auth/sessions', {
        statusCode: 200,
        body: {
            success: true,
            data: [
                {
                    id: 'session-1',
                    deviceLabel: 'Cypress Test Browser',
                    deviceType: 'desktop',
                    browser: 'Electron',
                    os: 'Mac OS',
                    ip: '127.0.0.1',
                    lastActiveAt: new Date().toISOString(),
                    isCurrent: true
                }
            ]
        }
    }).as('getSessions');

    // Nickname check
    cy.intercept('**/api/auth/check-name*', {
        statusCode: 200,
        body: {
            success: true,
            data: {
                available: true,
                message: '사용 가능한 닉네임입니다.',
                normalized: 'testuser'
            }
        }
    }).as('checkName');

    // Blocked users
    cy.intercept('**/api/users/me/blocked*', {
        statusCode: 200,
        body: {
            success: true,
            data: {
                content: [],
                last: true,
                totalElements: 0,
                totalPages: 0,
                number: 0,
                size: 20
            }
        }
    }).as('getBlockedUsers');

    // Default AI coach fallback — per-test intercepts override this (LIFO)
    cy.intercept('POST', '**/coach/analyze*', {
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'event: done\ndata: [DONE]\n\n',
    }).as('coachAnalyzeDefault');

});

Cypress.Commands.add('getBySel', (selector) => {
    return cy.get(`[data-testid=${selector}]`);
});

export { };
