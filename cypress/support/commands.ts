/// <reference types="cypress" />

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Custom command to login programmatically using a fixture user.
             * @param userType 'user' (default) or 'admin'
             */
            login(userType?: 'user' | 'admin'): Chainable<void>;

            /**
             * Custom command to setup default API mocks.
             */
            mockAPI(): Chainable<void>;

            /**
             * Custom command to select by data-testid.
             */
            getBySel(selector: string): Chainable<JQuery<HTMLElement>>;
        }
    }
}

Cypress.Commands.add('login', (userType = 'user') => {
    cy.fixture('user').then((users) => {
        const user = userType === 'admin' ? users.adminUser : users.testUser;
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        // Zustant store persistence structure
        const authState = {
            state: {
                user: user,
                isLoggedIn: true,
                isAdmin: user.role === 'ROLE_ADMIN'
            },
            version: 0
        };

        // NOTE:
        // Set auth state inside AUT window (onBeforeLoad) so cy.session can
        // reliably snapshot/restore it across tests.
        cy.session(`auth-${userType}-v2`, () => {
            cy.visit('/', {
                onBeforeLoad(win) {
                    win.localStorage.setItem('auth-storage', JSON.stringify(authState));
                    win.localStorage.setItem('accessToken', fakeToken);
                    win.localStorage.setItem('bega_has_visited', 'true');
                    win.localStorage.setItem('bega_dont_show_guide', 'true');
                },
            });
            cy.window().then((win) => {
                // Re-assert auth state right before session snapshot is captured.
                win.localStorage.setItem('auth-storage', JSON.stringify(authState));
                win.localStorage.setItem('accessToken', fakeToken);
                win.localStorage.setItem('bega_has_visited', 'true');
                win.localStorage.setItem('bega_dont_show_guide', 'true');
            });
            cy.setCookie('Authorization', fakeToken);
        }, {
            validate: () => {
                cy.window().then((win) => {
                    expect(win.localStorage.getItem('auth-storage')).to.be.a('string');
                });
                cy.getCookie('Authorization').should('exist');
            },
        });

        // Mock reissue to prevent loops
        cy.intercept('**/api/auth/reissue', {
            statusCode: 200,
            body: { success: true, data: { accessToken: fakeToken } }
        }).as('reissue');
    });
});

Cypress.Commands.add('mockAPI', () => {
    // Mock reissue usage in mockAPI
    cy.intercept('**/api/auth/reissue', {
        statusCode: 200,
        body: { success: true, data: { accessToken: 'fake-new-token' } }
    }).as('reissue');

    // Current User
    cy.intercept('GET', '**/api/auth/mypage*', {
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

    cy.intercept('**/api/kbo/rankings/*', {
        statusCode: 200,
        body: []
    }).as('getRankings');

    // Navbar Mocks
    cy.intercept('**/api/users/email-to-id*', {
        statusCode: 200,
        body: { success: true, data: 123 }
    }).as('getEmailToId');

    cy.intercept('**/api/notifications/user/*/unread-count', {
        statusCode: 200,
        body: 5
    }).as('getUnreadCountByUser');

    cy.intercept('**/api/notifications/my', {
        statusCode: 200,
        body: []
    }).as('getMyNotifications');

    cy.intercept('**/api/notifications/my/unread-count', {
        statusCode: 200,
        body: 5
    }).as('getUnreadCount');

    // Follow Counts - NOT wrapped in { success: true, data: ... }
    cy.intercept('**/api/users/*/follow-counts', {
        statusCode: 200,
        body: {
            followerCount: 10,
            followingCount: 20,
            isFollowedByMe: false,
            notifyNewPosts: false
        }
    }).as('getFollowCounts');

    // User Profile (Public) - URL is /users/profile/${handle}
    cy.intercept('**/api/users/profile/*', {
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
