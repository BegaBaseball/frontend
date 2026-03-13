/// <reference types="cypress" />

const visitAsGuest = (path: string) => {
    cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
    cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

    cy.visit(path, {
        onBeforeLoad: (win) => {
            win.localStorage.clear();
            win.sessionStorage.clear();
        },
    });
};

const accountSettingsRedirect = '/mypage?view=accountSettings';

describe('Login CTA redirect preservation', () => {
    it('preserves the landing page as redirect target', () => {
        visitAsGuest('/');

        cy.get('[data-testid="landing-header-login"]').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2F');
    });

    it('preserves the current page from the desktop navbar login button', () => {
        cy.viewport(1280, 800);
        visitAsGuest('/privacy');

        cy.contains('button', '로그인').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fprivacy');
    });

    it('preserves the current page from the mobile navbar login button', () => {
        cy.viewport(390, 844);
        visitAsGuest('/terms');

        cy.get('button[aria-label="메뉴 열기"]').click();
        cy.contains('button', '로그인').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fterms');
    });

    it('stores the current mate chat page as the pending redirect on a protected route', () => {
        visitAsGuest('/mate/888/chat');

        cy.location('pathname').should('eq', '/mate/888/chat');
        cy.window()
            .its('sessionStorage')
            .invoke('getItem', 'pendingLoginRedirect')
            .should('eq', '/mate/888/chat');
    });

    it('preserves account settings redirect from the account deletion recovery page', () => {
        cy.intercept('GET', '**/api/auth/account/deletion/recovery?token=recovery-token', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    scheduledFor: '2026-03-20T09:00:00',
                },
            },
        }).as('getRecoveryInfo');

        visitAsGuest('/account/deletion/recovery?token=recovery-token&redirect=%2Fmypage%3Fview%3DaccountSettings');
        cy.wait('@getRecoveryInfo');

        cy.contains('로그인 화면으로').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', `?redirect=${encodeURIComponent(accountSettingsRedirect)}`);
    });

    it('preserves account settings redirect after cancelling account deletion', () => {
        cy.intercept('GET', '**/api/auth/account/deletion/recovery?token=recovery-token', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    scheduledFor: '2026-03-20T09:00:00',
                },
            },
        }).as('getRecoveryInfo');
        cy.intercept('POST', '**/api/auth/account/deletion/recovery', {
            statusCode: 200,
            body: {
                success: true,
                message: '계정 삭제 예약이 취소되었습니다.',
            },
        }).as('recoverAccount');

        visitAsGuest('/account/deletion/recovery?token=recovery-token');
        cy.wait('@getRecoveryInfo');

        cy.contains('탈퇴 예약 취소하기').click();
        cy.wait('@recoverAccount');
        cy.contains('로그인하기').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', `?redirect=${encodeURIComponent(accountSettingsRedirect)}`);
    });
});
