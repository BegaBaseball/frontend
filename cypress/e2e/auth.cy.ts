/// <reference types="cypress" />

describe('Authentication Flow', () => {
    beforeEach(() => {
        cy.mockAPI();
        cy.visit('/login');
    });

    describe('Login Page', () => {
        it('should display login form', () => {
            cy.get('input[type="email"], input[name="email"]').should('be.visible');
            cy.get('input[type="password"], input[name="password"]').should('be.visible');
            cy.get('button[type="submit"]').should('be.visible');
        });

        it('should show error on invalid credentials', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 401,
                body: { message: 'Invalid credentials' }
            }).as('loginFail');

            cy.get('input[type="email"], input[name="email"]').type('wrong@email.com');
            cy.get('input[type="password"], input[name="password"]').type('wrongpassword');
            cy.get('button[type="submit"]').click();

            cy.wait('@loginFail');
            cy.url().should('include', '/login');
        });

        it('should redirect to home after successful login', () => {
            cy.fixture('user').then((user) => {
                cy.intercept('POST', '**/api/auth/login', {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            accessToken: 'fake-jwt-token',
                            refreshToken: 'fake-refresh-token',
                            ...user.testUser
                        }
                    }
                }).as('loginSuccess');

                // Mock the subsequent /me call which happens after login
                cy.intercept('GET', '**/api/auth/mypage', {
                    statusCode: 200,
                    body: { success: true, data: user.testUser }
                }).as('getMeAfterLogin');

                cy.get('input[type="email"], input[name="email"]').type(user.testUser.email);
                cy.get('input[type="password"], input[name="password"]').type(user.testUser.password);
                cy.get('button[type="submit"]').click();

                cy.wait('@loginSuccess');
                cy.url().should('not.include', '/login');
            });
        });
    });

    describe('Signup Page', () => {
        it('should display signup form', () => {
            cy.visit('/signup');
            cy.get('input[type="email"], input[name="email"]').should('be.visible');
            cy.get('input[type="password"], input[name="password"]').should('be.visible');
        });
    });

    describe('Protected Routes', () => {
        it('should block access to /mypage without login', () => {
            cy.visit('/mypage');
            // Instead of redirecting to /login, it shows a dialog
            cy.contains('로그인 필요').should('be.visible');
        });
    });

    describe('OAuth Buttons', () => {
        it('should display OAuth login options', () => {
            cy.visit('/login');
            // Social login buttons often have icons or specific text
            cy.get('button').filter(':contains("Google"), :contains("Kakao"), :contains("Naver")').should('have.length.at.least', 1);
        });
    });
});
