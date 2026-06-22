/// <reference types="cypress" />

/**
 * Chaos Test: Auth Session Resilience
 *
 * 목적: 401 응답이 동시에 여러 개 발생할 때 토큰 재발급 로직의
 * 중복 호출 방지(deduplication)와 세션 만료 UX를 검증한다.
 *
 * 핵심 검증:
 *  1. 동시 401 발생 시 POST /auth/reissue가 정확히 1회만 호출됨
 *     (axios.ts reissueInFlight 가드)
 *  2. 재발급 실패 시 auth-session-expired 이벤트가 정확히 1회만 발생함
 *     (axios.ts hasSessionExpired 가드)
 *  3. 세션 만료 시 원시 401이 아닌 LoginRequiredDialog가 표시됨
 */

describe('Chaos: Auth Session Resilience', () => {
    const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const leaderboardResponse = {
        content: [
            {
                rank: 1,
                userName: '한화스타',
                handle: 'testuser',
                profileImageUrl: null,
                level: 8,
                score: 12500,
                streak: 12,
                rankTitle: 'MAJOR_LEAGUER',
            },
        ],
        totalPages: 1,
        totalElements: 1,
    };
    const myRankResponse = {
        handle: 'testuser',
        userName: 'TestUser',
        rank: 1,
        totalScore: 12500,
        seasonScore: 12500,
        monthlyScore: 6400,
        weeklyScore: 1800,
        level: 8,
        rankTitle: 'MAJOR_LEAGUER',
        currentStreak: 12,
        maxStreak: 18,
        experiencePoints: 640,
        nextLevelExp: 900,
        accuracy: 88.8,
        totalPredictions: 1400,
        correctPredictions: 1242,
    };

    const installLeaderboardSuccessMocks = () => {
        cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
            statusCode: 200,
            body: leaderboardResponse,
        }).as('getLeaderboard');

        cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
            statusCode: 200,
            body: myRankResponse,
        }).as('getMyRank');

        cy.intercept({ method: 'GET', pathname: '/api/leaderboard/hot-streaks' }, {
            statusCode: 200,
            body: [],
        }).as('getHotStreaks');

        cy.intercept({ method: 'GET', pathname: '/api/leaderboard/recent-scores' }, {
            statusCode: 200,
            body: [],
        }).as('getRecentScores');
    };

    // ───────────────────────────────────────────────────────────
    // 1. 동시 401 + 재발급 중복 호출 방지
    //    리더보드 마운트 시 powerups + active powerups가 동시에 401 →
    //    reissueInFlight 가드로 재발급은 1회만 발생해야 한다.
    // ───────────────────────────────────────────────────────────

    describe('Reissue Deduplication (Concurrent 401s)', () => {
        it('issues exactly ONE reissue when powerup endpoints return 401 simultaneously', () => {
            cy.login();
            cy.mockAPI();
            installLeaderboardSuccessMocks();

            // 재발급 호출 횟수 카운터 (LIFO: mockAPI + login의 reissue 인터셉트를 덮어씀)
            let reissueCount = 0;
            cy.intercept('POST', '**/auth/reissue*', (req) => {
                reissueCount++;
                req.reply({
                    statusCode: 200,
                    body: { success: true, data: { accessToken: fakeToken } },
                });
            }).as('reissueCounted');

            let inventoryCallCount = 0;
            cy.intercept('GET', '**/api/leaderboard/powerups', (req) => {
                inventoryCallCount++;
                req.reply(
                    inventoryCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : {
                            statusCode: 200,
                            body: {
                                MAGIC_BAT: 3,
                                GOLDEN_GLOVE: 1,
                                SCOUTER: 2,
                            },
                        }
                );
            }).as('inventory401');

            let activePowerupsCallCount = 0;
            cy.intercept('GET', '**/api/leaderboard/powerups/active', (req) => {
                activePowerupsCallCount++;
                req.reply(
                    activePowerupsCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : { statusCode: 200, body: [] }
                );
            }).as('activePowerups401');

            cy.visit('/leaderboard');

            // 재발급 완료까지 대기
            cy.wait('@reissueCounted', { timeout: 10000 });

            // 핵심 검증: 재발급은 단 1회만 호출되어야 한다
            cy.then(() => {
                expect(reissueCount).to.equal(1);
            });

            // 세션 만료 다이얼로그가 표시되면 안 된다 (재발급 성공)
            cy.get('[role="alertdialog"]').should('not.exist');
        });

        it('retries original request after successful reissue (no session expiry)', () => {
            cy.login();
            cy.mockAPI();
            installLeaderboardSuccessMocks();

            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 200,
                body: { success: true, data: { accessToken: fakeToken } },
            }).as('reissue');

            // /leaderboard는 PublicNavbar를 사용해 unread-counts를 폴링하지 않음.
            // powerups/active는 leaderboard 페이지에서 실제로 호출되는 인증 엔드포인트.
            let activePowerupsCallCount = 0;
            cy.intercept('GET', '**/api/leaderboard/powerups/active', (req) => {
                activePowerupsCallCount++;
                req.reply(
                    activePowerupsCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : { statusCode: 200, body: [] },
                );
            }).as('powerupsActive401');

            cy.visit('/leaderboard');

            // 초기 401 → 재발급 → 재시도 200 순서로 대기 (cy.then() 카운터는 retry 완료 전에 실행되어 레이스 컨디션 발생)
            cy.wait('@powerupsActive401', { timeout: 10000 }); // 초기 401 호출
            cy.wait('@reissue', { timeout: 10000 });           // 재발급 완료
            cy.wait('@powerupsActive401', { timeout: 5000 });  // 재시도 200 호출

            // 재발급 성공 → 세션 만료 다이얼로그가 표시되면 안 된다
            cy.get('[role="alertdialog"]').should('not.exist');
        });
    });

    // ───────────────────────────────────────────────────────────
    // 2. 재발급 실패 시 세션 만료 이벤트 중복 방지
    //    hasSessionExpired 가드로 auth-session-expired는 1회만 발생해야 한다.
    // ───────────────────────────────────────────────────────────

    describe('Session Expiry Event Deduplication', () => {
        it('fires auth-session-expired event exactly once when reissue fails', () => {
            cy.login();
            cy.mockAPI();
            installLeaderboardSuccessMocks();

            // 재발급 실패하도록 덮어씀 (LIFO)
            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 401,
                body: { message: 'Refresh token expired' },
            }).as('reissueFail');

            // 두 요청 모두 401 반환 (항상)
            cy.intercept('GET', '**/api/leaderboard/powerups', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/leaderboard/powerups/active', { statusCode: 401, body: {} });

            // auth-session-expired 이벤트 카운터를 window에 붙인다
            cy.visit('/leaderboard', {
                onBeforeLoad(win) {
                    (win as Window & { __sessionExpiredCount?: number }).__sessionExpiredCount = 0;
                    win.addEventListener('auth-session-expired', () => {
                        (win as Window & { __sessionExpiredCount?: number }).__sessionExpiredCount =
                            ((win as Window & { __sessionExpiredCount?: number }).__sessionExpiredCount ?? 0) + 1;
                    });
                },
            });

            cy.wait('@reissueFail', { timeout: 10000 });

            // 이벤트가 정확히 1회만 발생해야 한다 (hasSessionExpired 가드)
            cy.window()
                .its('__sessionExpiredCount' as never)
                .should('eq', 1);
        });
    });

    // ───────────────────────────────────────────────────────────
    // 3. 세션 만료 UX: LoginRequiredDialog 표시 (원시 401 숨김)
    // ───────────────────────────────────────────────────────────

    describe('Session Expiry UX', () => {
        it('shows login required dialog (not raw 401) when session expires mid-session', () => {
            cy.login();
            cy.mockAPI();
            installLeaderboardSuccessMocks();

            // 재발급 실패
            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 401,
                body: { message: 'Refresh token expired' },
            }).as('reissueFail');

            // powerups 요청을 401로 유도해 세션 만료 트리거
            cy.intercept('GET', '**/api/leaderboard/powerups', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/leaderboard/powerups/active', { statusCode: 401, body: {} });

            cy.visit('/leaderboard');
            cy.wait('@reissueFail', { timeout: 10000 });

            // LoginRequiredDialog 다이얼로그 제목 "로그인 필요"가 표시되어야 한다
            cy.contains('로그인 필요', { timeout: 8000 }).should('be.visible');

            // 원시 HTTP 상태 코드가 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', '401');
            cy.get('body').should('not.contain.text', 'Refresh token expired');
        });
    });
});
