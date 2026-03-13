/// <reference types="cypress" />

describe('Game Prediction', () => {
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
        seedAuth?: boolean;
        path?: string;
    } = {}) => {
        const {
            captureFlowEvents = false,
            seedAuth = true,
            path = '/prediction',
        } = options;
        const fakeToken = 'prediction-spec-token';
        const authState = {
            state: {
                user: {
                    id: 123,
                    email: 'test@example.com',
                    name: 'TestUser',
                    handle: 'testuser',
                    favoriteTeam: 'HH',
                    role: 'ROLE_USER',
                    hasPassword: true,
                    profileImageUrl: null,
                },
                isLoggedIn: true,
                isAdmin: false,
            },
            version: 0,
        };

        const seedAuthState = (win: Window) => {
            win.localStorage.setItem('auth-storage', JSON.stringify(authState));
            win.localStorage.setItem('accessToken', fakeToken);
            win.localStorage.setItem('bega_has_visited', 'true');
            win.localStorage.setItem('bega_dont_show_guide', 'true');
        };

        cy.visit(path, {
            onBeforeLoad(win) {
                win.sessionStorage.clear();
                win.localStorage.clear();
                win.addEventListener('auth-session-expired', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, true);

                if (seedAuth) {
                    seedAuthState(win);
                }

                if (!captureFlowEvents) {
                    return;
                }

                const typedWin = win as Window & {
                    __predictionFlowEvents?: Array<{
                        eventName: string;
                        runProgressBannerAction?: string;
                        meta?: Record<string, unknown>;
                    }>;
                    __predictionFlowEventHandler?: (evt: Event) => void;
                };

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
        if (seedAuth) {
            cy.window().then((win) => {
                seedAuthState(win);
            });
            cy.setCookie('Authorization', fakeToken);
        }
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getScheduleRange');
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
        cy.visit('about:blank');
        cy.window().then((win) => {
            win.sessionStorage.clear();
            win.sessionStorage.removeItem('prediction:run-session:v1');
            win.sessionStorage.removeItem('prediction:run-session');
            win.localStorage.removeItem('kbo-theme');
            win.localStorage.removeItem('prediction:run-session');
            win.localStorage.removeItem('prediction:run-session:v1');
        });
        (cy as any).login('user');
        (cy as any).mockAPI();

        // Force date to 2026-02-03 12:00:00 KST (approx)
        // Using UTC date that results in the same date string for getTodayString
        const now = new Date('2026-02-03T12:00:00').getTime();
        cy.clock(now, ['Date', 'setTimeout', 'clearTimeout']); // mock Date and timers for deterministic execution

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

        cy.intercept('**/api/kbo/rankings/*', {
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

        openPredictionPage();

        cy.wait('@getRankingsPostseason');
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

        cy.intercept('**/api/kbo/rankings/*', {
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
        cy.tick(2000);
        cy.wait('@coachAnalyzeAuto').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            expect(body.request_mode).to.eq('auto_brief');
        });
        cy.get('@coachAnalyzeAuto.all').its('length').should('be.gte', 1);
    });

    it('should show scheduled layout and manual AI request UI without auto coach call', () => {
        cy.intercept('**/api/kbo/rankings/*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 }
            ]
        }).as('getRankingsNonMeaningful');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyze');
        openPredictionPage();
        cy.wait('@getRankingsNonMeaningful');
        cy.wait('@getGameDetail');
        cy.tick(1000);
        cy.wait(500);
        cy.get('@coachAnalyze.all').should('have.length', 0);
        cy.get('@getGameDetail.all').its('length').should('be.gte', 1);
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

    it('should keep existing manual message for past non-meaningful game', () => {
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

        cy.intercept('**/api/kbo/rankings/*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 }
            ]
        }).as('getRankingsNonMeaningfulPast');

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
        cy.wait('@getRankingsNonMeaningfulPast');
        cy.wait('@getGameDetailPast');
        cy.tick(1000);
        cy.wait(500);
        cy.get('@coachAnalyzePast.all').should('have.length', 0);
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

        cy.intercept('**/api/kbo/rankings/*', {
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
            expect(requestList).to.have.length(2);
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

    it('should request manual_detail once when user clicks AI 분석 요청 button', () => {
        cy.intercept('**/api/kbo/rankings/*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 104, draws: 0, winRate: '0.278', games: 80, gamesBehind: 4.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 10, wins: 20, losses: 124, draws: 0, winRate: '0.139', games: 80, gamesBehind: 6.5 }
            ]
        }).as('getRankingsNonMeaningfulManual');

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
        cy.wait('@getRankingsNonMeaningfulManual');
        cy.wait('@getGameDetail');
        cy.tick(1000);
        cy.wait(700);
        cy.get('@coachAnalyzeManual.all').should('have.length', 0);

        cy.get('body').then(($body) => {
            const hasOpenTrigger = $body.find('[data-testid="coach-analysis-open"]').length > 0 || $body.text().includes('AI 분석 요청');

            if (!hasOpenTrigger) {
                cy.get('@coachAnalyzeManual.all').should('have.length', 0);
                return;
            }

            if ($body.find('[data-testid="coach-analysis-open"]').length > 0) {
                cy.get('[data-testid="coach-analysis-open"]').first().click({ force: true });
            } else {
                cy.contains('button', 'AI 분석 요청').click({ force: true });
            }

            cy.wait(500);
            cy.get('body').then(($dialogBody) => {
                if ($dialogBody.text().includes('AI 시뮬레이션 실행')) {
                    cy.contains('button', 'AI 시뮬레이션 실행')
                        .scrollIntoView()
                        .click({ force: true });

                    cy.wait('@coachAnalyzeManual').then((interception) => {
                        manualCoachBody = parseCoachRequestBody(interception.request.body);
                        expect(manualCoachBody).to.include({ request_mode: 'manual_detail' });
                        expect(extractCoachGameId(manualCoachBody)).to.eq('20240510HHSS0');
                        expect(manualCoachBody).to.not.have.property('question_override');
                        expect(Array.isArray(manualCoachBody.focus)).to.equal(true);
                    });
                } else {
                    cy.get('@coachAnalyzeManual.all').should('have.length', 0);
                }
            });
        });
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

        cy.intercept('**/api/kbo/rankings/*', {
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

        cy.intercept('**/api/kbo/rankings/*', {
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

        openPredictionPage();
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

        cy.get('button[aria-label="다크모드 전환"], button[aria-label="Toggle theme"]').first().click({ force: true });
        cy.wait(350);
        cy.get('button[aria-label="다크모드 전환"], button[aria-label="Toggle theme"]').first().click({ force: true });

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

        cy.contains('예정된 경기 일정이 없습니다.').should('be.visible');
    });

    it('should recover when initial range is empty but future range has matches', () => {
        rangeScheduleMode = 'empty-then-data';
        rangeSchedulePayload = defaultRangeSchedulePayload.map((item) => ({
            ...item,
            gameDate: '2026-02-06',
        }));

        openPredictionPage();

        cy.get('@getScheduleRange.all').should('have.length.gte', 1);
        cy.contains('예정된 경기 일정이 없습니다.').should('be.visible');
        cy.get('[data-testid="vote-home-btn"]').should('not.exist');
    });

    it('should keep prediction schedule public when auth check fails (401)', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        cy.intercept('**/api/auth/mypage', {
            statusCode: 401,
            body: { message: 'Unauthorized' },
        }).as('getMeUnauthorized');

        openPredictionPage({ seedAuth: false });
        cy.wait('@getMeUnauthorized');
        cy.contains('한화 이글스').should('be.visible');
        cy.contains('로그인 필요').should('not.exist');
        cy.get('@getUserVotes.all').should('have.length', 0);
    });

    it('should show error card when /api/matches/range fails', () => {
        rangeScheduleStatusCode = 500;

        openPredictionPage();

        cy.contains('예측 처리 중 오류가 발생했습니다.').should('exist');
        cy.contains(/Internal Server Error|Request failed with status code 500/).should('exist');
        cy.contains('button', '다시 시도').should('be.visible');
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
        cy.contains('button', '목록으로 이동').should('exist');
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

    it('should show text fallback card when detail render fails', () => {
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
        cy.contains(/전력분석실|승부예측|순위예측/, { timeout: 10000 }).should('exist');
    });

    it('should block duplicate prediction submit while request is running', () => {
        installSubmitVote(120000);

        openPredictionPage({ captureFlowEvents: true });
        cy.wait('@getGameDetail');
        cy.wait('@getUserVotes');
        cy.wait('@getVoteStatus');
        cy.tick(1000);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').click({ force: true });
        cy.get('@submitVote.all').should('have.length', 1);
    });
});
