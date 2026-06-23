/// <reference types="cypress" />

import {
    DEFAULT_CYPRESS_AUTH_TOKEN,
    seedCypressAuthState,
    toAuthApiUser,
    type CypressAuthUser,
} from '../support/auth';

type ApiCall = {
    activation: string;
    label: string;
    method: string;
    path: string;
    status: number;
};

type ActivationMetric = {
    label: string;
    elapsedMs: number;
    requestCount: number;
    requests: ApiCall[];
};

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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

const diaryEntries = [
    {
        id: 1,
        date: '2026-06-12',
        type: 'attended',
        emoji: '😊',
        emojiName: 'happy',
        winningName: 'WIN',
        gameId: 11,
        memo: '대전 홈 응원석 분위기 최고였습니다.',
        photos: [],
        team: '한화 vs LG',
        stadium: '대전 한화생명 볼파크',
        section: '1루',
        block: '101',
        seatRow: 'A',
        seatNumber: '12',
        ticketVerified: true,
    },
];

const diaryStatistics = {
    totalCount: 3,
    totalWins: 2,
    totalLosses: 1,
    totalDraws: 0,
    winRate: 67,
    monthlyCount: 2,
    yearlyCount: 3,
    yearlyWins: 2,
    yearlyWinRate: 67,
    mostVisitedStadium: '대전 한화생명 볼파크',
    mostVisitedCount: 2,
    monthlyVisitCounts: { 6: 2, 7: 1 },
    stadiumVisitCounts: { '대전 한화생명 볼파크': 2, 잠실: 1 },
    homeVisitCount: 2,
    awayVisitCount: 1,
    scheduledCount: 0,
    happiestMonth: '6월',
    happiestCount: 2,
    firstDiaryDate: '2026-06-01',
    cheerPostCount: 4,
    mateParticipationCount: 2,
    currentWinStreak: 1,
    longestWinStreak: 2,
    currentLossStreak: 0,
    opponentWinRates: {
        LG: { wins: 1, losses: 0, draws: 0, winRate: 100 },
        두산: { wins: 1, losses: 1, draws: 0, winRate: 50 },
    },
    bestOpponent: 'LG',
    worstOpponent: '두산',
    dayOfWeekStats: {},
    luckyDay: '금요일',
    earnedBadges: ['FIRST_VISIT'],
};

const games = [
    {
        id: 11,
        homeTeam: 'HH',
        awayTeam: 'LG',
        stadium: '대전 한화생명 볼파크',
        score: '5:3',
        date: '2026-06-12',
    },
];

const myCheerPost = {
    id: 9001,
    teamId: 'HH',
    teamColor: '#f37321',
    content: '오늘 응원석 분위기 최고였습니다.',
    author: 'TestUser',
    authorId: 123,
    authorHandle: 'testuser',
    authorProfileImageUrl: null,
    authorTeamId: 'HH',
    createdAt: '2026-06-12T12:00:00Z',
    updatedAt: '2026-06-12T12:00:00Z',
    comments: 2,
    likes: 7,
    likeCount: 7,
    commentCount: 2,
    bookmarkCount: 1,
    repostCount: 0,
    views: 35,
    liked: false,
    bookmarkedByMe: false,
    isOwner: true,
    repostedByMe: false,
    isHot: false,
    postType: 'NORMAL',
    imageUrls: [],
};

const mateHistoryParty = {
    id: 501,
    hostId: 222,
    hostHandle: 'host',
    teamId: 'HH',
    cheeringSide: 'HOME',
    stadium: '대전 한화생명 볼파크',
    gameDate: '2026-06-20',
    gameTime: '18:30',
    section: '1루 응원석',
    currentParticipants: 2,
    maxParticipants: 4,
    status: 'COMPLETED',
    description: '응원석 메이트',
    homeTeam: 'HH',
    awayTeam: 'LG',
};

const pageOf = <T,>(content: T[], size = 20) => ({
    content,
    last: true,
    totalPages: content.length > 0 ? 1 : 0,
    totalElements: content.length,
    size,
    number: 0,
});

const routePath = (url: string) => {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
};

describe('MyPage tab backend health', () => {
    let apiCalls: ApiCall[];
    let activationMetrics: ActivationMetric[];
    let currentActivation: string;
    let activationStartedAt: number;

    const recordRoute = (
        label: string,
        method: RouteMethod,
        urlMatcher: string | RegExp,
        body: unknown,
        delay = 0,
    ) => {
        cy.intercept(method, urlMatcher, (req) => {
            const statusCode = 200;
            apiCalls.push({
                activation: currentActivation,
                label,
                method,
                path: routePath(req.url),
                status: statusCode,
            });
            req.reply({
                statusCode,
                delay,
                body,
            });
        }).as(label);
    };

    const startActivation = (label: string) => {
        cy.then(() => {
            currentActivation = label;
            activationStartedAt = Date.now();
        });
    };

    const recordActivation = (label: string) => {
        cy.then(() => {
            const requests = apiCalls.filter((call) => call.activation === label);
            activationMetrics.push({
                label,
                elapsedMs: Date.now() - activationStartedAt,
                requestCount: requests.length,
                requests,
            });
        });
    };

    const measureActivation = (
        label: string,
        action: () => void,
        ready: () => void,
        waitAliases: string[] = [],
    ) => {
        startActivation(label);
        action();
        waitAliases.forEach((alias) => cy.wait(alias));
        ready();
        recordActivation(label);
    };

    const seedAuth = (win: Window) => {
        seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
            theme: 'dark',
        });
    };

    const visibleScreen = (label: string) => {
        cy.get(`section[data-screen-label="${label}"]`, { timeout: 20000 }).should('be.visible');
    };

    beforeEach(() => {
        apiCalls = [];
        activationMetrics = [];
        currentActivation = 'bootstrap';
        activationStartedAt = Date.now();

        cy.mockAPI();
        cy.failOnUnexpectedApi401();

        recordRoute('healthGetMyPageProfile', 'GET', '**/auth/mypage*', {
            success: true,
            data: toAuthApiUser(authUser),
        });
        recordRoute('healthGetFollowCounts', 'GET', '**/api/users/me/follow-counts*', {
            followerCount: 10,
            followingCount: 20,
            isFollowedByMe: false,
            notifyNewPosts: false,
            blockedByMe: false,
            blockingMe: false,
        });
        recordRoute('healthGetDiaryEntries', 'GET', '**/api/diary/entries*', diaryEntries, 80);
        recordRoute('healthGetDiaryStatistics', 'GET', '**/api/diary/statistics*', diaryStatistics, 120);
        recordRoute('healthGetDiaryGames', 'GET', '**/api/diary/games*', games, 70);
        recordRoute('healthGetMyCheerPosts', 'GET', '**/api/cheer/me/posts*', pageOf([myCheerPost], 10), 90);
        recordRoute('healthGetMateHistory', 'GET', '**/api/parties/my/history*', pageOf([mateHistoryParty]), 100);
        recordRoute('healthGetProviders', 'GET', '**/api/auth/providers*', {
            success: true,
            data: [
                { provider: 'GOOGLE', connected: true, email: 'test@google.com' },
                { provider: 'KAKAO', connected: false },
            ],
        }, 60);
        recordRoute('healthGetSessions', 'GET', '**/api/auth/sessions*', {
            success: true,
            data: [
                {
                    id: 'session-1',
                    deviceLabel: 'Cypress Test Browser',
                    deviceType: 'desktop',
                    browser: 'Electron',
                    os: 'macOS',
                    ip: '127.0.0.1',
                    lastActiveAt: '2026-06-12T10:00:00Z',
                    isCurrent: true,
                },
            ],
        }, 80);
        recordRoute('healthGetSecurityEvents', 'GET', '**/api/auth/security-events*', {
            success: true,
            data: [
                {
                    id: 1,
                    eventType: 'LOGIN_SUCCESS',
                    message: '새 기기 로그인',
                    occurredAt: '2026-06-12T10:00:00Z',
                    deviceLabel: 'Cypress Test Browser',
                    browser: 'Electron',
                    os: 'macOS',
                    ip: '127.0.0.1',
                },
            ],
        }, 80);
        recordRoute('healthGetBlockedUsers', 'GET', '**/api/users/me/blocked*', {
            success: true,
            data: pageOf([], 20),
        }, 50);
    });

    it('records backend calls and activation timing for each MyPage tab', () => {
        startActivation('seasonLog');
        cy.visit('/mypage', { onBeforeLoad: seedAuth });
        cy.wait('@healthGetMyPageProfile');
        cy.wait('@healthGetFollowCounts');
        cy.wait('@healthGetDiaryEntries');
        cy.wait('@healthGetDiaryStatistics');
        visibleScreen('시즌 로그');
        recordActivation('seasonLog');

        measureActivation(
            'statsFromSeasonLog',
            () => cy.get('[data-testid="mypage-toggle-stats"]').first().click(),
            () => visibleScreen('나의 기록'),
        );

        measureActivation(
            'cheerPosts',
            () => cy.get('[data-testid="mypage-cheer-posts-nav"]').click(),
            () => visibleScreen('응원석 글'),
            ['@healthGetMyCheerPosts'],
        );

        measureActivation(
            'mateHistoryAll',
            () => cy.get('[data-testid="mypage-mate-history-nav"]').click(),
            () => visibleScreen('메이트 내역'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'mateHistoryCompleted',
            () => cy.get('[data-testid="mypage-mate-history-tabs"]').contains('button', '완료됨').click(),
            () => cy.get('[data-testid="mypage-mate-card"]').should('be.visible'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'mateHistoryOngoing',
            () => cy.get('[data-testid="mypage-mate-history-tabs"]').contains('button', '진행 중').click(),
            () => cy.get('[data-testid="mypage-mate-card"]').should('be.visible'),
            ['@healthGetMateHistory'],
        );

        measureActivation(
            'settingsHome',
            () => cy.contains('button', '설정').click(),
            () => visibleScreen('설정'),
        );

        measureActivation(
            'accountSettings',
            () => cy.contains('button', '계정 설정').click(),
            () => {
                cy.contains('h2', '계정 설정', { timeout: 20000 }).should('be.visible');
                cy.contains('최근 보안 활동', { timeout: 20000 }).should('be.visible');
            },
            ['@healthGetProviders', '@healthGetSessions', '@healthGetSecurityEvents'],
        );

        measureActivation(
            'blockedUsers',
            () => {
                cy.contains('button', '설정').click();
                cy.contains('button', '차단한 사용자').click();
            },
            () => cy.contains('차단한 사용자가 없습니다.', { timeout: 20000 }).should('be.visible'),
            ['@healthGetBlockedUsers'],
        );

        measureActivation(
            'diaryEditorDirect',
            () => cy.visit('/mypage?view=diaryEditor&date=2026-06-12', { onBeforeLoad: seedAuth }),
            () => cy.get('[data-testid="diary-editor-calendar-card"]', { timeout: 20000 }).should('be.visible'),
            [
                '@healthGetMyPageProfile',
                '@healthGetFollowCounts',
                '@healthGetDiaryEntries',
                '@healthGetDiaryGames',
            ],
        );

        cy.then(() => {
            const failedCalls = apiCalls.filter((call) => call.status >= 400);
            expect(failedCalls, 'failed MyPage backend calls').to.deep.equal([]);

            const statsMetric = activationMetrics.find((metric) => metric.label === 'statsFromSeasonLog');
            expect(statsMetric?.requestCount, 'stats tab should reuse season log diary/statistics cache').to.equal(0);

            const settingsMetric = activationMetrics.find((metric) => metric.label === 'settingsHome');
            expect(settingsMetric?.requestCount, 'settings home should not trigger backend fetches').to.equal(0);

            const profileCallCountByActivation = (label: string) =>
                activationMetrics
                    .find((metric) => metric.label === label)
                    ?.requests.filter((call) => call.path === '/api/auth/mypage').length ?? 0;

            expect(
                profileCallCountByActivation('seasonLog'),
                'season log should not add a redundant MyPage profile fetch after auth bootstrap',
            ).to.be.lte(2);
            expect(
                profileCallCountByActivation('diaryEditorDirect'),
                'diary editor should not add a redundant MyPage profile fetch after auth bootstrap',
            ).to.be.lte(2);
        });

        cy.writeFile('reports/mypage-tab-health.json', {
            generatedAt: new Date().toISOString(),
            route: '/mypage',
            activations: activationMetrics,
        });
    });
});
