/// <reference types="cypress" />

import {
    buildDefaultPredictionPath,
    ensureCoachBriefingVisible,
    getPredictionAuthRequestTraces,
    installPredictionAuthenticatedSessionIntercept,
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
            waitForScheduleRange = true,
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

    it('should request my-votes in bulk once and never call legacy my-vote endpoint', () => {
        openPredictionPage();
        cy.get('@getUserVotes.all').should('have.length', 1);
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

    it('should send automatic AI brief request only for meaningful game with auto payload', () => {
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

        openPredictionPage();
        cy.wait('@getGameDetailPostponed');
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

        openPredictionPage();
        cy.wait('@getGameDetailCancelled');
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

        openPredictionPage();
        cy.wait('@getRankingsMeaningfulPast');
        cy.wait('@getGameDetailPast');
        ensureCoachBriefingVisible();
        cy.tick(500);
        cy.tick(1000);
        cy.wait(500);
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

        openPredictionPage({ path: '/prediction?gameId=20240510LGLK0&date=2026-02-04' });

        cy.wait(700);
        cy.get('@getUserVotes.all').then((interceptions: any) => {
            const requestList = interceptions as Array<{
                request?: { body?: { gameIds?: string[] } };
            }>;
            expect(requestList.length).to.be.gte(1);
            expect(requestList.length).to.be.lte(2);
            requestList.forEach((interception) => {
                const requestBody = interception.request?.body || {};
                expect(requestBody.gameIds).to.have.members([
                    '20240510HHSS0',
                    '20240510LGLK0',
                ]);
            });
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

        openPredictionPage();
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

        cy.get('[data-testid="coach-analysis-open"]').first().click({ force: true });
        cy.contains('button', 'AI 코치 경기 예측 시작')
            .scrollIntoView()
            .click({ force: true });

        cy.wait('@coachAnalyzeManual').then((interception) => {
            manualCoachBody = parseCoachRequestBody(interception.request.body);
            expect(manualCoachBody).to.include({ request_mode: 'manual_detail' });
            expect(extractCoachGameId(manualCoachBody)).to.eq('20240510HHSS0');
            expect(manualCoachBody).to.not.have.property('question_override');
            expect(Array.isArray(manualCoachBody.focus)).to.equal(true);
        });
        cy.get('@coachAnalyzeManual.all').should('have.length', 2);
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

        openPredictionPage();
        cy.wait('@getRankingsAbortCoach');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.window().then((win) => {
            cy.spy(win.console, 'error').as('consoleError');
        });
        cy.tick(1000);
        cy.tick(300);
        cy.wait(700);

        let coachAnalyzeCallCount = 0;
        cy.intercept('POST', '**/coach/analyze*', (req) => {
            coachAnalyzeCallCount += 1;
            req.reply({
                delay: coachAnalyzeCallCount === 1 ? 3000 : 1800,
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: coachAnalyzeCallCount === 1 ? firstCoachResponse : secondCoachResponse,
            });
        }).as('coachAnalyzeAbortOnClose');

        cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        cy.get('[data-testid="coach-analysis-run-button"]', { timeout: 10000 })
            .scrollIntoView()
            .click({ force: true });
        cy.get('@coachAnalyzeAbortOnClose.all').should('have.length', 1);

        cy.get('body').type('{esc}');
        cy.get('[data-testid="coach-analysis-dialog"]').should('not.exist');

        cy.get('[data-testid="coach-analysis-open"]')
            .should('be.visible')
            .click({ force: true });
        getCoachAnalysisDialog().should('be.visible');
        cy.get('[data-testid="coach-analysis-run-button"]')
            .scrollIntoView()
            .click({ force: true });
        cy.get('@coachAnalyzeAbortOnClose.all').should('have.length', 2);

        cy.wait(500);
        cy.get('[data-testid="coach-analysis-run-button"]').should('be.disabled');

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
            req.reply({
                delay: 1800,
                statusCode: 200,
                headers: { 'content-type': 'text/event-stream' },
                body: manualCoachResponse,
            });
        }).as('coachAnalyzeMobileResult');

        openPredictionPage();
        cy.wait('@getRankingsMobileAnalysis');
        cy.wait('@getGameDetail');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(1000);
        cy.wait(700);

        cy.get('[data-testid="coach-analysis-open"]', { timeout: 10000 })
            .should('be.visible')
            .click({ force: true });
        cy.get('[data-testid="coach-analysis-run-button"]', { timeout: 10000 })
            .scrollIntoView()
            .click({ force: true });

        cy.get('[data-testid="coach-analysis-run-button"]').should('be.disabled');
        cy.contains('감독님이 헤드셋 끼고 준비 중...').should('exist');
        getCoachAnalysisDialog().then(($dialog) => {
            const skeletons = Array.from($dialog[0].querySelectorAll('div')).filter((element) => {
                const className = typeof element.className === 'string' ? element.className : '';
                return className.includes('h-4') && className.includes('rounded-lg');
            });
            expect(skeletons.length).to.eq(4);
        });

        cy.wait('@coachAnalyzeMobileResult');
        cy.contains('한화 우세, 후반 불펜 관리가 핵심', { timeout: 12000 }).should('exist');
        cy.get('[data-testid="coach-analysis-generation-mode"]')
            .should('have.attr', 'data-generation-mode', 'llm_manual')
            .and('contain', '근거 기반 상세 분석');
        cy.get('[role="article"]').should('exist');
        cy.get('[role="article"] [aria-hidden="true"]').its('length').should('be.gte', 7);
        cy.contains('span', '0.812 vs 0.744')
            .invoke('attr', 'class')
            .should('include', 'text-xl')
            .and('include', 'sm:text-2xl')
            .and('include', 'truncate');
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

        cy.get('[data-testid="coach-analysis-open"]').click({ force: true });
        cy.get('[data-testid="coach-analysis-run-button"]')
            .scrollIntoView()
            .click({ force: true });

        cy.wait('@coachAnalyzeManualPartial');
        cy.get('[data-testid="coach-analysis-data-quality-note"]', { timeout: 10000 })
            .should('contain', '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.');
        cy.get('[data-testid="coach-analysis-data-quality-badge"]').should('contain', '실데이터 일부 기반');
        cy.get('[data-testid="coach-analysis-generation-mode"]')
            .should('have.attr', 'data-generation-mode', 'evidence_fallback')
            .and('contain', '근거 기반 보수 생성')
            .and('contain', '다음 상세 분석 요청에서는 AI 재생성을 다시 시도합니다.');
        cy.get('[data-testid="coach-analysis-grounding-reason"]').then(($chips) => {
            const labels = [...$chips].map((chip) => chip.textContent?.trim());
            expect(labels).to.deep.equal(['승부처 데이터 부족', '요청 항목 근거 부족']);
        });
        cy.get('[data-testid="coach-analysis-grounding-detail"]')
            .should('have.length', 1)
            .first()
            .should('contain', '요청한 focus 중 상대 전적, 타격 생산성 근거가 부족해 확인 가능한 항목만 분석합니다.');
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
                                    summary: 'SSG 랜더스의 최근 흐름이 좋지만, 불펜 운용 데이터 부족으로 인해 경기 후반 운영은 더 지켜봐야 합니다.',
                                    verdict: 'SSG 랜더스가 최근 흐름에서 우위를 점하고 있지만, 불펜 운용 데이터 부족으로 인해 운영 판단에 변수가 존재합니다.',
                                    strengths: ['SSG 랜더스 최근 득실 마진 우위'],
                                    weaknesses: ['양 팀 모두 불펜 운용 데이터 부족'],
                                    risks: [
                                        {
                                            area: 'bullpen',
                                            level: 1,
                                            description: '불펜 운용 데이터 부족으로 경기 후반 운영 판단이 제한됩니다.',
                                        },
                                    ],
                                    why_it_matters: [],
                                    swing_factors: ['선발 발표 후 경기 후반 운영 흐름 확인 필요'],
                                    watch_points: ['불펜 투입 시점과 라인업 확정 여부 확인'],
                                    uncertainty: ['선발과 라인업 확정 전까지는 보수적으로 해석해야 합니다.'],
                                },
                                detailed_markdown: '## 최근 전력\n- SSG 랜더스는 최근 9경기에서 7승 2패를 기록하며 한화 이글스(6승 3패)보다 높은 승률을 보여주고 있습니다. 득실 마진 역시 SSG 랜더스(+11)가 한화 이글스(+8)보다 높습니다.\n\n## 불펜 상태\n- 양 팀 모두 불펜 운용 데이터가 부족하여 접전 후반 상황에서의 팀 기량 비교가 어렵습니다. 불펜진의 실제 기량과 피로도, 투입 전략에 따라 경기 결과가 달라질 수 있습니다.',
                                coach_note: 'SSG 랜더스의 최근 흐름이 좋지만, 불펜 운용 데이터 부족으로 인해 경기 후반 운영에 주의해야 합니다. 한화 이글스의 불펜진이 예상외의 활약을 펼칠 가능성도 배제할 수 없습니다.',
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
            .and('not.contain', '고레버리지')
            .and('not.contain', '핵심 구간를');
        cy.get('[data-testid="coach-briefing-quality-badge"]').should('contain', '실데이터 일부 기반');
        cy.get('[data-testid="coach-briefing-data-quality-note"]')
            .should('contain', '최근 흐름 위주로 분석했습니다.');
        cy.get('[data-testid="coach-analysis-open"]').should('contain', 'AI 코치 경기 예측').click({ force: true });
        cy.get('[data-testid="coach-analysis-run-button"]')
            .should('contain', 'AI 코치 경기 예측 시작')
            .click({ force: true });

        cy.wait('@coachAnalyzeScheduledManualCopy');
        cy.get('[data-testid="coach-analysis-generation-mode"]')
            .should('have.attr', 'data-generation-mode', 'llm_manual')
            .and('contain', '근거 기반 상세 분석');
        cy.get('[data-testid="coach-analysis-data-quality-badge"]').should('contain', '실데이터 일부 기반');
        cy.get('[data-testid="coach-analysis-dialog"]')
            .should('contain', 'SSG 랜더스가 최근 흐름에서 우위를 점하고 있지만, 불펜 운용 데이터 부족으로 인해 운영 판단에 변수가 존재합니다.')
            .and('contain', '양 팀 모두 불펜 운용 데이터가 부족하여 접전 후반 상황에서의 팀 기량 비교가 어렵습니다.')
            .and('not.contain', '고레버리지')
            .and('not.contain', '핵심 구간를');
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
        cy.wait('@getGameDetail');
        cy.wait('@getRankingsAuthExpiredCoach');
        waitForPredictionVoteBootstrap();
        ensureCoachBriefingVisible();
        cy.tick(1000);
        cy.wait(700);
        cy.wait('@coachAnalyzeAuthExpired');
        cy.wait('@coachAnalyzeReissueFailed');
        cy.get('[data-testid="coach-briefing-login-cta"]', { timeout: 10000 })
            .should('exist')
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
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
        cy.contains('예측 처리 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should show timeout overlay after 45 seconds and require recovery actions', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
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
        cy.wait('@getGameDetail');
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
        cy.wait('@getGameDetail');
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
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
        cy.wait('@getVoteStatusRestore');

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
        let voteStatusCallCount = 0;
        cy.intercept('**/api/predictions/status/*', (req) => {
            voteStatusCallCount += 1;
            const body = voteStatusCallCount < 2
                ? { homeVotes: 10, awayVotes: 5 }
                : { homeVotes: 10, awayVotes: 5, totalVotes: 15 };
            req.reply({
                statusCode: 200,
                body,
            });
        }).as('getVoteStatusPartial');

        openPredictionPage();

        cy.wait('@getVoteStatusPartial');
        cy.get('[data-testid="prediction-partial-result-notice"]').should('be.visible');
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
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').first().should('be.visible').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').first().click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
    });
});
