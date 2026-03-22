/// <reference types="cypress" />

export {};

describe('AI chatbot real integration smoke', () => {
    const fallbackLoginPassword = 'Test1234!';
    const fallbackFavoriteTeam = 'LG';
    const blockedFragments = [
        'traceback',
        'ai_internal_auth',
        'openrouter',
        'internal server error',
        'status_503',
    ];
    type EnvVars = Record<string, unknown>;

    type RequiredPolicy = {
        policyType?: string;
        version?: string;
        required?: boolean;
    };

    const stripTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');
    const getEnvString = (envVars: EnvVars, key: string) => {
        const value = envVars[key];
        return typeof value === 'string' ? value : undefined;
    };

    const getConfiguredEnvVars = (): Cypress.Chainable<EnvVars> => {
        const config = Cypress.config() as unknown as { env?: EnvVars };
        const configuredEnv = config.env && typeof config.env === 'object' ? config.env : {};

        return cy.env<EnvVars>([
            'BACKEND_BASE_URL',
            'SMOKE_API_BASE_URL',
            'CYPRESS_BACKEND_BASE_URL',
            'FRONTEND_API_BASE_URL',
            'VITE_API_BASE_URL',
            'SMOKE_LOGIN_EMAIL',
            'SMOKE_LOGIN_PASSWORD',
        ]).then((runtimeEnv) => ({
            ...configuredEnv,
            ...(runtimeEnv && typeof runtimeEnv === 'object' ? runtimeEnv : {}),
        }));
    };

    const resolveBaseOrigin = () => {
        const baseUrl = Cypress.config('baseUrl');
        if (!baseUrl) {
            return undefined;
        }

        try {
            return new URL(baseUrl).origin;
        } catch {
            return undefined;
        }
    };

    const normalizeBackendBaseUrl = (value: string | undefined) => {
        if (!value) {
            return undefined;
        }

        const candidate = stripTrailingSlash(value);
        if (!candidate) {
            return undefined;
        }

        const normalizedInput = (() => {
            if (/^https?:\/\//i.test(candidate)) {
                return candidate;
            }

            if (candidate.startsWith('/')) {
                const baseOrigin = resolveBaseOrigin();
                if (!baseOrigin) {
                    return undefined;
                }

                return `${baseOrigin}${candidate}`;
            }

            return `http://${candidate}`;
        })();

        if (!normalizedInput) {
            return undefined;
        }

        try {
            const parsed = new URL(normalizedInput);
            const trimmedPath = parsed.pathname.replace(/\/api\/?$/i, '');
            const resolvedPath = trimmedPath === '/' ? '' : trimmedPath;
            return `${parsed.origin}${resolvedPath}`;
        } catch {
            return undefined;
        }
    };

    const resolveBackendBaseUrl = (): Cypress.Chainable<string | undefined> =>
        getConfiguredEnvVars().then((envVars) => {
            const backendBaseUrl =
                normalizeBackendBaseUrl(getEnvString(envVars, 'BACKEND_BASE_URL'))
                || normalizeBackendBaseUrl(getEnvString(envVars, 'SMOKE_API_BASE_URL'))
                || normalizeBackendBaseUrl(getEnvString(envVars, 'CYPRESS_BACKEND_BASE_URL'))
                || normalizeBackendBaseUrl(getEnvString(envVars, 'FRONTEND_API_BASE_URL'))
                || normalizeBackendBaseUrl(getEnvString(envVars, 'VITE_API_BASE_URL'));

            return cy.wrap(backendBaseUrl, { log: false });
        });

    const buildBackendUrl = (backendBaseUrl: string, path: string) => {
        const safePath = path.startsWith('/') ? path : `/${path}`;
        return `${backendBaseUrl}${safePath}`;
    };

    const isBackendHealthResponse = (response: Cypress.Response<unknown>) => {
        if (![200, 503].includes(response.status)) {
            return false;
        }

        const contentType = String(response.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('text/html')) {
            return false;
        }

        const body = response.body;
        if (!body || typeof body !== 'object') {
            return false;
        }

        return typeof (body as { status?: unknown }).status === 'string';
    };

    before(function () {
        return resolveBackendBaseUrl().then(function (backendBaseUrl) {
            if (!backendBaseUrl) {
                cy.log('Skipping chatbot-real: BACKEND_BASE_URL is not available.');
                this.skip();
                return;
            }

            return cy.request({
                method: 'GET',
                url: buildBackendUrl(backendBaseUrl, '/actuator/health'),
                failOnStatusCode: false,
            }).then((response: Cypress.Response<unknown>) => {
                if (!isBackendHealthResponse(response)) {
                    cy.log('Skipping chatbot-real: backend health check did not return JSON.');
                    this.skip();
                }
            });
        });
    });

    const resolveRequiredPolicyConsents = (backendBaseUrl: string) => (
        cy.request({
            method: 'GET',
            url: buildBackendUrl(backendBaseUrl, '/api/auth/policies/required'),
        }).then((response) => {
            expect(response.status).to.eq(200);

            const policies = (response.body?.data?.policies || []) as RequiredPolicy[];
            return policies
                .filter((policy) => (
                    policy.required === true
                    && typeof policy.policyType === 'string'
                    && policy.policyType.length > 0
                    && typeof policy.version === 'string'
                    && policy.version.length > 0
                ))
                .map((policy) => ({
                    policyType: policy.policyType as string,
                    version: policy.version as string,
                    agreed: true,
                }));
        })
    );

    const loginWithCredentials = (backendBaseUrl: string, email: string, password: string) => (
        cy.request({
            method: 'POST',
            url: buildBackendUrl(backendBaseUrl, '/api/auth/login'),
            failOnStatusCode: false,
            body: {
                email,
                password,
            },
        }).then((response) => {
            if (response.status !== 200) {
                return false;
            }

            expect(response.body?.success).to.eq(true);
            return true;
        })
    );

    const createAccountAndLogin = (backendBaseUrl: string, email: string, password: string, handle: string) => (
        resolveRequiredPolicyConsents(backendBaseUrl)
            .then((policyConsents) => cy.request({
                method: 'POST',
                url: buildBackendUrl(backendBaseUrl, '/api/auth/signup'),
                failOnStatusCode: false,
                body: {
                    name: 'Chatbot Real E2E',
                    handle,
                    email,
                    password,
                    confirmPassword: password,
                    favoriteTeam: fallbackFavoriteTeam,
                    policyConsents,
                },
            }))
            .then((signupResponse) => {
                if (signupResponse.status === 429) {
                    return false;
                }

                expect(signupResponse.status).to.eq(201);
                return loginWithCredentials(backendBaseUrl, email, password);
            })
    );

    const loginAsSmokeUser = (backendBaseUrl: string): Cypress.Chainable<boolean> => (
        getConfiguredEnvVars().then((envVars) => {
            const configuredEmail = getEnvString(envVars, 'SMOKE_LOGIN_EMAIL');
            const configuredPassword = getEnvString(envVars, 'SMOKE_LOGIN_PASSWORD');

            if (configuredEmail && configuredPassword) {
                return loginWithCredentials(backendBaseUrl, configuredEmail, configuredPassword);
            }

            const uniqueSuffix = Date.now().toString().slice(-8);
            return createAccountAndLogin(
                backendBaseUrl,
                `chatbot_real_${uniqueSuffix}@example.com`,
                fallbackLoginPassword,
                `chatreal${uniqueSuffix}`,
            );
        }) as unknown as Cypress.Chainable<boolean>
    );

    it('streams a real chatbot answer without exposing raw internal errors', function () {
        const question = 'KBO를 한 문장으로 소개해줘.';

        resolveBackendBaseUrl().then((backendBaseUrl) => {
            expect(backendBaseUrl, 'resolved backend url').to.be.a('string').and.not.be.empty;

            return loginAsSmokeUser(backendBaseUrl as string).then((loggedIn) => {
                expect(loggedIn, 'smoke user login').to.eq(true);

                cy.visit('/home', {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('bega_has_visited', 'true');
                        win.localStorage.setItem('bega_dont_show_guide', 'true');
                    },
                });

                cy.get('button[aria-label="챗봇 열기"]', { timeout: 20000 }).should('be.visible').click();
                cy.contains('야구 가이드 BEGA').should('be.visible');
                cy.getBySel('chatbot-login-cta-footer').should('not.exist');
                cy.getBySel('chatbot-message-input').should('be.enabled');

                cy.get('[aria-label="대화 내용"]').invoke('text').then((beforeText) => {
                    cy.getBySel('chatbot-message-input').type(`${question}{enter}`);
                    cy.contains(question).should('be.visible');
                    cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 20000 }).should('be.visible');
                    cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 90000 }).should('not.exist');

                    cy.get('[aria-label="대화 내용"]', { timeout: 90000 }).invoke('text').should((afterText) => {
                        expect(afterText).to.include(question);
                        expect(afterText.length).to.be.greaterThan(beforeText.length + 12);

                        const normalized = afterText.toLowerCase();
                        blockedFragments.forEach((fragment) => {
                            expect(normalized).not.to.include(fragment);
                        });
                    });
                });
            });
        });
    });
});
