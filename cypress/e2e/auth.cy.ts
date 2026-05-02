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

        it('should show friendly message on server failure without raw axios text', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 500,
                body: { message: 'Request failed with status code 500' }
            }).as('loginServerFail');

            cy.get('input[type="email"], input[name="email"]').type('broken@email.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@loginServerFail');
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains('Request failed with status code 500').should('not.exist');
        });

        it('should show friendly message on rate limit', () => {
            cy.intercept('POST', '**/api/auth/login', {
                statusCode: 429,
                body: { message: 'Too Many Requests' }
            }).as('loginRateLimit');

            cy.get('input[type="email"], input[name="email"]').type('busy@email.com');
            cy.get('input[type="password"], input[name="password"]').type('Test1234!');
            cy.get('button[type="submit"]').click();

            cy.wait('@loginRateLimit');
            cy.contains('요청이 많습니다. 잠시 후 다시 시도해주세요.').should('be.visible');
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
                cy.intercept('GET', '**/auth/mypage*', {
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

        it('should replace login history after successful login so back does not reopen login', () => {
            cy.fixture('user').then((user) => {
                cy.visit('/home');
                cy.contains('button', '로그인').first().click();
                cy.location('pathname').should('eq', '/login');

                cy.intercept('POST', '**/api/auth/login', {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            accessToken: 'fake-jwt-token',
                            refreshToken: 'fake-refresh-token',
                            ...user.testUser,
                        },
                    },
                }).as('loginSuccessHistoryReplace');

                cy.intercept('GET', '**/auth/mypage*', {
                    statusCode: 200,
                    body: { success: true, data: user.testUser },
                }).as('getMeAfterHistoryReplace');

                cy.get('input[type="email"], input[name="email"]').type(user.testUser.email);
                cy.get('input[type="password"], input[name="password"]').type(user.testUser.password);
                cy.get('button[type="submit"]').click();

                cy.wait('@loginSuccessHistoryReplace');
                cy.wait('@getMeAfterHistoryReplace');
                cy.location('pathname').should('eq', '/home');

                cy.go('back');
                cy.location('pathname').should('eq', '/home');
                cy.get('input[type="email"], input[name="email"]').should('not.exist');
            });
        });

        it('should keep the user signed in after reloading a protected page while bootstrap reissues the session', () => {
            cy.fixture('user').then((user) => {
                let profileRequestCount = 0;

                cy.intercept('POST', '**/api/auth/login', {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            accessToken: 'fake-jwt-token',
                            refreshToken: 'fake-refresh-token',
                            ...user.testUser,
                        },
                    },
                }).as('loginSuccessForReload');

                cy.intercept('GET', '**/auth/mypage*', (req) => {
                    profileRequestCount += 1;

                    if (profileRequestCount === 1) {
                        req.alias = 'getMeAfterLoginForReload';
                        req.reply({
                            statusCode: 200,
                            body: { success: true, data: user.testUser },
                        });
                        return;
                    }

                    if (profileRequestCount === 2) {
                        req.alias = 'getMeExpiredAfterReload';
                        req.reply({
                            statusCode: 401,
                            body: { success: false, code: 'TOKEN_EXPIRED', message: 'Unauthorized' },
                        });
                        return;
                    }

                    req.alias = 'getMeRecoveredAfterReload';
                    req.reply({
                        delay: 900,
                        statusCode: 200,
                        body: { success: true, data: user.testUser },
                    });
                });

                cy.intercept('POST', '**/auth/reissue*', {
                    statusCode: 200,
                    body: { success: true },
                }).as('reissueAfterReload');

                cy.visit('/login?redirect=%2Fmypage');
                cy.get('input[type="email"], input[name="email"]').type(user.testUser.email);
                cy.get('input[type="password"], input[name="password"]').type(user.testUser.password);
                cy.get('button[type="submit"]').click();

                cy.wait('@loginSuccessForReload');
                cy.wait('@getMeAfterLoginForReload');
                cy.location('pathname').should('eq', '/mypage');

                cy.reload();

                cy.location('pathname').should('eq', '/mypage');
                cy.wait('@getMeExpiredAfterReload');
                cy.wait('@reissueAfterReload');
                cy.wait('@getMeRecoveredAfterReload');
                cy.location('pathname').should('eq', '/mypage');
                cy.contains('로그인 필요').should('not.exist');
            });
        });

        it('should return to login with a session error when profile verification fails after successful login', () => {
            cy.fixture('user').then((user) => {
                cy.intercept('POST', '**/api/auth/login', {
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            accessToken: 'fake-jwt-token',
                            refreshToken: 'fake-refresh-token',
                            ...user.testUser,
                        },
                    },
                }).as('loginSuccessSessionFailure');

                cy.intercept('GET', '**/auth/mypage*', {
                    statusCode: 401,
                    body: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' },
                }).as('getMeAfterLoginFailure');

                cy.visit('/login?redirect=%2Fprediction%3Fdate%3D2026-03-12');

                cy.get('input[type="email"], input[name="email"]').type(user.testUser.email);
                cy.get('input[type="password"], input[name="password"]').type(user.testUser.password);
                cy.get('button[type="submit"]').click();

                cy.wait('@loginSuccessSessionFailure');
                cy.wait('@getMeAfterLoginFailure');
                cy.location('pathname').should('eq', '/login');
                cy.location('search').should('include', 'redirect=%2Fprediction%3Fdate%3D2026-03-12');
                cy.location('search').should('include', 'error=auth_session_not_established');
                cy.contains('로그인 처리 후 세션을 확인하지 못했습니다. 다시 시도해주세요.').should('be.visible');
            });
        });

        it('should redirect authenticated auth-page entry to the redirect target on direct visit', () => {
            cy.visit('/login?redirect=%2Fmypage', {
                onBeforeLoad(win) {
                    win.localStorage.setItem('auth-bootstrap-hint', '1');
                    win.localStorage.setItem('auth-bootstrap-meta', JSON.stringify({
                        version: 1,
                        lastSuccessAt: 10_000,
                        lastFailureAt: null,
                    }));
                    win.sessionStorage.setItem('pendingLoginRedirect', '/prediction?date=2026-03-12');
                },
            });

            cy.wait('@getMe');
            cy.location('pathname').should('eq', '/mypage');
            cy.location('search').should('eq', '');
            cy.window().its('sessionStorage').invoke('getItem', 'pendingLoginRedirect').should('eq', null);
        });

        it('should preserve redirect when navigating to password reset', () => {
            cy.visit('/login?redirect=%2Fprediction%3Fdate%3D2026-03-12');

            cy.contains('button', '비밀번호를 잊으셨나요?').click();
            cy.location('pathname').should('eq', '/password/reset');
            cy.location('search').should('eq', '?redirect=%2Fprediction%3Fdate%3D2026-03-12');
        });
    });

    describe('Signup Page', () => {
        it('should display signup form', () => {
            cy.visit('/signup');
            cy.get('input[type="email"], input[name="email"]').should('be.visible');
            cy.get('input[type="password"], input[name="password"]').should('be.visible');
        });

        it('should preserve redirect through login, signup, and post-signup login return', () => {
            cy.clock();

            cy.intercept('GET', '**/api/auth/check-handle*', {
                statusCode: 200,
                body: {
                    data: {
                        available: true,
                        normalized: '@redirectuser',
                    },
                },
            }).as('checkHandleAvailable');

            cy.intercept('GET', '**/api/auth/policies/required', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        policies: [
                            { policyType: 'TERMS', version: '2026-02-26', required: true },
                            { policyType: 'PRIVACY', version: '2026-02-26', required: true },
                            { policyType: 'DATA_DISCLAIMER', version: '2026-02-26', required: true },
                        ],
                    },
                },
            }).as('requiredPolicies');

            cy.intercept('POST', '**/api/auth/signup', {
                statusCode: 201,
                body: {
                    success: true,
                    message: '회원가입이 완료되었습니다.',
                },
            }).as('signupSuccess');

            cy.visit('/login?redirect=%2Fprediction%3Fdate%3D2026-03-12');
            cy.contains('button', '회원가입').click();

            cy.location('pathname').should('eq', '/signup');
            cy.location('search').should('eq', '?redirect=%2Fprediction%3Fdate%3D2026-03-12');

            cy.get('input#name').type('테스트유저');
            cy.get('input#handle').clear().type('redirectuser');
            cy.get('input#email').type('redirect_signup_user@example.com');
            cy.get('input#password').type('Test1234!');
            cy.get('input#confirmPassword').type('Test1234!');

            cy.get('select#favoriteTeam').select('LG 트윈스');
            cy.tick(500);
            cy.wait('@checkHandleAvailable');
            cy.get('form').find('button[type="submit"]').first().should('be.enabled');

            cy.contains('button', '회원가입').click();

            cy.wait('@requiredPolicies');
            cy.wait('@signupSuccess');
            cy.contains('회원가입 성공!').should('be.visible');

            cy.tick(3000);
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', '?redirect=%2Fprediction%3Fdate%3D2026-03-12');
        });

        it('should sanitize technical signup errors', () => {
            cy.intercept('GET', '**/api/auth/check-handle*', {
                statusCode: 200,
                body: {
                    data: {
                        available: true,
                        normalized: '@signupfailure',
                    },
                },
            }).as('checkHandleAvailableForFailure');

            cy.intercept('GET', '**/api/auth/policies/required', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        policies: [
                            { policyType: 'TERMS', version: '2026-02-26', required: true },
                            { policyType: 'PRIVACY', version: '2026-02-26', required: true },
                            { policyType: 'DATA_DISCLAIMER', version: '2026-02-26', required: true },
                        ],
                    },
                },
            }).as('requiredPoliciesForFailure');

            cy.intercept('POST', '**/api/auth/signup', {
                statusCode: 500,
                body: {
                    message: 'Request failed with status code 500',
                },
            }).as('signupFailure');

            cy.visit('/signup');

            cy.get('input#name').type('실패테스트유저');
            cy.get('input#handle').clear().type('signupfailure');
            cy.get('input#email').type('signup_failure_user@example.com');
            cy.get('input#password').type('Test1234!');
            cy.get('input#confirmPassword').type('Test1234!');

            cy.get('select#favoriteTeam').select('LG 트윈스');
            cy.wait('@checkHandleAvailableForFailure');
            cy.get('form').find('button[type="submit"]').first().should('be.enabled');

            cy.contains('button', '회원가입').click();

            cy.wait('@requiredPoliciesForFailure');
            cy.wait('@signupFailure');
            cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
            cy.contains('Request failed with status code 500').should('not.exist');
        });
    });

    describe('Protected Routes', () => {
        it('should block access to /mypage without login', () => {
            // Override default mock to simulate not logged in
            cy.intercept('GET', '**/auth/mypage*', {
                statusCode: 401,
                body: { success: false, message: 'Unauthorized' }
            }).as('getMeUnauthorized');

            cy.visit('/mypage');
            cy.wait('@getMeUnauthorized');
            cy.get('[data-testid="prediction-login-required-dialog"]').should('be.visible');
        });

        it('should return to the original protected page after login', () => {
            cy.fixture('user').then((user) => {
                let profileRequestCount = 0;
                let hasLoggedIn = false;
                cy.intercept('GET', '**/auth/mypage*', (req) => {
                    profileRequestCount += 1;

                    if (!hasLoggedIn) {
                        req.alias = 'getMeUnauthorizedOnce';
                        req.reply({
                            statusCode: 401,
                            body: { success: false, message: 'Unauthorized' },
                        });
                        return;
                    }

                    req.alias = 'getMeAfterProtectedLogin';
                    req.reply({
                        statusCode: 200,
                        body: { success: true, data: user.testUser },
                    });
                });

                cy.intercept('POST', '**/api/auth/login', (req) => {
                    hasLoggedIn = true;
                    req.reply({
                        statusCode: 200,
                        body: {
                            success: true,
                            data: {
                                ...user.testUser,
                                cheerPoints: 5,
                            },
                        },
                    });
                }).as('loginSuccess');

                cy.clearCookies();
                cy.visit('/mypage', {
                    onBeforeLoad(win) {
                        win.localStorage.removeItem('auth-storage');
                        win.localStorage.removeItem('accessToken');
                        win.sessionStorage.clear();
                    },
                });
                cy.wait('@getMeUnauthorizedOnce');
                cy.get('[data-testid="prediction-login-required-dialog"]').should('be.visible');
                cy.contains('로그인하러 가기').click();

                cy.location('pathname').should('eq', '/login');
                cy.location('search').should('include', 'redirect=%2Fmypage');

                cy.get('input[type="email"], input[name="email"]').type(user.testUser.email);
                cy.get('input[type="password"], input[name="password"]').type(user.testUser.password);
                cy.get('button[type="submit"]').click();

                cy.wait('@loginSuccess');
                cy.wait('@getMeAfterProtectedLogin');
                cy.location('pathname').should('eq', '/mypage');
            });
        });
    });

    describe('Password Reset', () => {
        it('should preserve redirect when returning to login after reset request', () => {
            cy.intercept('POST', '**/api/auth/password/reset/request', {
                statusCode: 200,
                body: {
                    success: true,
                    message: '비밀번호 재설정 메일을 전송했습니다.',
                },
            }).as('passwordResetRequest');

            cy.visit('/password/reset?redirect=%2Fmypage');
            cy.get('input#email').type('reset-user@example.com');
            cy.contains('button', '재설정 링크 보내기').click();

            cy.wait('@passwordResetRequest');
            cy.contains('button', '로그인으로 돌아가기').click();
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', '?redirect=%2Fmypage');
        });

        it('should preserve stored redirect after password reset confirmation completes', () => {
            cy.intercept('POST', '**/api/auth/password/reset/confirm', {
                statusCode: 200,
                body: {
                    success: true,
                    message: '비밀번호가 변경되었습니다.',
                },
            }).as('passwordResetConfirm');

            cy.visit('/password/reset/confirm?token=reset-token', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/prediction?date=2026-03-12');
                },
            });

            cy.get('input#newPassword').type('Reset1234!');
            cy.get('input#confirmPassword').type('Reset1234!');
            cy.contains('button', '비밀번호 변경').click();

            cy.wait('@passwordResetConfirm');
            cy.contains('button', '로그인하기').click();
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', '?redirect=%2Fprediction%3Fdate%3D2026-03-12');
        });
    });

    describe('OAuth Buttons', () => {
        it('should display OAuth login options', () => {
            cy.visit('/login');
            // Social login buttons often have icons or specific text
            cy.get('button').filter(':contains("Google"), :contains("Kakao"), :contains("Naver")').should('have.length.at.least', 1);
        });
    });

    describe('OAuth Callback', () => {
        it('should redirect to handle-specific mypage after successful callback consumption', () => {
            cy.intercept('GET', '**/api/auth/oauth2/state/state-success', {
                statusCode: 200,
                body: {
                    email: 'slugger@example.com',
                    name: 'Slugger',
                    role: 'ROLE_USER',
                    profileImageUrl: null,
                    favoriteTeam: 'LG',
                    handle: 'slugger',
                },
            }).as('consumeOAuthState');

            cy.visit('/oauth/callback?state=state-success');

            cy.wait('@consumeOAuthState');
            cy.url().should('include', '/mypage/@slugger');
        });

        it('should fall back to generic mypage when callback response has no handle', () => {
            cy.intercept('GET', '**/api/auth/oauth2/state/state-no-handle', {
                statusCode: 200,
                body: {
                    email: 'slugger@example.com',
                    name: 'Slugger',
                    role: 'ROLE_USER',
                    profileImageUrl: null,
                    favoriteTeam: 'LG',
                    handle: null,
                },
            }).as('consumeOAuthStateNoHandle');

            cy.visit('/oauth/callback?state=state-no-handle');

            cy.wait('@consumeOAuthStateNoHandle');
            cy.location('pathname').should('eq', '/mypage');
        });

        it('should honor pending redirect after successful callback consumption', () => {
            cy.intercept('GET', '**/api/auth/oauth2/state/state-success-redirect', {
                statusCode: 200,
                body: {
                    email: 'slugger@example.com',
                    name: 'Slugger',
                    role: 'ROLE_USER',
                    profileImageUrl: null,
                    favoriteTeam: 'LG',
                    handle: 'slugger',
                },
            }).as('consumeOAuthStateRedirect');

            cy.visit('/oauth/callback?state=state-success-redirect', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/prediction?date=2026-02-11');
                },
            });

            cy.wait('@consumeOAuthStateRedirect');
            cy.location('pathname').should('eq', '/prediction');
            cy.location('search').should('include', 'date=2026-02-11');
        });

        it('should return to account settings when callback status is linked', () => {
            cy.intercept('GET', '**/api/auth/oauth2/state/state-linked', {
                statusCode: 200,
                body: {
                    email: 'slugger@example.com',
                    name: 'Slugger',
                    role: 'ROLE_USER',
                    profileImageUrl: null,
                    favoriteTeam: 'LG',
                    handle: 'slugger',
                },
            }).as('consumeOAuthStateLinked');

            cy.visit('/oauth/callback?state=state-linked&status=linked', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/prediction?date=2026-02-11');
                },
            });

            cy.wait('@consumeOAuthStateLinked');
            cy.location('pathname').should('eq', '/mypage');
            cy.location('search').should('eq', '?view=accountSettings');
        });

        it('should preserve pending redirect and show a friendly error when callback state is missing', () => {
            cy.visit('/oauth/callback', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/prediction?date=2026-03-12');
                },
            });

            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('include', 'redirect=%2Fprediction%3Fdate%3D2026-03-12');
            cy.location('search').should('include', 'error=invalid_oauth2_request');
            cy.contains('OAuth2 인증 요청이 유효하지 않습니다. 다시 시도해주세요.').should('be.visible');
        });

        it('should show an error and return to login when callback consumption fails', () => {
            cy.clock();
            cy.intercept('GET', '**/api/auth/oauth2/state/state-failure', {
                statusCode: 500,
                body: { message: 'oauth2 state consume failed' },
            }).as('consumeOAuthStateFailure');

            cy.visit('/oauth/callback?state=state-failure', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/mate/777/chat');
                },
            });

            cy.wait('@consumeOAuthStateFailure');
            cy.contains('로그인 처리에 실패했습니다.').should('be.visible');
            cy.tick(2000);
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('include', 'redirect=%2Fmate%2F777%2Fchat');
            cy.location('search').should('include', 'error=oauth2_auth_failed');
            cy.contains('소셜 로그인에 실패했습니다. 다시 시도해주세요.').should('be.visible');
        });

        it('should return to login with a session error when callback profile verification fails', () => {
            cy.clock();
            cy.intercept('GET', '**/api/auth/oauth2/state/state-profile-failure', {
                statusCode: 200,
                body: {
                    email: 'slugger@example.com',
                    name: 'Slugger',
                    role: 'ROLE_USER',
                    profileImageUrl: null,
                    favoriteTeam: 'LG',
                    handle: 'slugger',
                },
            }).as('consumeOAuthStateProfileFailure');

            cy.intercept('GET', '**/auth/mypage*', {
                statusCode: 401,
                body: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' },
            }).as('getMeAfterCallbackFailure');

            cy.visit('/oauth/callback?state=state-profile-failure', {
                onBeforeLoad(win) {
                    win.sessionStorage.setItem('pendingLoginRedirect', '/mate/777/chat');
                },
            });

            cy.wait('@consumeOAuthStateProfileFailure');
            cy.wait('@getMeAfterCallbackFailure');
            cy.contains('로그인 처리에 실패했습니다.').should('be.visible');
            cy.tick(2000);
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('include', 'redirect=%2Fmate%2F777%2Fchat');
            cy.location('search').should('include', 'error=auth_session_not_established');
            cy.contains('로그인 처리 후 세션을 확인하지 못했습니다. 다시 시도해주세요.').should('be.visible');
        });
    });
});
