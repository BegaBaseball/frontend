/// <reference types="cypress" />

import {
    DEFAULT_CYPRESS_AUTH_TOKEN,
    seedCypressAuthState,
    toAuthApiUser,
    type CypressAuthUser,
} from '../support/auth';

const authUser: CypressAuthUser = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
};

const diaryStatistics = {
    totalCount: 12,
    totalWins: 8,
    totalLosses: 4,
    totalDraws: 0,
    winRate: 67,
    monthlyCount: 3,
    yearlyCount: 12,
    yearlyWins: 8,
    yearlyWinRate: 67,
    mostVisitedStadium: '홈구장',
    mostVisitedCount: 5,
    monthlyVisitCounts: { 6: 3 },
    stadiumVisitCounts: { 홈구장: 5, 원정구장: 2, 중립구장: 1 },
    homeVisitCount: 7,
    awayVisitCount: 5,
    scheduledCount: 0,
    happiestMonth: '6월',
    happiestCount: 3,
    firstDiaryDate: '2026-06-01',
    cheerPostCount: 2,
    mateParticipationCount: 1,
    currentWinStreak: 2,
    longestWinStreak: 4,
    currentLossStreak: 0,
    opponentWinRates: {},
    bestOpponent: null,
    worstOpponent: null,
    dayOfWeekStats: {},
    luckyDay: '토요일',
    earnedBadges: ['ticket', 'flame', 'map-pin'],
};

const notifications = [
    {
        id: 1,
        type: 'APPLICATION_RECEIVED',
        title: '파티 신청 접수',
        message: '새 신청이 도착했습니다.',
        isRead: false,
        createdAt: '2026-06-12T12:00:00Z',
        relatedId: null,
    },
];

const connectedProviders = [
    {
        provider: 'GOOGLE',
        providerId: 'google-123',
        email: 'test.google@example.com',
        connectedAt: '2026-06-10T09:00:00Z',
    },
];

const deviceSessions = [
    {
        id: 'session-current',
        sessionName: 'Mac Chrome',
        deviceLabel: 'Mac Chrome',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        lastActiveAt: '2026-06-12T12:05:00Z',
        lastSeenAt: '2026-06-12T12:05:00Z',
        isCurrent: true,
        isRevoked: false,
        ip: '127.0.0.1',
    },
];

const securityEvents = [
    {
        id: 10,
        eventType: 'LOGIN_SUCCESS',
        occurredAt: '2026-06-12T12:05:00Z',
        deviceLabel: 'Mac Chrome',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        ip: '127.0.0.1',
        message: '새 기기 로그인',
    },
];

const pageOf = <T,>(content: T[]) => ({
    content,
    last: true,
    totalPages: content.length > 0 ? 1 : 0,
    totalElements: content.length,
    size: 20,
    number: 0,
});

const seedAuth = (win: Window) => {
    seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
        skipPublicBootstrap: true,
        theme: 'dark',
    });
};

const setupAuthenticatedMocks = () => {
    cy.mockAPI();
    cy.failOnUnexpectedApi401();

    cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: {
            success: true,
            data: toAuthApiUser(authUser),
        },
    }).as('getMyPageProfile');

    cy.intercept('GET', '**/api/users/me/follow-counts*', {
        statusCode: 200,
        body: {
            followerCount: 10,
            followingCount: 20,
            isFollowedByMe: false,
            notifyNewPosts: false,
            blockedByMe: false,
            blockingMe: false,
        },
    }).as('getMyFollowCounts');

    cy.intercept('GET', '**/api/diary/entries*', {
        statusCode: 200,
        body: [],
    }).as('getDiaryEntries');

    cy.intercept('GET', '**/api/diary/statistics*', {
        statusCode: 200,
        body: diaryStatistics,
    }).as('getDiaryStatistics');

    cy.intercept('GET', '**/api/notifications/my', {
        statusCode: 200,
        body: notifications,
    }).as('getNotifications');

    cy.intercept('GET', '**/api/auth/providers*', {
        statusCode: 200,
        body: {
            success: true,
            data: connectedProviders,
        },
    }).as('getConnectedProviders');

    cy.intercept('GET', '**/api/auth/sessions*', {
        statusCode: 200,
        body: {
            success: true,
            data: deviceSessions,
        },
    }).as('getDeviceSessions');

    cy.intercept('GET', '**/api/auth/security-events*', {
        statusCode: 200,
        body: {
            success: true,
            data: securityEvents,
        },
    }).as('getSecurityEvents');
};

describe('MyPage more menu backend connections', () => {
    beforeEach(() => {
        setupAuthenticatedMocks();
    });

    it('opens alerts from the MyPage more menu using the notification API flow', () => {
        cy.visit('/mypage?view=badges', { onBeforeLoad: seedAuth });
        cy.get('[data-testid="mypage-badge-catalog"]', { timeout: 20000 }).should('be.visible');

        cy.get('[data-testid="mypage-season-sidebar-more"]')
            .contains('button', '알림')
            .click();

        cy.url().should('include', 'view=alerts');
        cy.wait('@getNotifications');
        cy.get('[data-testid="mypage-alerts-section"]').should('be.visible');
        cy.contains('파티 신청 접수').should('be.visible');
    });

    it('loads the badge catalog view from the diary statistics API', () => {
        cy.visit('/mypage?view=badges', { onBeforeLoad: seedAuth });

        cy.wait('@getDiaryStatistics');
        cy.get('[data-testid="mypage-badge-catalog"]').should('be.visible');
        cy.contains('직관 기록').should('be.visible');
        cy.contains('3/5').should('be.visible');
        cy.get('[data-testid="mypage-badge-showcase"]')
            .find('[data-testid="mypage-badge-orb"]')
            .should('have.length', 5);
    });

    it('loads connected accounts and account security from the MyPage backend flow', () => {
        cy.visit('/mypage?view=accountSettings', { onBeforeLoad: seedAuth });

        cy.wait('@getConnectedProviders');
        cy.contains('계정 설정', { timeout: 20000 }).should('be.visible');
        cy.contains('로그인 연동 관리').should('be.visible');
        cy.contains('Google').should('be.visible');
        cy.contains('연동됨').should('be.visible');
        cy.contains('test.google@example.com').should('be.visible');

        cy.contains('기기 및 보안 활동을 불러오는 중입니다.', { timeout: 20000 })
            .scrollIntoView();
        cy.wait('@getDeviceSessions');
        cy.wait('@getSecurityEvents');
        cy.contains('Mac Chrome').should('be.visible');
        cy.contains('새 기기 로그인').should('be.visible');
    });

    it('redirects /mypage/:handle to the public /profile/:handle backend flow', () => {
        cy.intercept('GET', /\/api\/users\/profile\/(%40|@)?connected-user(?:\?.*)?$/, {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    name: 'Connected User',
                    handle: '@connected-user',
                    favoriteTeam: 'HH',
                    profileImageUrl: null,
                    bio: '공개 프로필입니다.',
                    cheerPoints: 120,
                },
            },
        }).as('getPublicProfile');
        cy.mockPublicFollowCounts('connected-user');
        cy.intercept('GET', '**/api/cheer/user/connected-user/posts*', {
            statusCode: 200,
            body: pageOf([]),
        }).as('getPublicPosts');

        cy.visit('/mypage/connected-user', { onBeforeLoad: seedAuth });

        cy.location('pathname').should('eq', '/profile/@connected-user');
        cy.wait('@getPublicProfile');
        cy.wait('@getPublicPosts');
        cy.contains('Connected User', { timeout: 20000 }).should('be.visible');
        cy.contains('@connected-user').should('be.visible');
        cy.get('[data-testid="mypage-season-sidebar"]').should('not.exist');
    });
});
