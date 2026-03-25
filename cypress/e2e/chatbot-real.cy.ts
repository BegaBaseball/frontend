/// <reference types="cypress" />

export {};

describe('AI chatbot real integration smoke', () => {
    const fallbackLoginPassword = 'Test1234!';
    const fallbackFavoriteTeam = 'LG';
    const localDevSmokeEmail = 'test@example.com';
    const localDevSmokePassword = 'testpassword';
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

    type ApiErrorResponse = {
        success?: boolean;
        message?: string;
        code?: string;
    };

    type ApiEnvelope<T> = {
        success?: boolean;
        message?: string;
        data?: T;
    };

    const stripTrailingSlash = (value: string) => value.trim().replace(/\/+$/, '');
    const stripBracketedIpv6Host = (value: string) => value.replace(/^\[(.*)\]$/, '$1');
    const isLoopbackHost = (value: string) => {
        const normalized = stripBracketedIpv6Host(value).toLowerCase();
        return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
    };
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

    const buildAppUrl = (path: string) => {
        const safePath = path.startsWith('/') ? path : `/${path}`;
        const baseOrigin = resolveBaseOrigin();
        return baseOrigin ? `${baseOrigin}${safePath}` : safePath;
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
                || normalizeBackendBaseUrl(getEnvString(envVars, 'VITE_API_BASE_URL'))
                || normalizeBackendBaseUrl('http://localhost:8080');

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

    const isAiStreamUnavailableResponse = (response: Cypress.Response<unknown>) => {
        if ([401, 503].includes(response.status)) {
            return true;
        }

        const body = response.body as ApiErrorResponse | undefined;
        return body?.code === 'AI_UPSTREAM_UNAUTHORIZED' || body?.code === 'AI_UPSTREAM_UNAVAILABLE';
    };

    const resolveRequiredPolicyConsents = () => (
        cy.request({
            method: 'GET',
            url: buildAppUrl('/api/auth/policies/required'),
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

    const loginWithCredentials = (email: string, password: string) => (
        cy.request({
            method: 'POST',
            url: buildAppUrl('/api/auth/login'),
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

    const createAccountAndLogin = (email: string, password: string, handle: string) => (
        resolveRequiredPolicyConsents()
            .then((policyConsents) => cy.request({
                method: 'POST',
                url: buildAppUrl('/api/auth/signup'),
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
                return loginWithCredentials(email, password);
            })
    );

    const loginAsSmokeUser = (backendBaseUrl: string): Cypress.Chainable<boolean> => (
        getConfiguredEnvVars().then((envVars) => {
            const configuredEmail = getEnvString(envVars, 'SMOKE_LOGIN_EMAIL');
            const configuredPassword = getEnvString(envVars, 'SMOKE_LOGIN_PASSWORD');

            if (configuredEmail && configuredPassword) {
                return loginWithCredentials(configuredEmail, configuredPassword);
            }

            const isLoopbackBackendUrl = (() => {
                try {
                    return isLoopbackHost(new URL(backendBaseUrl).hostname);
                } catch {
                    return false;
                }
            })();

            if (isLoopbackBackendUrl) {
                return loginWithCredentials(localDevSmokeEmail, localDevSmokePassword)
                    .then((loggedIn) => {
                        if (loggedIn) {
                            return true;
                        }

                        const uniqueSuffix = Date.now().toString().slice(-6);
                        return createAccountAndLogin(
                            `chatbot_real_${uniqueSuffix}@example.com`,
                            fallbackLoginPassword,
                            `chatr${uniqueSuffix}`,
                        );
                    });
            }

            const uniqueSuffix = Date.now().toString().slice(-6);
            return createAccountAndLogin(
                `chatbot_real_${uniqueSuffix}@example.com`,
                fallbackLoginPassword,
                `chatr${uniqueSuffix}`,
            );
        }) as unknown as Cypress.Chainable<boolean>
    );

    before(function () {
        const context = this;

        return resolveBackendBaseUrl().then((backendBaseUrl) => {
            if (!backendBaseUrl) {
                cy.log('Skipping chatbot-real: BACKEND_BASE_URL is not available.');
                context.skip();
                return;
            }

            return cy.request({
                method: 'GET',
                url: buildBackendUrl(backendBaseUrl, '/actuator/health'),
                failOnStatusCode: false,
            }).then((response: Cypress.Response<unknown>) => {
                expect(isBackendHealthResponse(response), 'backend health response').to.eq(true);
            }).then(() => loginAsSmokeUser(backendBaseUrl))
                .then((loggedIn) => {
                    if (!loggedIn) {
                        cy.log('Skipping chatbot-real: unable to authenticate smoke user.');
                        context.skip();
                        return;
                    }

                    return cy.request({
                        method: 'POST',
                        url: buildAppUrl('/api/ai/chat/stream'),
                        failOnStatusCode: false,
                        body: {
                            question: 'KBO를 한 문장으로 소개해줘.',
                            history: null,
                        },
                    }).then((probeResponse: Cypress.Response<unknown>) => {
                        if (probeResponse.status === 200) {
                            return;
                        }

                        if (isAiStreamUnavailableResponse(probeResponse)) {
                            cy.log('Skipping chatbot-real: AI stream upstream is not ready.');
                            context.skip();
                            return;
                        }

                        expect(probeResponse.status, 'AI stream probe status').to.eq(200);
                    });
            });
        });
    });

    it('streams a real chatbot answer without exposing raw internal errors', function () {
        const question = 'KBO를 한 문장으로 소개해줘.';

        resolveBackendBaseUrl().then((backendBaseUrl) => {
            expect(backendBaseUrl, 'resolved backend url').to.be.a('string').and.not.be.empty;

            cy.visit('/mate', {
                onBeforeLoad(win) {
                    win.localStorage.setItem('bega_has_visited', 'true');
                    win.localStorage.setItem('bega_dont_show_guide', 'true');
                },
            });

            cy.get('body').then(($body) => {
                if ($body.find('[data-testid="chatbot-panel"]').length > 0) {
                    return;
                }

                cy.get('[data-testid="chatbot-request-launcher"]', { timeout: 20000 }).should('be.visible').click();
            });

            cy.get('[data-testid="chatbot-panel"]', { timeout: 20000 }).should('be.visible').as('chatbotPanel');
            cy.getBySel('chatbot-request-launcher').should('not.exist');

            cy.get('@chatbotPanel').within(() => {
                cy.contains('야구 가이드 BEGA').should('be.visible');
                cy.getBySel('chatbot-login-cta-footer').should('not.exist');
                cy.getBySel('chatbot-message-input').should('be.visible').and('be.enabled');
            });

            cy.contains('대화 내용을 불러오는 중입니다.', { timeout: 30000 }).should('not.exist');
            cy.get('@chatbotPanel').within(() => {
                cy.getBySel('chatbot-tab-conversation').should('have.attr', 'data-state', 'active');
            });

            cy.request<ApiEnvelope<{ sessionId?: number }>>({
                method: 'POST',
                url: buildAppUrl('/api/ai/chat/sessions'),
            }).then((createSessionResponse) => {
                expect(createSessionResponse.status).to.be.oneOf([200, 201]);
                expect(createSessionResponse.body?.success).to.eq(true);

                const sessionId = Number(createSessionResponse.body?.data?.sessionId);
                expect(Number.isFinite(sessionId), 'created session id').to.eq(true);

                cy.request<ApiEnvelope<{ messageId?: number }>>({
                    method: 'POST',
                    url: buildAppUrl(`/api/ai/chat/sessions/${sessionId}/messages/user`),
                    body: {
                        content: question,
                    },
                }).then((userMessageResponse) => {
                    expect(userMessageResponse.status).to.be.oneOf([200, 201]);
                    expect(userMessageResponse.body?.success).to.eq(true);

                    cy.request<{ answer?: string; verified?: boolean; cached?: boolean }>({
                        method: 'POST',
                        url: buildAppUrl('/api/ai/chat/completion'),
                        body: {
                            question,
                            history: null,
                        },
                    }).then((completionResponse) => {
                        expect(completionResponse.status).to.eq(200);

                        const assistantText = String(completionResponse.body?.answer || '').trim();
                        expect(assistantText.length).to.be.greaterThan(12);
                        blockedFragments.forEach((fragment) => {
                            expect(assistantText.toLowerCase()).not.to.include(fragment);
                        });

                        cy.request<ApiEnvelope<{ messageId?: number }>>({
                            method: 'POST',
                            url: buildAppUrl(`/api/ai/chat/sessions/${sessionId}/messages/assistant`),
                            body: {
                                content: assistantText,
                                status: 'COMPLETED',
                                verified: true,
                                cached: false,
                                metadata: {
                                    source: 'chatbot-real-smoke',
                                },
                                citations: [],
                                toolCalls: [],
                            },
                        }).then((assistantMessageResponse) => {
                            expect(assistantMessageResponse.status).to.be.oneOf([200, 201]);
                            expect(assistantMessageResponse.body?.success).to.eq(true);

                            const assistantMessageId = Number(assistantMessageResponse.body?.data?.messageId);
                            expect(Number.isFinite(assistantMessageId), 'assistant message id').to.eq(true);

                            cy.request<ApiEnvelope<Array<{ role?: string; content?: string }>>>({
                                method: 'GET',
                                url: buildAppUrl(`/api/ai/chat/sessions/${sessionId}/messages`),
                            }).then((messagesResponse) => {
                                expect(messagesResponse.status).to.eq(200);
                                expect(messagesResponse.body?.success).to.eq(true);

                                const storedMessages = messagesResponse.body?.data ?? [];
                                expect(storedMessages.length).to.be.greaterThan(1);
                                expect(storedMessages.some((message) => message.role === 'USER' && message.content === question)).to.eq(true);
                                expect(storedMessages.some((message) => message.role === 'ASSISTANT' && message.content === assistantText)).to.eq(true);
                            });

                            cy.request({
                                method: 'POST',
                                url: buildAppUrl(`/api/ai/chat/favorites/${assistantMessageId}`),
                            }).then((favoriteResponse) => {
                                expect(favoriteResponse.status).to.be.oneOf([200, 201]);
                            });

                            cy.request<ApiEnvelope<Array<{ messageId?: number }>>>({
                                method: 'GET',
                                url: buildAppUrl('/api/ai/chat/favorites'),
                            }).then((favoritesResponse) => {
                                expect(favoritesResponse.status).to.eq(200);
                                expect(favoritesResponse.body?.success).to.eq(true);
                                expect((favoritesResponse.body?.data ?? []).some((favorite) => favorite.messageId === assistantMessageId)).to.eq(true);
                            });
                        });
                    });
                });
            });
        });
    });
});
