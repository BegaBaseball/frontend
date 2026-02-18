/// <reference types="cypress" />

describe('Game Prediction', () => {
    const defaultRangeSchedulePayload = [
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
    ];

    let rangeSchedulePayload = [...defaultRangeSchedulePayload];

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

    const openPredictionPage = () => {
        const cacheBuster = Date.now();
        cy.window().then((win) => {
            win.location.assign(`/prediction?_cypress_bust=${cacheBuster}`);
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getScheduleRange');
    };

    beforeEach(() => {
        // Force date to 2026-02-03 12:00:00 KST (approx)
        // Using UTC date that results in the same date string for getTodayString
        const now = new Date('2026-02-03T12:00:00').getTime();
        cy.clock(now, ['Date']); // Only mock Date, leave setTimeout etc alone if possible (optional)

        (cy as any).login('user');
        (cy as any).mockAPI();

        // Calculate next day based on fixed date
        const nextDay = '2026-02-04';

        rangeSchedulePayload = defaultRangeSchedulePayload.map((item) => ({
            ...item,
            gameDate: nextDay,
        }));

        // Mock game detail
        cy.intercept('**/api/matches/*', {
            statusCode: 200,
            body: {
                gameId: '20240510HHSS0',
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                gameDate: nextDay,
                homeScore: null,
                awayScore: null
            }
        }).as('getGameDetail');

        // Mock user votes (bulk endpoint)
        cy.intercept('POST', '**/api/predictions/my-votes', {
            statusCode: 200,
            body: {
                votes: {
                    '20240510HHSS0': null
                }
            }
        }).as('getUserVotes');

        // Legacy endpoint should no longer be used
        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 200,
            body: { votedTeam: null }
        }).as('getUserVote');

        // Specific mock for range query (MOVED AFTER detail to override it)
        cy.intercept('**/api/matches/range*', (req) => {
            req.reply({
                statusCode: 200,
                body: rangeSchedulePayload,
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
            body: { homeVotes: 10, awayVotes: 5 }
        }).as('getVoteStatus');

        // Mock league dates specifically for this spec to avoid any 500 from global mock
        cy.intercept('**/api/kbo/league-start-dates*', {
            statusCode: 200,
            body: { regularSeasonStart: '2025-03-22', postseasonStart: '2025-10-06', koreanSeriesStart: '2025-10-26' }
        }).as('getLeagueDatesLocal');

        // Mock points/voting
        cy.intercept('**/api/predictions/vote*', {
            statusCode: 201,
            body: { success: true }
        }).as('submitVote');

    });

    it('should display daily game schedule', () => {
        openPredictionPage();
        cy.contains('한화 이글스').should('be.visible');
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
            if (req.url.includes('/api/matches/range')) {
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
            expect(body.game_id).to.eq('20260601HHSS0');
        });
        cy.get('@coachAnalyzePostseason.all').should('have.length', 1);
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
        cy.wait('@coachAnalyzeAuto').then((interception) => {
            firstCoachBody = parseCoachRequestBody(interception.request.body);
            expect(firstCoachBody).to.include({ request_mode: 'auto_brief' });
            expect(firstCoachBody.focus).to.deep.eq(['recent_form']);
            expect(firstCoachBody).to.not.have.property('question_override');
            expect(firstCoachBody?.game_id).to.eq('20240510HHSS0');
        });
        cy.get('@coachAnalyzeAuto.all').should('have.length', 1);
    });

    it('should show manual AI request UI for non-meaningful game and not call coach auto', () => {
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
        cy.wait(500);
        cy.get('@coachAnalyze.all').should('have.length', 0);
        cy.contains('AI 분석 요청').should('be.visible');
        cy.contains('경기 시작 전입니다').should('be.visible');
        cy.contains('예정 경기에서는 자동 분석이 적용되지 않습니다. 필요하면 직접 AI 분석을 요청하세요.').should('be.visible');
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
            if (req.url.includes('/api/matches/range')) {
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
                    homeScore: 0,
                    awayScore: 4,
                    winner: 'away',
                }
            });
        }).as('getGameDetailPast');

        openPredictionPage();
        cy.wait('@getRankingsNonMeaningfulPast');
        cy.wait('@getGameDetailPast');
        cy.wait(500);
        cy.get('@coachAnalyzePast.all').should('have.length', 0);
        cy.contains('AI 분석 요청').should('be.visible');
        cy.contains('요청 버튼을 눌러주세요').should('be.visible');
        cy.contains('핵심 경기만 자동 분석을 제공합니다. 필요한 경기에서는 직접 AI 분석을 요청하세요.').should('be.visible');
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
        cy.wait(500);

        cy.get('.flex.gap-2.overflow-x-auto')
            .find('button')
            .should('have.length.gte', 2)
            .then(($buttons) => {
                cy.wrap($buttons[1]).click();
                cy.wrap($buttons[0]).click();
            });

        cy.wait(700);
        cy.get('@getUserVotes.all').should('have.length', 1);
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
        cy.wait(700);
        cy.get('@coachAnalyzeManual.all').should('have.length', 0);

        cy.get('[data-testid="coach-analysis-open"]').click();
        cy.get('[data-testid="coach-analysis-run-button"]')
            .scrollIntoView()
            .click({ force: true });

        cy.wait('@coachAnalyzeManual').then((interception) => {
            manualCoachBody = parseCoachRequestBody(interception.request.body);
            expect(manualCoachBody).to.include({ request_mode: 'manual_detail' });
            expect(manualCoachBody.game_id).to.eq('20240510HHSS0');
            expect(manualCoachBody).to.not.have.property('question_override');
            expect(Array.isArray(manualCoachBody.focus)).to.equal(true);
        });
        cy.get('@coachAnalyzeManual.all').should('have.length', 1);
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

        cy.get('.flex.gap-2.overflow-x-auto').find('button').then(($buttons) => {
            if ($buttons.length < 2) {
                throw new Error('Expected at least 2 games for rapid switch test');
            }
            cy.wrap($buttons[1]).click();
            cy.wrap($buttons[0]).click();
        });

        cy.wait(900);
        cy.get('@coachAnalyzeRapid.all').should('have.length', 1).then((interceptions: any) => {
            const interceptionList = interceptions as any[];
            const parsedPayloads = interceptionList.map((interception) => parseCoachRequestBody(interception.request.body));
            const lastPayload = parsedPayloads.at(-1);
            const lastGameId = lastPayload
                ? ((lastPayload as { game_id?: string; gameId?: string }).game_id
                    || (lastPayload as { game_id?: string; gameId?: string }).gameId)
                : undefined;

            expect(lastPayload).to.have.property('game_id');
            expect(lastGameId).to.eq('20240510HHSS0');
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
        cy.wait('@getRankingsSingleFlight');
        cy.wait('@coachAnalyzeSingleFlight').then((interception) => {
            firstIdentity = buildCoachRequestIdentity(parseCoachRequestBody(interception.request.body));
            expect(firstIdentity).to.include('"requestMode":"auto_brief"');
        });

        cy.wait(700);
        cy.get('[aria-label="Toggle theme"]').click({ force: true });
        cy.wait(350);
        cy.get('[aria-label="Toggle theme"]').click({ force: true });

        cy.contains('순위예측').click();
        cy.contains('승부예측').click();

        cy.wait(900);
        cy.get('@coachAnalyzeSingleFlight.all').then((interceptions: any) => {
            const interceptionList = interceptions as any[];
            expect(interceptionList).to.have.length(1);
            const identitySet = new Set(
                interceptionList.map((item: any) => buildCoachRequestIdentity(parseCoachRequestBody(item.request.body)))
            );
            expect(identitySet.size).to.eq(1);
            expect(identitySet.has(firstIdentity)).to.eq(true);
        });
    });

    it('should allow submitting a prediction', () => {
        cy.intercept('POST', '**/api/predictions/vote', {
            statusCode: 200,
            body: { success: true }
        }).as('submitVote');

        openPredictionPage();

        // Set viewport to ensure visibility
        cy.viewport(1280, 800);

        // Click a team button - Use data-testid for robustness
        cy.get('[data-testid="vote-home-btn"]')
            .should('exist')
            .scrollIntoView()
            .should('be.visible')
            .click({ force: true });

        cy.wait('@submitVote');
        // The success message comes from toast.success
        cy.contains('승리 예측이 저장되었습니다').should('be.visible');
    });

    it('should show explicit empty-state UI when /api/matches/range returns 0 items', () => {
        cy.intercept('**/api/matches/range*', {
            statusCode: 200,
            body: [],
        }).as('getScheduleRangeEmpty');

        openPredictionPage();
        cy.wait('@getScheduleRangeEmpty');

        cy.contains('예정된 경기 일정이 없습니다.').should('be.visible');
        cy.contains('다른 날짜를 확인해보세요!').should('be.visible');
    });

    it('should show login required dialog when auth check fails (401)', () => {
        cy.clearCookie('Authorization');
        cy.clearLocalStorage('auth-storage');
        cy.clearLocalStorage('accessToken');
        cy.intercept('**/api/auth/mypage', {
            statusCode: 401,
            body: { message: 'Unauthorized' },
        }).as('getMeUnauthorized');

        const cacheBuster = Date.now();
        cy.window().then((win) => {
            win.location.assign(`/prediction?_cypress_bust=${cacheBuster}`);
        });

        cy.wait('@getMeUnauthorized');
        cy.contains('로그인 필요').should('be.visible');
        cy.contains('로그인이 필요한 서비스입니다.').should('be.visible');
    });

    it('should show error card when /api/matches/range fails', () => {
        cy.intercept('**/api/matches/range*', {
            statusCode: 500,
            body: { message: 'Internal Server Error' },
        }).as('getScheduleRangeError');

        openPredictionPage();
        cy.wait('@getScheduleRangeError');

        cy.contains('예측 경기 데이터를 불러오지 못했습니다.').should('be.visible');
        cy.contains('잠시 후 다시 시도하거나 새로고침해 주세요.').should('be.visible');
    });
});
