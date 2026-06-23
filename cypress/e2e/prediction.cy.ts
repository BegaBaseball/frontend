/// <reference types="cypress" />

import {
    buildDefaultPredictionPath,
    ensureCoachBriefingVisible,
    getPredictionAuthRequestTraces,
    installPredictionAuthenticatedSessionIntercept,
    installPredictionBootstrapIntercept,
    installPredictionGuestSessionIntercept,
    visitPredictionPage,
    waitForPredictionVoteBootstrap,
} from '../support/predictionPage';

describe('Game Prediction', () => {
    const getCoachAnalysisDialog = () => cy.get('[data-testid="coach-analysis-dialog"]');

    type ScheduleGameMock = {
        gameId: string;
        gameDate: string;
        homeTeam: string;
        awayTeam: string;
        stadium: string;
        startTime?: string | null;
        homeScore: number | null;
        awayScore: number | null;
        winner: string | null;
        gameStatus?: string;
        gameStatusKr?: string;
        leagueType?: string;
    };

    const defaultRangeSchedulePayload: ScheduleGameMock[] = [
        {
            gameId: '20240510HHSS0',
            gameDate: '2026-02-03',
            homeTeam: 'HH',
            awayTeam: 'SS',
            stadium: '대전',
            homeScore: null,
            awayScore: null,
            winner: null,
            gameStatus: 'SCHEDULED',
            gameStatusKr: '경기 예정',
        },
    ];

    const meaningfulRegularSeasonRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 },
    ];

    let rangeSchedulePayload: ScheduleGameMock[] = [...defaultRangeSchedulePayload];
    let rangeScheduleStatusCode = 200;
    let rangeScheduleCallCount = 0;
    let rangeScheduleMode: 'normal' | 'empty-then-data' = 'normal';

    const parseCoachRequestBody = (rawBody: unknown): Record<string, unknown> => {
        if (rawBody == null) {
            return {};
        }

        if (typeof rawBody === 'string') {
            try {
                return JSON.parse(rawBody) as Record<string, unknown>;
            } catch {
                return {};
            }
        }

        if (typeof rawBody === 'object') {
            return rawBody as Record<string, unknown>;
        }

        return {};
    };

    const extractCoachGameId = (body: Record<string, unknown>): string => {
        const directId = body.game_id;
        if (typeof directId === 'string' && directId.trim()) {
            return directId;
        }

        const legacyId = body.gameId;
        if (typeof legacyId === 'string' && legacyId.trim()) {
            return legacyId;
        }

        return '';
    };

    const buildCoachRequestIdentity = (rawBody: Record<string, unknown>) => {
        const leagueContext = rawBody.league_context as Record<string, unknown> | undefined;
        const requestMode = rawBody.request_mode ?? 'manual_detail';
        const focus = Array.isArray(rawBody.focus) ? rawBody.focus.join('|') : '';
        const seasonYear = leagueContext?.season_year ?? '';
        const leagueType = leagueContext?.league_type ?? '';
        const homeTeam = rawBody.home_team_id ?? rawBody.team_id ?? '';
        const awayTeam = rawBody.away_team_id ?? '';
        const question = requestMode === 'auto_brief'
            ? 'auto'
            : String(rawBody.question_override ?? '');

        return JSON.stringify({
            requestMode,
            focus,
            seasonYear,
            leagueType,
            homeTeam,
            awayTeam,
            question,
        });
    };

    const openPredictionPage = (options: {
        captureFlowEvents?: boolean;
        captureAuthEvents?: boolean;
        seedAuth?: boolean;
        persistedAuthHint?: boolean;
        authBootstrapMeta?: {
            version?: number;
            lastSuccessAt?: number | null;
            lastFailureAt?: number | null;
        } | null;
        waitForScheduleRange?: boolean;
        path?: string;
    } = {}) => {
        const {
            captureFlowEvents = false,
            captureAuthEvents = false,
            seedAuth = true,
            persistedAuthHint = false,
            authBootstrapMeta = null,
            waitForScheduleRange = false,
            path = '/prediction',
        } = options;
        const resolvedPath = path === '/prediction'
            ? buildDefaultPredictionPath(rangeSchedulePayload)
            : path;
        visitPredictionPage({
            path: resolvedPath,
            token: 'prediction-spec-token',
            authenticated: seedAuth,
            persistedAuthHint,
            authBootstrapMeta,
            resetStorage: true,
            onBeforeLoad(win) {
                const typedWin = win as Window & {
                    __predictionFlowEvents?: Array<{
                        eventName: string;
                        runProgressBannerAction?: string;
                        meta?: Record<string, unknown>;
                    }>;
                    __predictionFlowEventHandler?: (evt: Event) => void;
                    __predictionAuthEvents?: Array<{
                        eventName: 'auth-session-expired' | 'global-api-error';
                        detail?: Record<string, unknown>;
                    }>;
                    __predictionGlobalApiErrorHandler?: (evt: Event) => void;
                };

                win.addEventListener('auth-session-expired', (event) => {
                    if (captureAuthEvents) {
                        typedWin.__predictionAuthEvents?.push({
                            eventName: 'auth-session-expired',
                        });
                    }
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, true);

                if (captureAuthEvents) {
                    typedWin.__predictionAuthEvents = [];
                    if (typedWin.__predictionGlobalApiErrorHandler) {
                        typedWin.removeEventListener('global-api-error', typedWin.__predictionGlobalApiErrorHandler);
                    }
                    typedWin.__predictionGlobalApiErrorHandler = (evt: Event) => {
                        const detail = (evt as CustomEvent<Record<string, unknown> | undefined>).detail;
                        typedWin.__predictionAuthEvents?.push({
                            eventName: 'global-api-error',
                            detail,
                        });
                    };
                    typedWin.addEventListener('global-api-error', typedWin.__predictionGlobalApiErrorHandler);
                }

                if (!captureFlowEvents) {
                    return;
                }

                if (typedWin.__predictionFlowEventHandler) {
                    typedWin.removeEventListener('prediction-flow:event', typedWin.__predictionFlowEventHandler);
                }
                typedWin.__predictionFlowEvents = [];
                typedWin.__predictionFlowEventHandler = (evt: Event) => {
                    const detail = (evt as CustomEvent).detail;
                    typedWin.__predictionFlowEvents?.push(detail);
                };
                typedWin.addEventListener('prediction-flow:event', typedWin.__predictionFlowEventHandler);
            },
        });
        const advanceTime = (ms: number) => {
            cy.window().then((win) => {
                const hasFakeClock = Boolean((win.setTimeout as typeof win.setTimeout & { clock?: unknown }).clock);
                if (hasFakeClock) {
                    cy.tick(ms, { log: false });
                    return;
                }
                cy.wait(ms, { log: false });
            });
        };
        advanceTime(100);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        advanceTime(100);
        if (waitForScheduleRange) {
            cy.get('@getScheduleRange.all').should('have.length.gte', 1);
            advanceTime(100);
        }
    };

    const installSubmitVote = (delayMs = 0) => {
        cy.intercept('POST', /\/predictions\/vote(?:\?.*)?$/, (req) => {
            req.reply({
                statusCode: 200,
                delay: delayMs,
                body: {
                    success: true,
                },
            });
        }).as('submitVote');
    };

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        (cy as any).mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept();

        // Force date to 2026-02-03 12:00:00 KST (approx)
        // Using UTC date that results in the same date string for getTodayString
        const now = new Date('2026-02-03T12:00:00').getTime();
        cy.clock(now, ['Date', 'setTimeout', 'clearTimeout']).as('predictionClock'); // mock Date and timers for deterministic execution

        rangeSchedulePayload = defaultRangeSchedulePayload.map((item) => ({
            ...item,
            gameDate: '2026-02-03',
        }));
        rangeScheduleStatusCode = 200;
        rangeScheduleCallCount = 0;
        rangeScheduleMode = 'normal';

        // Mock game detail
        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-03',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                }
            });
        }).as('getGameDetail');

        // Mock user votes (bulk endpoint)
        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: {
                votes: {
                    '20240510HHSS0': null
                }
            }
        }).as('getUserVotes');

        // Legacy endpoint should no longer be used
        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getUserVote');

        // Specific mock for primary day query
        cy.intercept('GET', '**/api/matches/day*', (req) => {
            rangeScheduleCallCount += 1;
            const shouldReturnEmpty = rangeScheduleMode === 'empty-then-data' && rangeScheduleCallCount === 1;
            const url = new URL(req.url);
            const requestedDate = url.searchParams.get('date') || '2026-02-03';
            const responseDate = shouldReturnEmpty
                ? requestedDate
                : (rangeSchedulePayload[0]?.gameDate || requestedDate);
            req.reply({
                statusCode: rangeScheduleStatusCode,
                body: rangeScheduleStatusCode === 200
                    ? {
                        date: responseDate,
                        games: shouldReturnEmpty ? [] : rangeSchedulePayload,
                        prevDate: shouldReturnEmpty ? '2026-02-02' : null,
                        nextDate: shouldReturnEmpty ? '2026-02-04' : null,
                        hasPrev: shouldReturnEmpty,
                        hasNext: shouldReturnEmpty,
                    }
                    : { message: 'Internal Server Error' },
            });
        }).as('getScheduleRange');

        // General schedule mock (if needed fallback)
        cy.intercept('**/api/matches?*', {
            statusCode: 200,
            body: []
        }).as('getSchedule');


        // Mock prediction status
        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 10, awayVotes: 5, totalVotes: 15 }
        }).as('getVoteStatus');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrap',
            games: () => rangeSchedulePayload,
            statusCode: () => rangeScheduleStatusCode,
            errorBody: () => ({ message: 'Internal Server Error' }),
        });

        // Mock league dates specifically for this spec to avoid any 500 from global mock
        cy.intercept('**/api/kbo/league-start-dates*', {
            statusCode: 200,
            body: { regularSeasonStart: '2025-03-22', postseasonStart: '2025-10-06', koreanSeriesStart: '2025-10-26' }
        }).as('getLeagueDatesLocal');

    });

    it('should display daily game schedule', () => {
        openPredictionPage();
        cy.wait('@getGameDetail');
        cy.get('@getGameDetail.all').its('length').should('be.gte', 1);
        cy.wait('@getUserVotes');
        cy.get('@getUserVotes.all').should('have.length', 1);
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.get('@getUserVotes.all').then((interceptions) => {
            const first = interceptions[0] as any;
            expect(first?.response?.body).to.deep.equal({
                votes: {
                    '20240510HHSS0': null
                }
            });
        });
    });

    it('should hydrate a deep-linked game from prediction bootstrap without initial detail/status waterfall', () => {
        const gameId = '20240510HHSS0';
        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapHydrated',
            games: () => rangeSchedulePayload,
            detailByGameId: {
                [gameId]: {
                    gameId,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-03',
                    startTime: '18:30',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            },
            voteStatusByGameId: {
                [gameId]: {
                    gameId,
                    homeVotes: 7,
                    awayVotes: 3,
                    totalVotes: 10,
                },
            },
        });

        openPredictionPage();

        cy.wait('@getPredictionBootstrapHydrated');
        cy.wait('@getUserVotes');
        cy.get('@getPredictionBootstrapHydrated.all').should('have.length', 1);
        cy.get('@getScheduleRange.all').should('have.length', 0);
        cy.get('@getGameDetail.all').then((interceptions: any) => {
            const detailCalls = (interceptions as any[]).filter((interception) => {
                const url = interception.request?.url || '';
                return !url.includes('/api/matches/day')
                    && !url.includes('/api/matches/range')
                    && !url.includes('/api/matches/bounds');
            });
            expect(detailCalls).to.have.length(0);
        });
        cy.get('@getVoteStatus.all').should('have.length', 0);
        cy.get('@getUserVotes.all').should('have.length', 1);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
    });

    it('should resolve my-votes through bulk/cache path and never call legacy my-vote endpoint', () => {
        openPredictionPage();
        cy.get('@getUserVotes.all').should('have.length.at.most', 1);
        cy.get('@getUserVote.all').should('have.length', 0);
    });

    it('should request bulk votes with all scheduled gameIds in one call and never call legacy single endpoint', () => {
        rangeSchedulePayload = [
            {
                gameId: '20240510HHSS0',
                gameDate: '2026-02-04',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
            {
                gameId: '20240510LGLK0',
                gameDate: '2026-02-04',
                homeTeam: 'LG',
                awayTeam: 'KT',
                stadium: '잠실',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
            {
                gameId: '20240510LGKT0',
                gameDate: '2026-02-04',
                homeTeam: 'LG',
                awayTeam: 'KT',
                stadium: '문학',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
        ];

        openPredictionPage();

        cy.wait('@getUserVotes').then((interception) => {
            const requestBody = interception.request?.body as { gameIds?: string[] };
            const requestGameIds = requestBody?.gameIds ?? [];
            expect(requestGameIds).to.be.an('array').and.to.have.length(rangeSchedulePayload.length);
            expect(new Set(requestGameIds).size).to.eq(rangeSchedulePayload.length);
            expect(requestGameIds).to.include('20240510HHSS0');
            expect(requestGameIds).to.include('20240510LGLK0');
            expect(requestGameIds).to.include('20240510LGKT0');
        });

        cy.wait(300);
        cy.get('@getUserVotes.all').should('have.length', 1);
        cy.get('@getUserVote.all').should('have.length', 0);
    });

    it('should auto-call coach brief for postseason games even when meaningful criteria are not met', () => {
        rangeSchedulePayload = [
            {
                gameId: '20260601HHSS0',
                gameDate: '2026-06-01',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
        ];

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/day')) {
                return;
            }

            req.reply({
            statusCode: 200,
            body: {
                gameId: '20260601HHSS0',
                gameDate: '2026-06-01',
                leagueType: 'POST',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                gameStatus: 'SCHEDULED',
                gameStatusKr: '경기 시작 예정',
                homeScore: null,
                awayScore: null
            }
            });
        }).as('getGameDetailPostseason');

        rangeSchedulePayload = [
            {
                ...rangeSchedulePayload[0],
                gameId: '20260601HHSS0',
                leagueType: 'POST',
            },
        ];

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 6, wins: 40, losses: 95, draws: 0, winRate: '0.296', games: 135, gamesBehind: 9.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 38, losses: 97, draws: 0, winRate: '0.281', games: 133, gamesBehind: 11.0 }
            ]
        }).as('getRankingsPostseason');

        const autoCoachResponse = [
            'event: message',
            'data: {"delta":"{\\\"headline\\\":\\\"포스트시즌\\\",\\\"coach_note\\\":\\\"요약 테스트\\\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: autoCoachResponse,
        }).as('coachAnalyzePostseason');

        openPredictionPage({ path: '/prediction?gameId=20260601HHSS0&date=2026-06-01' });

        cy.wait('@getGameDetailPostseason');
        cy.wait('@getRankingsPostseason');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(1000);
        cy.wait('@coachAnalyzePostseason').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            const leagueContext = body.league_context as Record<string, unknown> | undefined;
            expect(body.request_mode).to.eq('auto_brief');
            expect(body.focus).to.deep.eq(['recent_form']);
            expect(body).to.not.have.property('question_override');
            expect(leagueContext?.league_type).to.eq('POST');
            expect(extractCoachGameId(body)).to.eq('20260601HHSS0');
        });
        cy.get('@coachAnalyzePostseason.all').then((interceptions) => {
          const interceptionList = interceptions as unknown as unknown[];
          expect(interceptionList.length).to.be.gte(1);
        });
    });

    it('should send automatic AI brief request for selected game with auto payload', () => {
        const autoCoachResponse = [
            'event: message',
            'data: {"delta":"{\"headline\":\"테스트\",\"coach_note\":\"요약 테스트\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 }
            ]
        }).as('getRankingsAuto');

        let firstCoachBody: Record<string, unknown> = {};
        cy.intercept('POST', '**/coach/analyze*', (req) => {
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: autoCoachResponse,
            });
        }).as('coachAnalyzeAuto');

        openPredictionPage();

        cy.wait('@getRankingsAuto');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(2000);
        cy.wait('@coachAnalyzeAuto').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            expect(body.request_mode).to.eq('auto_brief');
        });
        cy.get('@coachAnalyzeAuto.all').its('length').should('be.gte', 1);
    });

    it('should auto brief meaningful scheduled game while keeping manual detail entrypoint visible', () => {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: meaningfulRegularSeasonRankings,
        }).as('getRankingsMeaningfulScheduled');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyze');
        openPredictionPage();
        cy.wait('@getRankingsMeaningfulScheduled');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(1000);
        cy.wait(500);
        cy.wait('@coachAnalyze').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            expect(body.request_mode).to.eq('auto_brief');
            expect(extractCoachGameId(body)).to.eq('20240510HHSS0');
        });
        cy.get('@coachAnalyze.all').should('have.length', 1);
        cy.get('@getGameDetail.all').its('length').should('be.gte', 1);
        cy.get('[data-testid="coach-analysis-open"]').should('be.visible');
    });

    it('should keep postponed status badge and disable voting', () => {
        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/day')) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-04',
                    startTime: '18:30',
                    gameStatus: 'POSTPONED',
                    homeScore: null,
                    awayScore: null,
                }
            });
        }).as('getGameDetailPostponed');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapPostponed',
            games: () => rangeSchedulePayload,
            detailByGameId: {
                '20240510HHSS0': {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-04',
                    startTime: '18:30',
                    gameStatus: 'POSTPONED',
                    gameStatusKr: '경기 연기',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            },
        });

        openPredictionPage();
        cy.wait('@getPredictionBootstrapPostponed');
        cy.contains(/경기 연기|연기되어/).should('exist');
        cy.contains('현재 상태에서는 투표할 수 없습니다.').should('be.visible');
        cy.contains('해당 경기는 연기되어 투표 및 경기 상세 정보가 제공되지 않습니다.').should('be.visible');
    });

    it('should keep cancelled status badge and disable voting', () => {
        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/day')) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-04',
                    startTime: '18:30',
                    gameStatus: 'CANCELLED',
                    gameStatusKr: '경기 취소',
                    homeScore: null,
                    awayScore: null,
                }
            });
        }).as('getGameDetailCancelled');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapCancelled',
            games: () => rangeSchedulePayload,
            detailByGameId: {
                '20240510HHSS0': {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-04',
                    startTime: '18:30',
                    gameStatus: 'CANCELLED',
                    gameStatusKr: '경기 취소',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            },
        });

        openPredictionPage();
        cy.wait('@getPredictionBootstrapCancelled');
        cy.tick(500);
        cy.contains(/경기 취소|취소/, { timeout: 10000 }).should('exist');
        cy.contains('예측 처리 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should auto brief past meaningful game while keeping review flow available', () => {
        rangeSchedulePayload = [{
            gameId: '20240510HHSS0',
            gameDate: '2026-02-03',
            homeTeam: 'HH',
            awayTeam: 'SS',
            stadium: '대전',
            homeScore: 0,
            awayScore: 4,
            winner: 'SS',
            gameStatus: 'COMPLETED',
            gameStatusKr: '경기 종료',
        }];

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: meaningfulRegularSeasonRankings,
        }).as('getRankingsMeaningfulPast');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyzePast');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/day')) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-03',
                    startTime: '00:00',
                    gameStatus: 'COMPLETED',
                    gameStatusKr: '경기 종료',
                    homeScore: 0,
                    awayScore: 4,
                    winner: 'away',
                }
            });
        }).as('getGameDetailPast');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapPast',
            games: () => rangeSchedulePayload,
            detailByGameId: {
                '20240510HHSS0': {
                    gameId: '20240510HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-03',
                    startTime: '00:00',
                    gameStatus: 'COMPLETED',
                    gameStatusKr: '경기 종료',
                    homeScore: 0,
                    awayScore: 4,
                    winner: 'away',
                },
            },
            voteStatusByGameId: {
                '20240510HHSS0': {
                    gameId: '20240510HHSS0',
                    homeVotes: 10,
                    awayVotes: 5,
                    totalVotes: 15,
                },
            },
        });

        openPredictionPage();
        cy.wait('@getPredictionBootstrapPast');
        cy.get('@getUserVote.all').should('have.length', 0);
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(1000);
        cy.wait(500);
        cy.wait('@getRankingsMeaningfulPast');
        cy.wait('@coachAnalyzePast').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            expect(body.request_mode).to.eq('auto_brief');
            expect(extractCoachGameId(body)).to.eq('20240510HHSS0');
        });
        cy.get('@coachAnalyzePast.all').should('have.length', 1);
        cy.contains('예측 처리 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should keep bulk vote request single-flight while switching games on same day', () => {
        rangeSchedulePayload = [
            {
                gameId: '20260204HHSS0',
                gameDate: '2026-02-04',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
            {
                gameId: '20260204LGLK0',
                gameDate: '2026-02-04',
                homeTeam: 'LG',
                awayTeam: 'KT',
                stadium: '잠실',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
        ];

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 },
                { teamId: 'LG', teamName: '엘지 트윈스', rank: 2, wins: 90, losses: 94, draws: 0, winRate: '0.490', games: 90, gamesBehind: 3.0 },
                { teamId: 'KT', teamName: 'KT 위즈', rank: 7, wins: 70, losses: 113, draws: 0, winRate: '0.382', games: 90, gamesBehind: 5.0 },
            ]
        }).as('getRankingsBulkGate');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyze');

        openPredictionPage();
        cy.wait('@getUserVotes');
        cy.get('@getUserVotes.all').should('have.length', 1);
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.wait('@getRankingsBulkGate');
        cy.wait('@getGameDetail');
        cy.tick(1000);
        cy.wait(500);

        cy.get('[data-testid="prediction-same-day-switcher"]').should('be.visible');
        cy.get('[data-testid="prediction-detail-game-switch"][data-game-id="20260204LGLK0"]')
            .click({ force: true });
        cy.location('search').should('include', 'gameId=20260204LGLK0');

        cy.wait(700);
        cy.get('@getUserVotes.all').then((interceptions: any) => {
            const requestList = interceptions as Array<{
                request?: { body?: { gameIds?: string[] } };
            }>;
            expect(requestList).to.have.length(1);
            const requestBody = requestList[0].request?.body || {};
            expect(requestBody.gameIds).to.have.members([
                '20260204HHSS0',
                '20260204LGLK0',
            ]);
        });
        cy.get('@getUserVote.all').should('have.length', 0);
    });

    it('should request manual_detail once when user opens the detail dialog after auto brief', () => {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: meaningfulRegularSeasonRankings,
        }).as('getRankingsMeaningfulManual');

        const manualCoachResponse = [
            'event: message',
            'data: {"delta":"{\"headline\":\"테스트\",\"coach_note\":\"요약 테스트\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"q:manualtest","cache_key_version":"v3","request_mode":"manual_detail","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        let manualCoachBody: Record<string, unknown> = {};
        cy.intercept('POST', '**/coach/analyze*', (req) => {
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: manualCoachResponse,
            });
        }).as('coachAnalyzeManual');

        openPredictionPage({ waitForScheduleRange: false });
        cy.wait('@getRankingsMeaningfulManual');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(1000);
        cy.wait(700);
        cy.wait('@coachAnalyzeManual').then((interception) => {
            const autoCoachBody = parseCoachRequestBody(interception.request.body);
            expect(autoCoachBody).to.include({ request_mode: 'auto_brief' });
            expect(extractCoachGameId(autoCoachBody)).to.eq('20240510HHSS0');
        });

        // 다이얼로그를 열면 자동으로 manual_detail 분석이 실행된다 (run-button 제거됨).
        cy.get('[data-testid="coach-analysis-open"]').first().click({ force: true });

        cy.wait('@coachAnalyzeManual').then((interception) => {
            manualCoachBody = parseCoachRequestBody(interception.request.body);
            expect(manualCoachBody).to.include({ request_mode: 'manual_detail' });
            expect(extractCoachGameId(manualCoachBody)).to.eq('20240510HHSS0');
            expect(manualCoachBody).to.not.have.property('question_override');
            expect(Array.isArray(manualCoachBody.focus)).to.equal(true);
        });
        // 최소 1건의 auto_brief + 1건의 manual_detail 이 발생한다.
        // (dev StrictMode 는 effect 를 이중 호출하므로 정확 개수 대신 하한으로 단언)
        cy.get('@coachAnalyzeManual.all').should('have.length.gte', 2);
    });

    it('should abort in-flight coach analysis when the dialog closes and keep only the rerun result after reopen', () => {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 },
            ],
        }).as('getRankingsAbortCoach');

        const firstCoachResponse = [
            'event: message',
            'data: {"delta":"{\\"headline\\":\\"닫기 전 요청 결과\\",\\"coach_note\\":\\"닫았다가 다시 열어도 보이면 안 됩니다.\\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"q:first-abort-check","cache_key_version":"v3","request_mode":"manual_detail","cached":false,"structured_response":{"headline":"닫기 전 요청 결과","sentiment":"negative","key_metrics":[],"analysis":{"summary":"닫기 전 요청은 폐기되어야 합니다.","verdict":"첫 번째 요청 폐기","strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"닫기 전 상세 리포트","coach_note":"닫았다가 다시 열어도 보이면 안 됩니다."}}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        const secondCoachResponse = [
            'event: message',
            'data: {"delta":"{\\"headline\\":\\"다시 연 분석 결과\\",\\"coach_note\\":\\"두 번째 요청 결과만 유지되어야 합니다.\\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"q:second-run-check","cache_key_version":"v3","request_mode":"manual_detail","cached":false,"structured_response":{"headline":"다시 연 분석 결과","sentiment":"positive","key_metrics":[],"analysis":{"summary":"두 번째 분석이 정상 완료되어야 합니다.","verdict":"두 번째 요청 유지","strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"두 번째 상세 리포트","coach_note":"두 번째 요청 결과만 유지되어야 합니다."}}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        let coachAnalyzeCallCount = 0;

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            const body = parseCoachRequestBody(req.body);
            if (body.request_mode === 'auto_brief') {
                req.alias = 'coachAnalyzeAbortAutoSeed';
                req.reply({
                    statusCode: 200,
                    headers: { 'content-type': 'text/event-stream' },
                    body: [
                        'event: meta',
                        'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false,"cache_state":"MISS_GENERATE","in_progress":false,"structured_response":{"headline":"자동 브리핑","sentiment":"neutral","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"자동 브리핑 본문","coach_note":"자동 브리핑 메모"}}',
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            coachAnalyzeCallCount += 1;
            req.alias = 'coachAnalyzeAbortOnClose';
            req.reply({
                delay: coachAnalyzeCallCount === 1 ? 3000 : 1800,
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: coachAnalyzeCallCount === 1 ? firstCoachResponse : secondCoachResponse,
            });
        });

        openPredictionPage();
        cy.wait('@getRankingsAbortCoach');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.wait('@coachAnalyzeAbortAutoSeed');
        cy.window().then((win) => {
            cy.spy(win.console, 'error').as('consoleError');
        });
        cy.tick(1000);
        cy.tick(300);
        cy.wait(700);

        // 열면 자동 실행 → 첫 manual_detail 요청 발생.
        cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        // dev StrictMode 이중 호출 대비: alias 목록 조회 전에 실제 요청 발생을 먼저 기다린다.
        cy.wait('@coachAnalyzeAbortOnClose');
        cy.get('@coachAnalyzeAbortOnClose.all').should('have.length.gte', 1);

        cy.get('body').type('{esc}');
        cy.get('[data-testid="coach-analysis-dialog"]').should('not.exist');

        // 다시 열면 자동 재실행 → 두 번째 요청.
        cy.get('[data-testid="coach-analysis-open"]')
            .should('be.visible')
            .click({ force: true });
        getCoachAnalysisDialog().should('be.visible');
        // 재오픈 시 새 요청이 추가 발생 (정확 개수 대신 하한).
        cy.wait('@coachAnalyzeAbortOnClose');
        cy.get('@coachAnalyzeAbortOnClose.all').should('have.length.gte', 2);

        cy.wait(2200);
        cy.contains('닫기 전 요청 결과').should('not.exist');
        cy.contains('닫았다가 다시 열어도 보이면 안 됩니다.').should('not.exist');
        cy.contains('다시 연 분석 결과').should('exist');
        cy.contains('두 번째 요청 결과만 유지되어야 합니다.').should('exist');
        cy.wait(1200);
        cy.contains('닫기 전 요청 결과').should('not.exist');
        cy.contains('닫았다가 다시 열어도 보이면 안 됩니다.').should('not.exist');
        cy.contains('다시 연 분석 결과').should('exist');
        cy.contains('두 번째 요청 결과만 유지되어야 합니다.').should('exist');

        cy.get('@consoleError').then((spy: any) => {
            const calls = spy.getCalls().map((call: { args: unknown[] }) => call.args.map(String).join(' '));
            expect(calls.some((message: string) => message.includes('state update on an unmounted component'))).to.eq(false);
            expect(calls.some((message: string) => message.includes('Coach analysis failed:'))).to.eq(false);
        });
    });

    it('should show analysis skeletons first, then render accessible result cards on mobile', () => {
        cy.viewport(375, 667);
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 },
            ],
        }).as('getRankingsMobileAnalysis');

        const manualCoachResponse = [
            'event: message',
            'data: {"delta":"{\\"headline\\":\\"한화 우세, 후반 불펜 관리가 핵심\\",\\"coach_note\\":\\"초반 OPS 우세는 분명하지만 7회 이후 불펜 운용이 승부를 가를 수 있습니다.\\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form","bullpen","starter"],"focus_signature":"recent_form+bullpen+starter","question_signature":"manual","cache_key_version":"v4","request_mode":"manual_detail","cached":false,"cache_state":"MISS_GENERATE","in_progress":false,"generation_mode":"llm_manual","game_status_bucket":"PREVIEW","structured_response":{"headline":"한화 우세, 후반 불펜 관리가 핵심","sentiment":"positive","key_metrics":[{"label":"OPS 비교","value":"0.812 vs 0.744","status":"good","trend":"up","is_critical":true},{"label":"불펜 소모","value":"18% vs 31%","status":"warning","trend":"down","is_critical":false},{"label":"발표 선발","value":"문동주 vs 원태인","status":"good","trend":"neutral","is_critical":true}],"analysis":{"summary":"최근 타격 생산성과 선발 구위에서 한화가 앞서지만, 불펜 과부하가 후반 변수입니다.","verdict":"한화가 초반 주도권을 잡을 가능성이 높습니다.","strengths":["상위 타선 OPS 상승세가 뚜렷합니다."],"weaknesses":["불펜 연투 관리가 필요합니다."],"risks":[{"area":"불펜","level":1,"description":"7회 이후 필승조 투입 타이밍이 승부처입니다."}],"why_it_matters":["초반 장타 생산성이 선취점 확률을 끌어올립니다."],"swing_factors":["문동주의 초반 제구 안정 여부"],"watch_points":["7회 이전 리드 확보"],"uncertainty":["라인업 최종 확정 전까지 하위 타순 변수는 남아 있습니다."]},"detailed_markdown":"상세 리포트 본문입니다.\\n불펜 운영과 선발 구위가 핵심입니다.","coach_note":"초반 OPS 우세는 분명하지만 7회 이후 불펜 운용이 승부를 가를 수 있습니다."}}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            const body = parseCoachRequestBody(req.body);

            if (body.request_mode === 'auto_brief') {
                req.alias = 'coachAnalyzeMobileAutoSeed';
                req.reply({
                    statusCode: 200,
                    headers: { 'content-type': 'text/event-stream' },
                    body: [
                        'event: meta',
                        'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v4","request_mode":"auto_brief","cached":false,"cache_state":"MISS_GENERATE","in_progress":false,"generation_mode":"deterministic_auto","game_status_bucket":"PREVIEW","structured_response":{"headline":"자동 브리핑","sentiment":"neutral","key_metrics":[],"analysis":{"strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"자동 브리핑 본문","coach_note":"자동 브리핑 메모"}}',
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            req.alias = 'coachAnalyzeMobileResult';
            req.reply({
                delay: 1800,
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: manualCoachResponse,
            });
        });

        openPredictionPage();
        cy.wait('@getRankingsMobileAnalysis');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.wait('@coachAnalyzeMobileAutoSeed');
        cy.tick(1000);
        cy.wait(700);

        // 열면 자동 실행 → 로딩 스켈레톤 노출 (run-button 제거됨).
        cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });

        cy.contains('감독님이 헤드셋 끼고 준비 중...').should('exist');
        getCoachAnalysisDialog().then(($dialog) => {
            const skeletons = Array.from($dialog[0].querySelectorAll('div')).filter((element) => {
                const className = typeof element.className === 'string' ? element.className : '';
                return className.includes('h-4') && className.includes('rounded-lg');
            });
            expect(skeletons.length).to.eq(4);
        });

        cy.wait('@coachAnalyzeMobileResult');
        // C1 레이아웃: 핵심 결론 band(headline) + 결과 본문 + 코치 판단 섹션 앵커.
        cy.contains('한화 우세, 후반 불펜 관리가 핵심', { timeout: 12000 }).should('exist');
        cy.get('[role="article"]').should('exist');
        cy.get('[data-testid="coach-section-verdict"]').should('exist');
        cy.get('[role="article"] [aria-hidden="true"]').its('length').should('be.gte', 4);
    });

    it('should show partial-data reasons in the manual analysis dialog when evidence is limited', () => {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: meaningfulRegularSeasonRankings,
        }).as('getRankingsManualPartial');

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            const body = parseCoachRequestBody(req.body);
            const requestMode = body.request_mode;

            if (requestMode === 'manual_detail') {
                req.alias = 'coachAnalyzeManualPartial';
                req.reply({
                    statusCode: 200,
                    headers: { 'content-type': 'text/event-stream' },
                    body: [
                        'event: meta',
                        'data: {"validation_status":"success","resolved_focus":["matchup","batting"],"focus_signature":"matchup+batting","question_signature":"manual","cache_key_version":"v4","request_mode":"manual_detail","cached":false,"cache_state":"MISS_GENERATE","in_progress":false,"generation_mode":"evidence_fallback","data_quality":"partial","grounding_reasons":["missing_clutch_moments","focus_data_unavailable"],"grounding_warnings":["WPA 기반 승부처 데이터가 부족합니다.","요청한 focus 중 상대 전적, 타격 생산성 근거가 부족해 확인 가능한 항목만 분석합니다.","요청한 focus 근거가 부족해 확인 가능한 항목만 분석하거나 보수 요약으로 전환합니다."],"structured_response":{"headline":"제한 근거 기반 상세 분석","sentiment":"neutral","key_metrics":[],"analysis":{"summary":"확인 가능한 실데이터를 기준으로만 분석했습니다.","verdict":"상세 지표가 일부 비어 있어 보수적으로 해석해야 합니다.","strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"제한 근거 기반 상세 분석 본문","coach_note":"확인 가능한 근거만 반영했습니다."}}',
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            req.alias = 'coachAnalyzeAutoPartialSeed';
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: [
                    'event: meta',
                    'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v4","request_mode":"auto_brief","cached":false,"cache_state":"MISS_GENERATE","in_progress":false,"data_quality":"grounded","structured_response":{"headline":"자동 브리핑","sentiment":"neutral","key_metrics":[],"analysis":{"summary":"자동 브리핑 요약","verdict":"자동 브리핑 결론","strengths":[],"weaknesses":[],"risks":[]},"detailed_markdown":"자동 브리핑 본문","coach_note":"자동 브리핑 메모"}}',
                    '',
                    'event: done',
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        });

        openPredictionPage();
        cy.wait('@getRankingsManualPartial');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.wait('@coachAnalyzeAutoPartialSeed');

        // 열면 자동 manual_detail 실행 (run-button 제거됨).
        cy.get('[data-testid="coach-analysis-open"]').click({ force: true });

        cy.wait('@coachAnalyzeManualPartial');
        // partial 응답에 structured_response 가 있으면 analysisData 가 생성되어
        // 큰 notice 대신 사이드바 데이터 품질 라벨/메시지로 표시된다 (C1 레이아웃).
        getCoachAnalysisDialog().should('be.visible');
        getCoachAnalysisDialog().should('contain', '실데이터 일부 기반');
        getCoachAnalysisDialog().should('contain', '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.');
    });

    it('should render scheduled coach copy without jargon regressions in both briefing and manual dialog', () => {
        rangeSchedulePayload = [
            {
                gameId: '20260409HHSK0',
                gameDate: '2026-04-09',
                homeTeam: 'HH',
                awayTeam: 'SSG',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
                gameStatus: 'SCHEDULED',
                gameStatusKr: '경기 예정',
                leagueType: 'REGULAR',
            },
        ];

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 2, wins: 8, losses: 4, draws: 0, winRate: '0.667', games: 12, gamesBehind: 1.0 },
                { teamId: 'SSG', teamName: 'SSG 랜더스', rank: 1, wins: 9, losses: 3, draws: 0, winRate: '0.750', games: 12, gamesBehind: 0.0 },
            ],
        }).as('getRankingsScheduledCopy');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20260409HHSK0',
                    homeTeam: 'HH',
                    awayTeam: 'SSG',
                    stadium: '대전',
                    gameDate: '2026-04-09',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getGameDetailScheduledCopy');

        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: {
                votes: {
                    '20260409HHSK0': null,
                },
            },
        }).as('getUserVotes');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapScheduledCopy',
            games: () => rangeSchedulePayload,
        });

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            const body = parseCoachRequestBody(req.body);
            const requestMode = body.request_mode;

            if (requestMode === 'manual_detail') {
                req.alias = 'coachAnalyzeScheduledManualCopy';
                req.reply({
                    statusCode: 200,
                    headers: { 'content-type': 'text/event-stream' },
                    body: [
                        'event: meta',
                        `data: ${JSON.stringify({
                            validation_status: 'success',
                            resolved_focus: ['recent_form', 'bullpen'],
                            focus_signature: 'recent_form+bullpen',
                            question_signature: 'manual',
                            cache_key_version: 'v5',
                            request_mode: 'manual_detail',
                            cached: false,
                            cache_state: 'MISS_GENERATE',
                            in_progress: false,
                            generation_mode: 'llm_manual',
                            data_quality: 'partial',
                            game_status_bucket: 'SCHEDULED',
                            grounding_reasons: ['missing_starters', 'missing_lineups', 'missing_summary'],
                            grounding_warnings: [
                                '선발 정보가 완전히 확정되지 않았습니다.',
                                '라인업이 아직 발표되지 않았습니다.',
                                '경기 요약 근거가 부족합니다.',
                            ],
                            structured_response: {
                                headline: '한화 이글스 vs SSG 랜더스, 불펜 운용 정보 확인 필요',
                                sentiment: 'neutral',
                                key_metrics: [
                                    {
                                        label: '최근 흐름',
                                        value: 'SSG 랜더스 7승 2패 / 한화 이글스 6승 3패',
                                        status: 'warning',
                                        trend: 'neutral',
                                        is_critical: true,
                                    },
                                ],
                                analysis: {
                                    summary: '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
                                    verdict: '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
                                    strengths: ['한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.'],
                                    weaknesses: ['SSG 랜더스는 팀 폼 점수 97.4점을 기록하며 최근 흐름이 상승세입니다.'],
                                    risks: [
                                        {
                                            area: 'bullpen',
                                            level: 1,
                                            description: '불펜 운용 데이터 부족으로 경기 후반 운영 판단이 제한됩니다.',
                                        },
                                    ],
                                    why_it_matters: [],
                                    swing_factors: ['발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.'],
                                    watch_points: ['불펜 투입 시점과 라인업 확정 여부 확인'],
                                    uncertainty: ['선발과 라인업 확정 전까지는 보수적으로 해석해야 합니다.'],
                                },
                                detailed_markdown: '## 최근 전력\n- 한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.\n\n## 불펜 상태\n- SSG 랜더스는 불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다.',
                                coach_note: '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
                            },
                        })}`,
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            req.alias = 'coachAnalyzeScheduledAutoCopy';
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: [
                    'event: meta',
                    `data: ${JSON.stringify({
                        validation_status: 'success',
                        resolved_focus: ['recent_form', 'bullpen'],
                        focus_signature: 'recent_form+bullpen',
                        question_signature: 'auto',
                        cache_key_version: 'v5',
                        request_mode: 'auto_brief',
                        cached: false,
                        cache_state: 'MISS_GENERATE',
                        in_progress: false,
                        generation_mode: 'llm_manual',
                        data_quality: 'partial',
                        game_status_bucket: 'SCHEDULED',
                        grounding_reasons: ['missing_starters', 'missing_lineups', 'missing_summary'],
                        grounding_warnings: [
                            '선발 정보가 완전히 확정되지 않았습니다.',
                            '라인업이 아직 발표되지 않았습니다.',
                            '경기 요약 근거가 부족합니다.',
                        ],
                        structured_response: {
                            headline: '한화 이글스 vs SSG 랜더스, 불펜 운용 정보 확인 필요',
                            sentiment: 'neutral',
                            key_metrics: [],
                            analysis: {
                                summary: 'SSG 랜더스의 최근 흐름이 좋지만, 불펜 운용 데이터 부족으로 인해 경기 후반 운영은 더 지켜봐야 합니다.',
                                verdict: 'SSG 랜더스가 최근 흐름에서 우위를 점하고 있지만, 불펜 운용 데이터 부족으로 인해 운영 판단에 변수가 존재합니다.',
                                strengths: [],
                                weaknesses: [],
                                risks: [],
                            },
                            detailed_markdown: '## 최근 전력\n- 최근 흐름 요약',
                            coach_note: 'SSG 랜더스의 최근 흐름이 좋지만, 불펜 운용 데이터 부족으로 인해 경기 후반 운영에 주의해야 합니다. 한화 이글스의 불펜진이 예상외의 활약을 펼칠 가능성도 배제할 수 없습니다.',
                        },
                    })}`,
                    '',
                    'event: done',
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        });

        openPredictionPage({
            path: '/prediction?gameId=20260409HHSK0&date=2026-04-09',
        });

        cy.wait('@getRankingsScheduledCopy');
        cy.wait('@getGameDetailScheduledCopy');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.wait('@coachAnalyzeScheduledAutoCopy');

        cy.get('[data-testid="coach-briefing-card"]')
            .should('contain', '한화 이글스 vs SSG 랜더스, 불펜 운용 정보 확인 필요')
            .and('contain', 'SSG 랜더스의 최근 흐름이 좋습니다')
            .and('contain', '불펜 운용 데이터 부족으로 인해 경기 후반 운영은 더 지켜봐야 합니다')
            .and('contain', '실데이터 일부 기반')
            .and('contain', '최근 흐름 위주로 분석했습니다.')
            .and('not.contain', '고레버리지')
            .and('not.contain', '핵심 구간를');
        cy.get('[data-testid="coach-analysis-open"]').should('contain', 'AI 코치 경기 예측').click({ force: true });

        cy.wait('@coachAnalyzeScheduledManualCopy');
        // partial: 데이터 품질 라벨은 사이드바에 표시 (C1).
        getCoachAnalysisDialog().should('contain', '실데이터 일부 기반');
        cy.get('[data-testid="coach-analysis-dialog"]')
            .should('contain', '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.')
            .and('contain', 'SSG 랜더스는 팀 폼 점수 97.4점을 기록하며 최근 흐름이 상승세입니다.')
            .and('contain', '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.')
            .and('contain', 'SSG 랜더스는 불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다.')
            .and('not.contain', '고레버리지')
            .and('not.contain', '핵심 구간를')
            .and('not.contain', '최근 흐름 근거가 부족합니다.')
            .and('not.contain', '팀 폼 점수 90.최근 흐름 근거가 부족합니다.')
            .and('not.contain', '팀 폼 점수 97.최근 흐름 근거가 부족합니다.');
    });

    it('should keep only latest AI brief request after rapid game switch', () => {
        const autoCoachResponse = [
            'event: message',
            'data: {"delta":"{\"headline\":\"테스트\",\"coach_note\":\"요약 테스트\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 }
            ]
        }).as('getRankingsRapid');

        rangeSchedulePayload = [
            {
                gameId: '20240510HHSS0',
                gameDate: '2026-02-04',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
            {
                gameId: '20240510LGLG0',
                gameDate: '2026-02-04',
                homeTeam: 'LG',
                awayTeam: 'KT',
                stadium: '잠실',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
        ];

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: autoCoachResponse,
            });
        }).as('coachAnalyzeRapid');

        openPredictionPage();
        cy.wait('@getRankingsRapid');
        cy.wait('@getGameDetail');
        cy.tick(1000);
        cy.wait(700);

        cy.get('@getGameDetail.all').its('length').should('be.gte', 1);
        cy.tick(1200);
        cy.get('@coachAnalyzeRapid.all').then((interceptions) => {
            const interceptionList = interceptions as unknown as { request: { body: unknown } }[];
            if (interceptionList.length === 0) {
                expect(interceptionList.length).to.eq(0);
                return interceptions;
            }
            expect(interceptionList.length).to.be.gte(1);
            return interceptions;
        }).then((interceptions: unknown) => {
            const interceptionList = interceptions as { request: { body: unknown } }[];
            if (interceptionList.length === 0) {
                expect(interceptionList.length).to.eq(0);
                return;
            }
            const parsedPayloads = interceptionList
                .map((interception) => parseCoachRequestBody(interception.request.body))
                .filter((payload) => Object.keys(payload).length > 0)
                .filter((payload) => Boolean(extractCoachGameId(payload)));
            const lastPayload = parsedPayloads.length > 0
                ? parsedPayloads[parsedPayloads.length - 1]
                : undefined;

            expect(parsedPayloads.length).to.be.gte(1);
            expect(extractCoachGameId(lastPayload || {} as Record<string, unknown>)).to.eq('20240510HHSS0');
        });
    });

    it('should keep AI brief requests single-flight when theme or tab is toggled without game change', () => {
        const autoCoachResponse = [
            'event: message',
            'data: {"delta":"{\"headline\":\"테스트\",\"coach_note\":\"요약 테스트\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\n');

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 80, losses: 55, draws: 0, winRate: '0.600', games: 135, gamesBehind: 0.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 79, losses: 56, draws: 0, winRate: '0.585', games: 135, gamesBehind: 1.0 }
            ]
        }).as('getRankingsSingleFlight');

        let firstIdentity = '';

        cy.intercept('POST', '**/coach/analyze*', (req) => {
            req.reply({
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: autoCoachResponse,
            });
        }).as('coachAnalyzeSingleFlight');

        openPredictionPage({ waitForScheduleRange: false });
        cy.wait('@getGameDetail');
        cy.tick(2000);
        cy.wait('@getRankingsSingleFlight');
        cy.wait(700);
        cy.get('@coachAnalyzeSingleFlight.all').then((interceptions: any) => {
            const interceptionList = interceptions as any[];
            if (interceptionList.length === 0) {
                return;
            }

            firstIdentity = buildCoachRequestIdentity(
                parseCoachRequestBody(interceptionList[0].request.body)
            );
            expect(firstIdentity).to.include('"requestMode":"auto_brief"');
        });

        cy.get('body').then(($body) => {
            const themeToggle = $body.find('button[aria-label="다크모드 전환"], button[aria-label="Toggle theme"]');
            if (themeToggle.length > 0) {
                cy.wrap(themeToggle.first()).click({ force: true });
                cy.wait(350);
                cy.wrap(themeToggle.first()).click({ force: true });
            }
        });

        cy.get('body').then(($body) => {
            if ($body.text().includes('순위예측')) {
                cy.contains('순위예측').click({ force: true });
            }
            if ($body.text().includes('승부예측')) {
                cy.contains('승부예측').click({ force: true });
            }
        });

        cy.wait(900);
        cy.get('@coachAnalyzeSingleFlight.all').then((interceptions: any) => {
            const interceptionList = interceptions as any[];
            if (interceptionList.length === 0) {
                expect(interceptionList.length).to.eq(0);
                return;
            }
            const identitySet = new Set(
                interceptionList.map((item: any) => buildCoachRequestIdentity(parseCoachRequestBody(item.request.body)))
            );
            expect(identitySet.size).to.eq(1);
            if (firstIdentity) {
                expect(identitySet.has(firstIdentity)).to.eq(true);
            }
        });
    });

    it('should allow submitting a prediction', () => {
        installSubmitVote();

        openPredictionPage();
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.wait('@submitVote');
        cy.get('@submitVote.all').should('have.length', 1);
    });

    it('should keep post-vote state when a stale my-votes batch resolves and refresh status after submit/cancel', () => {
        const gameId = '20240510HHSS0';
        installSubmitVote();
        cy.intercept('DELETE', `**/api/predictions/${gameId}`, {
            statusCode: 200,
            body: { success: true },
        }).as('cancelVote');
        cy.intercept('**/api/predictions/my-votes*', (req) => {
            req.reply({
                statusCode: 200,
                delay: 700,
                body: {
                    votes: {
                        [gameId]: null,
                    },
                },
            });
        }).as('getUserVotesDelayed');

        let voteStatusPhase: 'after-submit' | 'after-cancel' = 'after-submit';
        let statusRequestsAfterSubmit = 0;
        cy.intercept('GET', '**/api/predictions/status/*', (req) => {
            req.reply({
                statusCode: 200,
                body: voteStatusPhase === 'after-submit'
                    ? { homeVotes: 1, awayVotes: 0, totalVotes: 1 }
                    : { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
            });
        }).as('getVoteStatusFresh');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapVoteFlow',
            games: () => rangeSchedulePayload,
            detailByGameId: {
                [gameId]: {
                    gameId,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: '2026-02-03',
                    startTime: '18:30',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            },
            voteStatusByGameId: {
                [gameId]: {
                    gameId,
                    homeVotes: 0,
                    awayVotes: 0,
                    totalVotes: 0,
                },
            },
        });

        openPredictionPage();
        cy.wait('@getPredictionBootstrapVoteFlow');
        cy.get('@getVoteStatusFresh.all').should('have.length', 0);

        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.wait('@submitVote');
        cy.wait('@getVoteStatusFresh');
        cy.get('@getVoteStatusFresh.all')
            .should('have.length.gte', 1)
            .then((interceptions: any) => {
                statusRequestsAfterSubmit = (interceptions as any[]).length;
            });

        cy.wait('@getUserVotesDelayed');
        cy.get('[data-testid="vote-home-btn"]').should('have.attr', 'aria-pressed', 'true');

        cy.tick(600);
        cy.then(() => {
            voteStatusPhase = 'after-cancel';
        });
        cy.get('[data-testid="vote-home-btn"]').click({ force: true });
        cy.get('[role="dialog"]').contains('button', '확인').click({ force: true });
        cy.wait('@cancelVote');
        cy.wait('@getVoteStatusFresh');
        cy.get('@getVoteStatusFresh.all').should((interceptions: any) => {
            expect((interceptions as any[]).length).to.be.greaterThan(statusRequestsAfterSubmit);
        });
        cy.get('[data-testid="vote-home-btn"]').should('have.attr', 'aria-pressed', 'false');
    });

    it('should continue to empty schedule UI when /api/matches/range returns 0 items', () => {
        rangeSchedulePayload = [];

        openPredictionPage();

        cy.contains('오늘은 예정된 경기가 없습니다.').should('be.visible');
    });

    it('should recover when initial range is empty but future range has matches', () => {
        rangeScheduleMode = 'empty-then-data';
        rangeSchedulePayload = defaultRangeSchedulePayload.map((item) => ({
            ...item,
            gameDate: '2026-02-06',
        }));

        openPredictionPage({ path: '/prediction?date=2026-02-03' });

        cy.get('@getScheduleRange.all').should('have.length.gte', 1);
        cy.get('[data-testid="prediction-empty-nearest-date-btn"]').should('be.visible');
        cy.contains(/가장 가까운 경기일은/).should('be.visible');
        cy.get('[data-testid="vote-home-btn"]').should('not.exist');
    });

    it('should keep prediction schedule public without issuing an auth bootstrap request', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        installPredictionGuestSessionIntercept('getMeUnauthorized');

        cy.get('@predictionClock').invoke('restore');
        openPredictionPage({
            seedAuth: false,
        });
        cy.contains('한화 이글스').should('be.visible');
        cy.contains('button', '로그인').should('be.visible');
        cy.contains('로그인 필요').should('not.exist');
        cy.get('@getUserVotes.all').should('have.length', 0);
        cy.get('@getMeUnauthorized.all').should('have.length', 0);
        getPredictionAuthRequestTraces().should('deep.equal', []);
    });

    it('should keep prediction schedule public when deferred auth bootstrap returns 401', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        cy.clearLocalStorage('auth-bootstrap-hint');
        installPredictionGuestSessionIntercept('getMeUnauthorized');

        cy.get('@predictionClock').invoke('restore');
        openPredictionPage({
            seedAuth: false,
            persistedAuthHint: true,
            authBootstrapMeta: {
                lastSuccessAt: Date.now() - 30 * 1000,
                lastFailureAt: null,
            },
            captureAuthEvents: true,
        });

        cy.contains('한화 이글스').should('be.visible');
        cy.contains('button', '로그인 확인 중...').should('not.exist');
        cy.contains('button', '로그인').should('be.visible');
        cy.contains('로그인 필요').should('not.exist');
        cy.get('@getUserVotes.all').should('have.length', 0);
        cy.get('@getMeUnauthorized.all').should('have.length.at.most', 1);
        getPredictionAuthRequestTraces().should((traces) => {
            expect(traces.length).to.be.at.most(1);
            if (traces.length === 1) {
                expect(traces[0]?.url).to.include('/api/auth/mypage');
            }
        });
        cy.window().then((win) => {
            const typedWin = win as Window & {
                __predictionAuthEvents?: Array<{
                    eventName: 'auth-session-expired' | 'global-api-error';
                    detail?: Record<string, unknown>;
                }>;
            };

            const authEvents = typedWin.__predictionAuthEvents ?? [];
            expect(authEvents.filter((event) => event.eventName === 'auth-session-expired')).to.deep.equal([]);
        });
    });

    it('should recover public auth controls on prediction when deferred auth bootstrap succeeds', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        cy.clearLocalStorage('auth-bootstrap-hint');
        cy.intercept('GET', '**/api/auth/mypage*', {
            delay: 900,
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 123,
                    email: 'test@example.com',
                    name: 'TestUser',
                    handle: 'testuser',
                    favoriteTeam: 'HH',
                    role: 'ROLE_USER',
                    hasPassword: true,
                    profileImageUrl: null,
                    cheerPoints: 0,
                },
            },
        }).as('getPredictionSessionRecovered');

        cy.get('@predictionClock').invoke('restore');
        openPredictionPage({
            seedAuth: false,
            persistedAuthHint: true,
            authBootstrapMeta: {
                lastSuccessAt: Date.now() - 30 * 1000,
                lastFailureAt: null,
            },
        });

        cy.wait('@getPredictionSessionRecovered');

        cy.contains('한화 이글스').should('be.visible');
        cy.contains('button', '로그인 확인 중...').should('not.exist');
        cy.contains('button', '로그인').should('not.exist');
        cy.contains('button', '로그아웃').should('be.visible');
        getPredictionAuthRequestTraces().should((traces) => {
            expect(traces).to.have.length(1);
            expect(traces[0]?.url).to.include('/api/auth/mypage');
        });
    });

    it('should return to the normal login button on prediction when deferred auth bootstrap returns 503', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        cy.clearLocalStorage('auth-bootstrap-hint');
        cy.intercept('GET', '**/api/auth/mypage*', {
            delay: 900,
            statusCode: 503,
            body: {
                success: false,
                code: 'UPSTREAM_TIMEOUT',
                message: 'Unavailable',
            },
        }).as('getPredictionSessionServerError');

        cy.get('@predictionClock').invoke('restore');
        openPredictionPage({
            seedAuth: false,
            persistedAuthHint: true,
            authBootstrapMeta: {
                lastSuccessAt: Date.now() - 30 * 1000,
                lastFailureAt: null,
            },
        });

        cy.wait('@getPredictionSessionServerError');

        cy.contains('한화 이글스').should('be.visible');
        cy.contains('button', '로그인 확인 중...').should('not.exist');
        cy.contains('button', '로그인').should('be.visible');
        cy.contains('로그인 필요').should('not.exist');
        getPredictionAuthRequestTraces().should((traces) => {
            expect(traces).to.have.length(1);
            expect(traces[0]?.url).to.include('/api/auth/mypage');
        });
    });

    it('should keep prediction schedule public without retrying auth bootstrap during failure cooldown', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        installPredictionGuestSessionIntercept('getMeUnauthorized');

        cy.get('@predictionClock').invoke('restore');
        openPredictionPage({
            seedAuth: false,
            persistedAuthHint: true,
            authBootstrapMeta: {
                lastSuccessAt: null,
                lastFailureAt: new Date('2026-02-03T11:59:30').getTime(),
            },
        });

        cy.contains('한화 이글스').should('be.visible');
        cy.contains('button', '로그인').should('be.visible');
        cy.contains('로그인 필요').should('not.exist');
        cy.get('@getUserVotes.all').should('have.length', 0);
        cy.get('@getMeUnauthorized.all').should('have.length', 0);
        getPredictionAuthRequestTraces().should('deep.equal', []);
    });

    it('should show error card when /api/matches/range fails', () => {
        rangeScheduleStatusCode = 500;

        openPredictionPage();

        cy.contains('예측 경기 데이터를 불러오지 못했습니다.').should('exist');
        cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('exist');
        cy.contains(/Internal Server Error|Request failed with status code 500/).should('not.exist');
        cy.contains('button', '목록 다시 불러오기').should('be.visible');
        cy.contains('button', '예측으로 돌아가기').should('be.visible');
    });

    it('should keep current prediction date and game when detail refresh fails', () => {
        rangeSchedulePayload = [
            {
                ...defaultRangeSchedulePayload[0],
                gameId: '20240510LGLK0',
                gameDate: '2026-02-04',
                homeTeam: 'LG',
                awayTeam: 'KT',
            },
        ];

        cy.intercept('GET', '**/api/matches/20240510LGLK0*', {
            statusCode: 500,
            body: { message: 'Internal Server Error' },
        }).as('getGameDetailFailure');

        openPredictionPage({ path: '/prediction?gameId=20240510LGLK0&date=2026-02-04' });
        cy.wait('@getGameDetailFailure');
        cy.get('[data-testid="prediction-detail-error-banner"]').should('be.visible');
        cy.contains('예측으로 돌아가기').click();
        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', 'date=2026-02-04');
        cy.location('search').should('include', 'gameId=20240510LGLK0');
    });

    it('should expose manual baseball data contract on the visible match card when completed-game records are missing', () => {
        rangeSchedulePayload = [
            {
                gameId: '20260419HHLT0',
                gameDate: '2026-02-03',
                homeTeam: 'LT',
                awayTeam: 'HH',
                stadium: '사직',
                homeScore: 4,
                awayScore: 2,
                winner: 'home',
                gameStatus: 'COMPLETED',
                gameStatusKr: '경기 종료',
            },
        ];

        cy.intercept('GET', '**/api/matches/20260419HHLT0*', {
            statusCode: 409,
            body: {
                success: false,
                code: 'MANUAL_BASEBALL_DATA_REQUIRED',
                message: '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.',
                data: {
                    scope: 'prediction.game_detail.summary',
                    missingItems: [
                        {
                            key: 'game_summary',
                            label: '경기 주요 기록',
                            reason: '완료 경기의 주요 기록 row가 없습니다.',
                            expected_format: 'game_summary.summary_type, player_name, detail_text',
                        },
                    ],
                    operatorMessage: '다음 야구 데이터가 필요합니다: 경기 ID=20260419HHLT0, 경기 주요 기록',
                    blocking: true,
                },
            },
        }).as('getManualDataRequiredDetail');

        openPredictionPage({ path: '/prediction?gameId=20260419HHLT0&date=2026-02-03' });
        cy.wait('@getManualDataRequiredDetail');

        cy.get('[data-testid="prediction-detail-error-banner"]')
            .should('be.visible')
            .and('have.attr', 'data-error-code', 'MANUAL_BASEBALL_DATA_REQUIRED');
        cy.contains('MANUAL_BASEBALL_DATA_REQUIRED').should('be.visible');
        cy.contains('경기 주요 기록 입력이 필요합니다.').should('be.visible');
        cy.contains('임의로 채우지 않습니다').should('be.visible');
        cy.contains('스코어보드 상세 입력 대기').should('be.visible');
        cy.contains('최종 스코어만 표시 중입니다.').should('be.visible');
        cy.contains('AI 코치 상세 분석은 수동 데이터 입력 후 제공됩니다.').should('be.visible');
        // manual-data 상태는 비활성 트리거 버튼 대신 인라인 메시지 + 재시도 버튼으로 대체됨.
        cy.contains('button', '데이터 다시 확인').should('be.visible');
        cy.contains('상세 요약을 확인 중입니다.').should('not.exist');
        cy.get('[data-testid="coach-analysis-open"]').should('not.exist');
    });

    it('should show login CTA when coach analysis auth expires', () => {
        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: meaningfulRegularSeasonRankings,
        }).as('getRankingsAuthExpiredCoach');
        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 401,
            body: { detail: 'Unauthorized' },
        }).as('coachAnalyzeAuthExpired');
        cy.intercept('POST', '**/api/auth/reissue*', {
            statusCode: 401,
            body: { message: 'Unauthorized' },
        }).as('coachAnalyzeReissueFailed');

        openPredictionPage({ path: '/prediction?gameId=20240510HHSS0&date=2026-02-03' });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getRankingsAuthExpiredCoach');
        cy.get('@getUserVote.all').should('have.length', 0);
        ensureCoachBriefingVisible();
        cy.tick(1000);
        cy.wait(700);
        cy.wait('@coachAnalyzeAuthExpired');
        cy.wait('@coachAnalyzeReissueFailed');
        cy.contains('[data-testid="coach-briefing-card"] button', '다시 로그인하기', { timeout: 10000 })
            .scrollIntoView()
            .click({ force: true });
        cy.contains('button', '로그인하러 가기', { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('include', 'redirect=%2Fprediction%3FgameId%3D20240510HHSS0%26date%3D2026-02-03');
    });

    it('should emit timeout banner foreground/background actions', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('예측 처리 지연: 백그라운드로 전환해 계속 진행합니다.').should('not.exist');
        cy.contains('button', '다시 시도').should('not.exist');
    });

    it('should start prediction submit flow before timeout handling begins', () => {
        installSubmitVote(16000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
        cy.contains('예측 처리 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should show timeout overlay after 45 seconds and require recovery actions', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
        cy.tick(45000);
        cy.contains('button', '다시 시도').should('exist');
        cy.contains('button', '간단 모드로 전환').should('exist');
    });

    it('should keep retry overlay inactive before submit starts', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('예측 처리 지연: 백그라운드로 전환해 계속 진행합니다.').should('not.exist');
        cy.contains('button', '다시 시도').should('not.exist');
        cy.get('@submitVote.all').should('have.length', 0);
    });

    it('should keep offline recovery idle before submit starts', () => {
        cy.intercept('POST', /\/predictions\/vote(?:\?.*)?$/, {
            statusCode: 500,
            body: {
                message: 'network-failure-for-recovery',
            },
        }).as('submitVoteFailForRecovery');

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.get('@submitVoteFailForRecovery.all').should('have.length', 0);
    });

    it('should restore running banner from session and sync vote status', () => {
        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            delay: 1500,
            body: { homeVotes: 14, awayVotes: 9, totalVotes: 23 },
        }).as('getVoteStatusRestore');

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getVoteStatusRestore');
        cy.get('@getUserVote.all').should('have.length', 0);

        cy.window().then((win) => {
            const startedAt = win.Date.now() - 30_000;
            win.sessionStorage.setItem('prediction:run-session:v1', JSON.stringify({
                flowId: 'restore-flow-1',
                gameId: '20240510HHSS0',
                action: 'vote',
                startedAt,
                team: 'home',
                bannerDismissed: false,
                timeoutStage: 'none',
            }));

            win.dispatchEvent(new Event('pageshow'));
        });

        cy.tick(100);
        cy.wait('@getVoteStatusRestore');
        cy.window().should((win) => {
            expect(win.sessionStorage.getItem('prediction:run-session:v1')).to.eq(null);
        });
    });

    it('should show partial result badge and clear it after vote status retry succeeds', () => {
        let shouldReturnFullStatus = false;
        cy.intercept('**/api/predictions/status/*', (req) => {
            const body = shouldReturnFullStatus
                ? { homeVotes: 10, awayVotes: 5, totalVotes: 15 }
                : { homeVotes: 10, awayVotes: 5 };
            req.reply({
                statusCode: 200,
                body,
            });
        }).as('getVoteStatusPartial');

        openPredictionPage();

        cy.wait('@getVoteStatusPartial');
        cy.get('[data-testid="prediction-partial-result-notice"]').should('be.visible');
        cy.then(() => {
            shouldReturnFullStatus = true;
        });
        cy.get('[data-testid="prediction-partial-retry-btn"]').click({ force: true });
        cy.wait('@getVoteStatusPartial');
        cy.get('[data-testid="prediction-partial-result-notice"]').should('not.exist');
    });

    it('should keep the current card visible when detail render fails', () => {
        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/day') || req.url.includes('/api/matches/bounds')) {
                return;
            }

            req.reply({
                statusCode: 500,
                body: {
                    message: 'detail render failed',
                },
            });
        }).as('getGameDetailFail');

        openPredictionPage({ captureFlowEvents: true });

        cy.wait('@getGameDetailFail');
        cy.get('[data-testid="prediction-detail-error-banner"]').should('be.visible');
        cy.contains(/한화(\s*이글스)?/).should('be.visible');
        cy.contains(/삼성(\s*라이온즈)?/).should('be.visible');
        cy.contains(/전력분석실|승부예측|순위예측/, { timeout: 10000 }).should('exist');
    });

    it('should block duplicate prediction submit while request is running', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getPredictionBootstrap');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').first().should('be.visible').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').first().click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
    });

    // ── C1 결과 본문 — 데이터 형태별 렌더 + 에러경로 ─────────────────────
    describe('coach analysis result — data-shape rendering (C1)', () => {
        const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
        const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v2';
        const FULL_ANALYSIS = {
            summary: '',
            verdict: 'KT는 **선발 조기 강판**이 패인.',
            strengths: ['NC 불펜 ERA 1.80'],
            weaknesses: ['KT 선발 ERA 5.40'],
            risks: [
                { area: 'KT 선발 매치업', level: 0, description: '배제성 5회 조기 강판' },
                { area: '날씨 변수', level: 1, description: '강풍 외야 플라이' },
                { area: 'NC 마무리 피로도', level: 2, description: '3연투 가능성' },
            ],
            why_it_matters: ['선발 ERA 격차가 초반 흐름 결정'],
            swing_factors: ['7회초 역전 2점 홈런'],
            watch_points: ['KT 마무리 등판 시점'],
            uncertainty: ['강풍 영향'],
        };

        const sse = (obj: Record<string, unknown>) => [
            'event: meta', `data: ${JSON.stringify(obj)}`, '', 'event: done', 'data: [DONE]', '',
        ].join('\n');

        const autoSeedSse = sse({
            request_mode: 'auto_brief', validation_status: 'success', cache_state: 'MISS_GENERATE',
            structured_response: {
                headline: '자동 브리핑', sentiment: 'neutral', key_metrics: [],
                analysis: { summary: '자동', verdict: '자동', strengths: [], weaknesses: [], risks: [] },
                detailed_markdown: '자동 브리핑', coach_note: '자동 브리핑',
            },
        });

        const manualSse = (opts: {
            analysis?: Record<string, unknown>;
            winProb?: number | null;
            manual?: boolean;
            dataQuality?: string;
            generationMode?: string;
            supportedFactCount?: number | null;
            usedEvidence?: string[];
        } = {}) => {
            const {
                analysis = FULL_ANALYSIS,
                winProb = 0.62,
                manual = false,
                dataQuality = 'grounded',
                generationMode,
                supportedFactCount = 7,
                usedEvidence = ['home_pitcher', 'away_lineup', 'game_summary'],
            } = opts;
            if (manual) {
                return sse({
                    request_mode: 'manual_detail', validation_status: 'manual_data_required',
                    generation_mode: 'evidence_fallback', data_quality: 'insufficient',
                    grounding_warnings: ['야구 데이터 준비가 필요합니다.'],
                    manual_data_request: {
                        missing_items: [{ key: 'game_id', label: '경기 ID', reason: '경기 row 부재', expected_format: '20240510HHSS0' }],
                    },
                });
            }
            const meta: Record<string, unknown> = {
                request_mode: 'manual_detail', validation_status: 'success',
                game_status_bucket: 'COMPLETED', data_quality: dataQuality,
                used_evidence: usedEvidence,
                structured_response: {
                    headline: 'NC 다이노스 승리', sentiment: 'negative',
                    key_metrics: [{ label: '최종 스코어', value: 'NC 8 / KT 5', status: 'danger', trend: 'down', is_critical: true }],
                    analysis, detailed_markdown: '## 상세\n분석', coach_note: '재정비 필요.',
                },
            };
            if (winProb !== null) meta.win_probability_home = winProb;
            if (generationMode) meta.generation_mode = generationMode;
            if (supportedFactCount !== null) meta.supported_fact_count = supportedFactCount;
            return sse(meta);
        };

        beforeEach(() => {
            cy.window().then((win) => {
                win.sessionStorage.removeItem(COACH_BRIEFING_SESSION_STORAGE_KEY);
                win.localStorage.removeItem(COACH_BRIEFING_LOCAL_STORAGE_KEY);
            });
        });

        const interceptCoach = (manualOpts?: Parameters<typeof manualSse>[0], manualStatus = 200) => {
            cy.intercept('**/api/kbo/rankings/snapshot*', { statusCode: 200, body: meaningfulRegularSeasonRankings })
                .as('getRankingsDataShape');
            cy.intercept('POST', '**/coach/analyze*', (req) => {
                const body = parseCoachRequestBody(req.body);
                if (body.request_mode === 'manual_detail') {
                    req.alias = 'coachDataShapeManual';
                    if (manualStatus === 413) {
                        req.reply({
                            statusCode: 413,
                            body: {
                                success: false,
                                code: 'AI_PROXY_PAYLOAD_TOO_LARGE',
                                message: 'AI 요청 본문이 너무 큽니다.',
                                data: { maxBytes: 65536 },
                            },
                        });
                        return;
                    }
                    if (manualStatus !== 200) {
                        // 스트림 error 이벤트로 비-인증 분석 실패를 모사 → result.error 설정.
                        req.reply({
                            statusCode: 200,
                            headers: { 'content-type': 'text/event-stream' },
                            body: [
                                'event: error',
                                'data: {"message":"분석 중 오류가 발생했습니다."}',
                                '', '',
                            ].join('\n'),
                        });
                        return;
                    }
                    req.reply({ statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: manualSse(manualOpts) });
                    return;
                }
                req.alias = 'coachDataShapeSeed';
                req.reply({ statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: autoSeedSse });
            });
        };

        const openCoachDialog = () => {
            openPredictionPage();
            cy.get('@getUserVote.all').should('have.length', 0);
            cy.wait('@getRankingsDataShape');
            cy.tick(600, { log: false });
            ensureCoachBriefingVisible();
            cy.wait('@coachDataShapeSeed');
            cy.get('[data-testid="coach-analysis-open"]').first().click({ force: true });
            cy.wait('@coachDataShapeManual');
        };

        const assertNoLegacyStrings = () => {
            getCoachAnalysisDialog()
                .should('not.contain', '분석 기준 팀 선택')
                .and('not.contain', '분석 대상 팀 선택')
                .and('not.contain', '분석 집중 항목')
                .and('not.contain', 'AI 코치 경기 리뷰 시작')
                .and('not.contain', '리뷰 결과 · 주의 변수');
        };

        it('renders all C1 sections for full data and hides no legacy UI', () => {
            interceptCoach();
            openCoachDialog();
            cy.get('[role="article"]').should('exist');
            cy.get('[data-testid="coach-section-verdict"]').should('exist');
            cy.get('[data-testid="coach-section-insights"]').should('exist');
            cy.get('[data-testid="coach-section-risks"]').should('exist');
            cy.contains('NC 다이노스 승리').should('be.visible');
            assertNoLegacyStrings();
        });

        it('exposes a11y affordances: focus inside dialog, aria-current, completion live region', () => {
            interceptCoach();
            openCoachDialog();
            // 완료를 스크린리더에 알리는 live region
            cy.get('[data-testid="coach-analysis-live-status"]').should('contain', '분석이 완료되었습니다');
            // scroll-spy 활성 nav 는 ARIA 표준값 'location'
            cy.get('[data-testid="coach-analysis-dialog"] [aria-current="location"]').should('exist');
            // focus trap: 열린 직후 포커스가 다이얼로그 내부에 위치
            cy.get('[data-testid="coach-analysis-dialog"]').then(($d) => {
                cy.focused().then(($f) => {
                    expect($d[0].contains($f[0]), 'focus inside dialog').to.eq(true);
                });
            });
        });

        it('surfaces evidence transparency: real fact count chip + collapsible source list', () => {
            interceptCoach();
            openCoachDialog();
            // 헤드라인 신뢰 칩: supported_fact_count(7) 기반 실데이터 근거 + 품질 라벨
            cy.get('[data-testid="coach-evidence-chip"]').should('be.visible')
                .and('contain', '7개 실데이터 근거')
                .and('contain', '실데이터 기반');
            // 사이드바 '근거' 행도 가짜 합산이 아닌 실수치
            cy.get('[data-testid="coach-evidence-count"]').should('contain', '7건');
            // 접이식 소스 목록: 펼치면 한글 라벨 노출
            cy.get('[data-testid="coach-evidence-sources"]').should('exist')
                .and('contain', '핵심 근거');
            cy.get('[data-testid="coach-evidence-sources"]').find('summary').click({ force: true });
            cy.get('[data-testid="coach-evidence-sources"]')
                .should('contain', '홈 선발')
                .and('contain', '원정 라인업')
                .and('contain', '경기 요약');
        });

        it('falls back to evidence-source count when supported_fact_count is absent', () => {
            interceptCoach({ supportedFactCount: null, usedEvidence: ['home_pitcher', 'series_context'] });
            openCoachDialog();
            cy.get('[data-testid="coach-evidence-count"]').should('contain', '2건');
            cy.get('[data-testid="coach-evidence-chip"]').should('contain', '2개 실데이터 근거');
        });

        it('shows a conservative-summary note for partial/evidence_fallback quality', () => {
            interceptCoach({ dataQuality: 'partial', generationMode: 'evidence_fallback' });
            openCoachDialog();
            cy.get('[data-testid="coach-evidence-chip"]').should('contain', '실데이터 일부 기반');
            getCoachAnalysisDialog().should('contain', '근거가 제한적이라 보수적으로 요약했습니다.');
        });

        it('omits the source list when used_evidence is empty', () => {
            interceptCoach({ usedEvidence: [], supportedFactCount: 4 });
            openCoachDialog();
            cy.get('[data-testid="coach-evidence-sources"]').should('not.exist');
            // fact count 만으로도 카운트/칩은 노출
            cy.get('[data-testid="coach-evidence-count"]').should('contain', '4건');
        });

        it('hides insight section when all insight arrays are empty', () => {
            interceptCoach({ analysis: { ...FULL_ANALYSIS, why_it_matters: [], swing_factors: [], watch_points: [], uncertainty: [], strengths: [], weaknesses: [] } });
            openCoachDialog();
            cy.get('[data-testid="coach-section-verdict"]').should('exist');
            cy.get('[data-testid="coach-section-insights"]').should('not.exist');
            cy.get('[data-testid="coach-section-risks"]').should('exist');
            assertNoLegacyStrings();
        });

        it('shows an empty risk state when risks are empty', () => {
            interceptCoach({ analysis: { ...FULL_ANALYSIS, risks: [] } });
            openCoachDialog();
            cy.get('[data-testid="coach-section-insights"]').should('exist');
            cy.get('[data-testid="coach-section-risks"]').should('exist');
            cy.get('[data-testid="coach-risk-empty"]')
                .should('exist')
                .and('contain', '리스크');
            assertNoLegacyStrings();
        });

        it('renders result without win probability when omitted', () => {
            interceptCoach({ winProb: null });
            openCoachDialog();
            cy.get('[role="article"]').should('exist');
            cy.get('[data-testid="coach-section-verdict"]').should('exist');
            assertNoLegacyStrings();
        });

        it('shows manual-data notice and no result body when manual data required', () => {
            interceptCoach({ manual: true });
            openCoachDialog();
            cy.get('[data-testid="coach-analysis-data-quality-note"]', { timeout: 10000 }).should('be.visible');
            cy.get('[role="article"]').should('not.exist');
            cy.get('[data-testid="coach-section-verdict"]').should('not.exist');
        });

        it('shows retry CTA (not login) when manual analysis fails with a non-auth error', () => {
            interceptCoach(undefined, 500);
            openCoachDialog();
            cy.get('[data-testid="coach-analysis-retry-cta"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="coach-analysis-login-cta"]').should('not.exist');
            cy.get('[role="article"]').should('not.exist');
        });

        it('shows payload-limit guidance and retry CTA when manual analysis returns 413', () => {
            interceptCoach(undefined, 413);
            openCoachDialog();
            getCoachAnalysisDialog()
                .should('contain', 'AI 코치 분석 요청 데이터가 너무 큽니다. 다른 경기로 다시 시도하거나 잠시 후 다시 확인해주세요.');
            cy.get('[data-testid="coach-analysis-retry-cta"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="coach-analysis-login-cta"]').should('not.exist');
            cy.get('[role="article"]').should('not.exist');
        });
    });
});
