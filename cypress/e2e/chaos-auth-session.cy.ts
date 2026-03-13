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

    // ───────────────────────────────────────────────────────────
    // 1. 동시 401 + 재발급 중복 호출 방지
    //    Home 페이지 마운트 시 schedule + rankings가 동시에 401 →
    //    reissueInFlight 가드로 재발급은 1회만 발생해야 한다.
    // ───────────────────────────────────────────────────────────

    describe('Reissue Deduplication (Concurrent 401s)', () => {
        it('issues exactly ONE reissue when schedule and rankings return 401 simultaneously', () => {
            cy.login();
            cy.mockAPI();

            // 재발급 호출 횟수 카운터 (LIFO: mockAPI + login의 reissue 인터셉트를 덮어씀)
            let reissueCount = 0;
            cy.intercept('POST', '**/auth/reissue*', (req) => {
                reissueCount++;
                req.reply({
                    statusCode: 200,
                    body: { success: true, data: { accessToken: fakeToken } },
                });
            }).as('reissueCounted');

            // 첫 번째 호출은 401, 재발급 후 재시도는 200 반환 (LIFO: mockAPI 덮어씀)
            let scheduleCallCount = 0;
            cy.intercept('GET', '**/api/kbo/schedule*', (req) => {
                scheduleCallCount++;
                req.reply(
                    scheduleCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : { statusCode: 200, body: [] }
                );
            }).as('schedule401');

            let rankingsCallCount = 0;
            cy.intercept('GET', '**/api/kbo/rankings/**', (req) => {
                rankingsCallCount++;
                req.reply(
                    rankingsCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : { statusCode: 200, body: [] }
                );
            }).as('rankings401');

            // Home 페이지로 이동 → schedule + rankings 동시 요청 발생
            cy.visit('/home');

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

            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 200,
                body: { success: true, data: { accessToken: fakeToken } },
            }).as('reissue');

            // Navbar는 항상 unread-counts를 폴링 → 401 → 재발급 → 재시도 200
            let unreadCallCount = 0;
            cy.intercept('GET', '**/api/chat/my/unread-counts*', (req) => {
                unreadCallCount++;
                req.reply(
                    unreadCallCount === 1
                        ? { statusCode: 401, body: {} }
                        : { statusCode: 200, body: { success: true, data: 0 } },
                );
            });

            cy.visit('/home');

            cy.wait('@reissue', { timeout: 10000 });

            // 재발급 성공 → 세션 만료 다이얼로그가 표시되면 안 된다
            cy.get('[role="alertdialog"]').should('not.exist');
            // unread-counts가 최소 2회 호출됨 (초기 401 + 재시도 200)
            cy.then(() => {
                expect(unreadCallCount).to.be.at.least(2);
            });
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

            // 재발급 실패하도록 덮어씀 (LIFO)
            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 401,
                body: { message: 'Refresh token expired' },
            }).as('reissueFail');

            // 두 요청 모두 401 반환 (항상)
            cy.intercept('GET', '**/api/kbo/schedule*', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/kbo/rankings/**', { statusCode: 401, body: {} });

            // auth-session-expired 이벤트 카운터를 window에 붙인다
            cy.visit('/home', {
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

            // 재발급 실패
            cy.intercept('POST', '**/auth/reissue*', {
                statusCode: 401,
                body: { message: 'Refresh token expired' },
            }).as('reissueFail');

            // schedule/rankings를 401로 유도해 세션 만료 트리거
            cy.intercept('GET', '**/api/kbo/schedule*', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/kbo/rankings/**', { statusCode: 401, body: {} });

            cy.visit('/home');
            cy.wait('@reissueFail', { timeout: 10000 });

            // LoginRequiredDialog 다이얼로그 제목 "로그인 필요"가 표시되어야 한다
            cy.contains('로그인 필요', { timeout: 8000 }).should('be.visible');

            // 원시 HTTP 상태 코드가 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', '401');
            cy.get('body').should('not.contain.text', 'Refresh token expired');
        });
    });
});
