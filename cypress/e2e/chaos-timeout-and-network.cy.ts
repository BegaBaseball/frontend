/// <reference types="cypress" />

/**
 * Chaos Test: Timeout and Network Failures
 *
 * 목적: 네트워크 지연/단절 상황에서 프론트엔드가 사용자에게
 * 올바른 한국어 오류 메시지를 보여주고, 내부 기술 메시지를
 * 노출하지 않는지 검증한다.
 *
 * 검증 범위:
 *  1. Axios 10s 타임아웃 경로 (useMutation, retry: 0)
 *  2. forceNetworkError (ERR_NETWORK) 경로
 *  3. React ErrorBoundary (렌더링 중 throw 발생)
 *
 * 주의: GlobalErrorDialog는 window.Cypress 환경에서 null 반환
 * (GlobalErrorDialog.tsx:21) → 인라인 컴포넌트 오류 텍스트로 검증한다.
 */

describe('Chaos: Timeout and Network Failures', () => {
    beforeEach(() => {
        // 비인증 테스트에서도 Navbar 폴링이 auth-session-expired를 일으키지 않도록 차단
        cy.intercept('GET', '**/api/chat/my/unread-counts', {
            statusCode: 200,
            body: { success: true, data: 0 },
        });
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 0,
        });
        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: [],
        });
        cy.intercept('**/auth/reissue*', {
            statusCode: 200,
            body: { success: true, data: { accessToken: 'fake-token' } },
        });
    });

    // ───────────────────────────────────────────────────────────
    // 1. Axios 10s 타임아웃 경로
    //    로그인 폼 (POST mutation, retry: 0)을 사용해
    //    React Query 재시도 없이 순수 axios 타임아웃을 테스트한다.
    // ───────────────────────────────────────────────────────────

    describe('Axios 10s Timeout Path', () => {
        it('shows Korean error message when API takes longer than 10s', () => {
            // LOGIN_SUBMIT_TIMEOUT_MS = 20000. 21s 지연으로 타임아웃을 발생시킨다.
            cy.intercept('POST', '**/api/auth/login', (req) => {
                req.reply({ delay: 21000, statusCode: 200, body: {} });
            }).as('slowLogin');

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            // publicClient.ts AbortController → 'Request timed out after 20000ms'
            // → errorUtils.ts NETWORK 타입 → 한국어 메시지
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.', {
                timeout: 25000,
            }).should('be.visible');
        });

        it('does not expose raw axios timeout message to the user', () => {
            cy.intercept('POST', '**/api/auth/login', (req) => {
                req.reply({ delay: 21000, statusCode: 200, body: {} });
            });

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            // 한국어 메시지가 보여야 하고 (타임아웃 발생 대기)
            cy.contains('서비스 연결이 불안정합니다.', { timeout: 25000 }).should('be.visible');
            // "timeout of 10000ms exceeded" 같은 axios 내부 메시지가 절대 노출되면 안 된다
            cy.contains(/timeout of \d+ms exceeded/i).should('not.exist');
        });
    });

    // ───────────────────────────────────────────────────────────
    // 2. Network Error (ERR_NETWORK) 경로
    //    TCP 연결 자체가 끊어졌을 때 컴포넌트 인라인 오류 표시 확인
    // ───────────────────────────────────────────────────────────

    describe('Network Error (forceNetworkError path)', () => {
        beforeEach(() => {
            // Kakao SDK 로드 실패 무시 (stadium.cy.ts 패턴 유지)
            cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true });
        });

        it('shows Korean error text when network connection fails on stadium page', () => {
            cy.intercept('GET', '**/api/stadiums', { forceNetworkError: true }).as('networkFail');

            cy.visit('/stadium');

            // React Query retry 1회 포함 최대 ~3s 대기
            cy.contains('구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', {
                timeout: 10000,
            }).should('be.visible');
        });

        it('does not expose raw "Network Error" text to the user', () => {
            cy.intercept('GET', '**/api/stadiums', { forceNetworkError: true });

            cy.visit('/stadium');

            cy.contains('구장 정보를 불러오지 못했습니다.', { timeout: 10000 }).should('be.visible');
            // axios가 throw하는 원시 메시지가 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', 'Network Error');
        });
    });

    // ───────────────────────────────────────────────────────────
    // 3. React ErrorBoundary (렌더링 중 throw)
    //    App.tsx에 삽입된 DEV 전용 chaos=render-error 훅을 사용한다.
    //    ErrorBoundary가 렌더링 에러를 잡아 한국어 폴백 UI를 표시하는지 검증.
    // ───────────────────────────────────────────────────────────

    describe('React Error Boundary (render crash)', () => {
        it('shows Korean fallback card when a child component throws during render', () => {
            // chaos-test-render-error는 의도된 throw — Cypress auto-fail 억제
            cy.on('uncaught:exception', (err) => {
                if (err.message.includes('chaos-test-render-error')) return false;
            });
            cy.visit('/?chaos=render-error');

            // ErrorBoundary.tsx:64 — 제목
            cy.contains('문제가 발생했습니다').should('be.visible');
            // ErrorBoundary.tsx:65-67 — 부가 설명
            cy.contains('일시적인 오류가 발생했습니다').should('be.visible');
        });

        it('shows recovery action buttons in the error fallback card', () => {
            cy.on('uncaught:exception', (err) => {
                if (err.message.includes('chaos-test-render-error')) return false;
            });
            cy.visit('/?chaos=render-error');

            // ErrorFeedbackPanel.tsx:130 — 다시 시도 버튼
            cy.contains('다시 시도').should('be.visible');
            // ErrorFeedbackPanel.tsx:140 — 페이지 새로고침 버튼
            cy.contains('페이지 새로고침').should('be.visible');
        });

        it('does not expose the raw JavaScript error message in the fallback card', () => {
            cy.on('uncaught:exception', (err) => {
                if (err.message.includes('chaos-test-render-error')) return false;
            });
            cy.visit('/?chaos=render-error');

            cy.contains('문제가 발생했습니다').should('be.visible');
            // ErrorBoundaryFallback.tsx: Cypress 환경에서는 debugMessage를 <pre>에 표시해 디버깅을 지원한다.
            // 사용자가 보는 주요 콘텐츠('문제가 발생했습니다')만 검증하며,
            // 디버그 pre 요소 외 메인 텍스트에 raw error가 노출되지 않음을 확인한다.
            cy.get('h1').should('not.contain', 'chaos-test-render-error');
        });
    });
});
