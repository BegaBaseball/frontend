/// <reference types="cypress" />

/**
 * Chaos Test: Backend Error Propagation to Frontend
 *
 * 목적: 백엔드에서 발생하는 다양한 오류(DB 장애 503, AI 서비스 502/504,
 * 레이트 리밋 429)가 프론트엔드까지 올바르게 전파되고, 사용자에게는
 * 한국어 친화적 메시지만 표시되며 내부 오류 메시지가 노출되지 않는지 검증한다.
 *
 * 검증 범위:
 *  1. DB 장애 → 503 → 컴포넌트 인라인 한국어 오류 + 원시 메시지 숨김
 *  2. 503 후 재시도 시 콘텐츠 복구 (react recovery)
 *  3. AI 서비스 502 → 한국어 폴백
 *  4. 429 레이트 리밋 → 한국어 친화 메시지 + 원시 "Too Many Requests" 숨김
 *
 * 주의: GlobalErrorDialog는 window.Cypress 환경에서 null 반환
 * → 각 컴포넌트의 인라인 오류 상태 텍스트로 검증한다.
 */

describe('Chaos: Backend Error Propagation to Frontend', () => {
    // ───────────────────────────────────────────────────────────
    // 1. DB 장애 → 503 Service Unavailable
    //    GlobalExceptionHandler: TransientDataAccessException → 503
    //    → errorUtils: type SERVER (5xx) → "서비스 연결이 불안정합니다."
    //    → 구장 페이지 인라인 오류: "구장 정보를 불러오지 못했습니다."
    // ───────────────────────────────────────────────────────────

    describe('DB Failure → 503 Propagation', () => {
        beforeEach(() => {
            cy.intercept('GET', 'https://dapi.kakao.com/**', { forceNetworkError: true });
            cy.intercept('**/auth/reissue*', {
                statusCode: 200,
                body: { success: true, data: { accessToken: 'fake-token' } },
            });
        });

        it('stadium page shows Korean inline error on 503 (DB unavailable)', () => {
            cy.intercept('GET', '**/api/stadiums', {
                statusCode: 503,
                body: { message: 'Database connection pool exhausted' },
            }).as('stadiums503');

            cy.visit('/stadium');
            cy.wait('@stadiums503');

            // 컴포넌트 인라인 오류 텍스트가 보여야 한다
            cy.contains('구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.').should('be.visible');
        });

        it('does not leak raw server error message to the user on 503', () => {
            cy.intercept('GET', '**/api/stadiums', {
                statusCode: 503,
                body: { message: 'Database connection pool exhausted' },
            }).as('stadiums503');

            cy.visit('/stadium');
            cy.wait('@stadiums503');

            // 내부 오류 메시지가 절대 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', 'Database connection pool exhausted');
            // 원시 HTTP 상태 코드도 노출되면 안 된다
            cy.get('body').should('not.contain.text', '503');
        });

        it('UI controls are disabled in error state (prevents further broken interactions)', () => {
            cy.intercept('GET', '**/api/stadiums', {
                statusCode: 503,
                body: { message: 'service unavailable' },
            }).as('stadiums503');

            cy.visit('/stadium');
            cy.wait('@stadiums503');

            cy.contains('구장 정보를 불러오지 못했습니다.').should('be.visible');
            // 오류 상태에서 UI 컨트롤이 비활성화되어야 한다 (stadium.cy.ts 기존 패턴)
            cy.get('select').first().should('be.disabled');
        });

        it('recovers and shows content after transient 503 is resolved', () => {
            const stadiums = [
                {
                    stadiumId: 'JAMSIL',
                    stadiumName: '서울 · 잠실야구장',
                    team: 'LG/두산',
                    lat: 37.5122,
                    lng: 127.0719,
                    address: '서울특별시 송파구 올림픽로 25',
                    phone: null,
                },
            ];

            // 첫 번째 페이지 로드는 503 반환
            cy.intercept('GET', '**/api/stadiums', {
                statusCode: 503,
                body: { message: 'service unavailable' },
            }).as('stadiums503');

            cy.visit('/stadium');
            cy.wait('@stadiums503');
            cy.contains('구장 정보를 불러오지 못했습니다.').should('be.visible');

            // 두 번째 로드에서 복구
            cy.intercept('GET', '**/api/stadiums', {
                statusCode: 200,
                body: stadiums,
            }).as('stadiumsRecovered');
            cy.intercept('GET', '**/api/stadiums/JAMSIL/places?category=food', {
                statusCode: 200,
                body: [],
            });

            // 페이지 새로고침으로 복구 시뮬레이션
            cy.reload();
            cy.wait('@stadiumsRecovered');

            // 복구 후 콘텐츠 표시 확인
            cy.contains('서울 · 잠실야구장').should('be.visible');
        });
    });

    // ───────────────────────────────────────────────────────────
    // 2. AI 서비스 장애 → 502 Bad Gateway
    //    AiProxyService: connection refused → ResponseStatusException(502)
    //    → GlobalExceptionHandler → frontend 오류 표시
    //
    //    검증: 로그인 폼을 AI 대신 사용하는 것이 더 안정적이나,
    //    향후 채팅 컴포넌트 인라인 오류 확인으로 전환 가능.
    //    현재는 응답 상태 코드 전파 경로(GlobalExceptionHandler)를
    //    백엔드 단위 테스트(GlobalExceptionHandlerChaosTest)에서 검증하고,
    //    여기서는 프론트엔드 메시지 처리가 "서비스 연결이 불안정합니다."를
    //    보여주는지 확인한다.
    // ───────────────────────────────────────────────────────────

    describe('AI Service Failure → 502/504', () => {
        beforeEach(() => {
            cy.intercept('**/auth/reissue*', {
                statusCode: 200,
                body: { success: true, data: { accessToken: 'fake-token' } },
            });
        });

        it('login form shows Korean fallback when any endpoint returns 502 (Bad Gateway)', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 502,
                body: { message: 'AI upstream connection failed' },
            }).as('login502');

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@login502');

            // 5xx 공통 한국어 메시지가 표시되어야 한다
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            // 내부 AI 오류 메시지가 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', 'AI upstream connection failed');
        });

        it('login form shows Korean fallback on 504 (Gateway Timeout)', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 504,
                body: { message: 'AI upstream request timed out after 180s' },
            }).as('login504');

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@login504');

            // 게이트웨이 타임아웃도 5xx로 분류 → 공통 한국어 메시지
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            // AI 내부 구현 세부 정보 노출 방지
            cy.get('body').should('not.contain.text', '180s');
            cy.get('body').should('not.contain.text', 'timed out');
        });
    });

    // ───────────────────────────────────────────────────────────
    // 3. 레이트 리밋 → 429 Too Many Requests
    //    RateLimitAspect → RateLimitExceededException → 429
    //    → errorUtils: type RATE_LIMIT → "요청이 많습니다."
    //
    //    주의: auth.cy.ts에는 이미 login 429 테스트가 있음.
    //    여기서는 "원시 서버 메시지가 숨겨지는지" 검증에 집중한다.
    // ───────────────────────────────────────────────────────────

    describe('Rate Limit → 429', () => {
        beforeEach(() => {
            cy.intercept('**/auth/reissue*', {
                statusCode: 200,
                body: { success: true, data: { accessToken: 'fake-token' } },
            });
        });

        it('shows Korean rate limit message on 429; hides raw "Too Many Requests"', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 429,
                body: { message: 'Too Many Requests' },
            }).as('login429');

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@login429');

            // 한국어 친화적 메시지 (errorUtils.ts getDefaultErrorMessage RATE_LIMIT)
            cy.contains('요청이 많습니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            // 원시 서버 메시지가 사용자에게 노출되면 안 된다
            cy.get('body').should('not.contain.text', 'Too Many Requests');
        });

        it('shows Korean rate limit message; hides raw 429 status code', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 429,
                body: { message: 'Rate limit exceeded' },
            }).as('login429');

            cy.visit('/login');
            cy.get('input[type="email"], input[name="email"]').type('test@example.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@login429');

            cy.contains('요청이 많습니다.').should('be.visible');
            cy.get('body').should('not.contain.text', '429');
            cy.get('body').should('not.contain.text', 'Rate limit exceeded');
        });
    });
});
