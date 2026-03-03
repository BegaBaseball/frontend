/// <reference types="cypress" />

describe('Prediction Range Recovery', () => {
    const today = '2026-02-22';
    const todayGameId = '20260222HHSS0';
    const pastGameId = '20260218LGKT0';

    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
        { teamId: 'LG', teamName: 'LG 트윈스', rank: 3, wins: 45, losses: 35, draws: 0, winRate: '0.563', games: 80, gamesBehind: 2.0 },
        { teamId: 'KT', teamName: 'KT 위즈', rank: 4, wins: 44, losses: 36, draws: 0, winRate: '0.550', games: 80, gamesBehind: 2.5 },
    ];

    const openPredictionPage = () => {
        const cacheBuster = Date.now();
        cy.window().then((win) => {
            win.location.assign(`/prediction?_cypress_bust=${cacheBuster}`);
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    };

    const interceptPredictionCommon = () => {
        cy.intercept('POST', '**/api/predictions/my-votes', {
            statusCode: 200,
            body: {
                votes: {
                    [todayGameId]: null,
                    [pastGameId]: null,
                },
            },
        }).as('getUserVotesRecovery');

        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatusRecovery');

        cy.intercept('**/api/kbo/rankings/*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getRankingsRecovery');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range') || req.url.includes('/api/matches/bounds')) {
                return;
            }

            const gameId = req.url.split('/').pop()?.split('?')[0];
            if (gameId === pastGameId) {
                req.reply({
                    statusCode: 200,
                    body: {
                        gameId: pastGameId,
                        gameDate: '2026-02-18',
                        homeTeam: 'LG',
                        awayTeam: 'KT',
                        stadium: '잠실',
                        startTime: '18:30',
                        homeScore: null,
                        awayScore: null,
                        winner: null,
                    },
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: todayGameId,
                    gameDate: today,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    startTime: '18:30',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getGameDetailRecovery');
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
        interceptPredictionCommon();
    });

    it('빈 구간에서도 자동 과거 탐색으로 이전 경기로 이동한다', () => {
        cy.intercept('**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2026-02-01',
                latestGameDate: '2026-10-01',
            },
        }).as('getBoundsRecovery');

        cy.intercept('GET', '**/api/matches/range*', (req) => {
            const url = new URL(req.url);
            const withMeta = url.searchParams.get('withMeta');
            const endDate = url.searchParams.get('endDate') || '';

            if (withMeta === 'true' && endDate < today) {
                req.reply({
                    statusCode: 200,
                    body: {
                        content: [
                            {
                                gameId: pastGameId,
                                gameDate: '2026-02-18',
                                homeTeam: 'LG',
                                awayTeam: 'KT',
                                stadium: '잠실',
                                homeScore: null,
                                awayScore: null,
                                winner: null,
                            },
                        ],
                        page: 0,
                        size: 150,
                        totalElements: 1,
                        totalPages: 1,
                        hasNext: false,
                        hasPrevious: false,
                    },
                });
                return;
            }

            if (withMeta === 'true') {
                req.reply({
                    statusCode: 200,
                    body: {
                        content: [],
                        page: 0,
                        size: 150,
                        totalElements: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrevious: false,
                    },
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: [],
            });
        }).as('getRangeRecovery');

        openPredictionPage();
        cy.wait('@getBoundsRecovery');
        cy.wait('@getRangeRecovery');
        cy.contains(/(KT vs LG|LG vs KT)/, { timeout: 20000 }).should('be.visible');
        cy.contains('이전 경기 조회 실패').should('not.exist');
    });

    it('경계 도달 시 오류 대신 중립 안내를 표시한다', () => {
        cy.intercept('**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: false,
                earliestGameDate: null,
                latestGameDate: null,
            },
        }).as('getBoundsNoData');

        cy.intercept('GET', '**/api/matches/range*', {
            statusCode: 200,
            body: [],
        }).as('getRangeNoData');

        openPredictionPage();
        cy.wait('@getBoundsNoData');
        cy.wait('@getRangeNoData');
        cy.contains(/현재 표시할 예측 경기가 없습니다.|더 이상 (이전|예정) 경기가 없습니다\./, { timeout: 10000 }).should('be.visible');
        cy.contains('조회 실패').should('not.exist');
    });

    it('실제 미래 조회 실패에서는 오류 배너를 표시한다', () => {
        cy.intercept('**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2026-02-01',
                latestGameDate: '2026-10-01',
            },
        }).as('getBoundsFutureError');

        cy.intercept('GET', '**/api/matches/range*', (req) => {
            const url = new URL(req.url);
            const withMeta = url.searchParams.get('withMeta');

            if (withMeta === 'true') {
                req.reply({
                    statusCode: 500,
                    body: { message: 'future range failed' },
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: [
                    {
                        gameId: todayGameId,
                        gameDate: today,
                        homeTeam: 'HH',
                        awayTeam: 'SS',
                        stadium: '대전',
                        homeScore: null,
                        awayScore: null,
                        winner: null,
                    },
                ],
            });
        }).as('getRangeFutureError');

        openPredictionPage();
        cy.wait('@getBoundsFutureError');
        cy.wait('@getRangeFutureError');
        cy.get('svg.lucide-chevron-right')
            .filter(':visible')
            .first()
            .closest('button')
            .click({ force: true });
        cy.contains(/미래 구간 조회|요청 실패|오류/, { timeout: 10000 }).should('be.visible');
        cy.contains(/홈으로 이동|목록으로 이동/).should('be.visible');
        cy.contains(/예정 경기 다시 불러오기|다시 시도/).should('be.visible');
    });

    it('120초가 지난 실행 세션은 stale 처리 후 timeout 복구 오버레이를 노출한다', () => {
        cy.window().then((win) => {
            const staleStartedAt = Date.now() - 130_000;
            win.sessionStorage.setItem('prediction:run-session:v1', JSON.stringify({
                flowId: 'stale-flow-1',
                gameId: todayGameId,
                action: 'vote',
                startedAt: staleStartedAt,
                team: 'home',
                bannerDismissed: true,
                timeoutStage: 'warning',
            }));
        });

        cy.intercept('**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2026-02-01',
                latestGameDate: '2026-10-01',
            },
        }).as('getBoundsStaleSession');

        cy.intercept('GET', '**/api/matches/range*', {
            statusCode: 200,
            body: [
                {
                    gameId: todayGameId,
                    gameDate: today,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            ],
        }).as('getRangeStaleSession');

        openPredictionPage();

        cy.wait('@getBoundsStaleSession');
        cy.wait('@getRangeStaleSession');
        cy.contains('예측 처리 중 오류가 발생했습니다.', { timeout: 10000 }).should('be.visible');
        cy.contains('실행 세션이 만료되었습니다.').should('be.visible');
        cy.contains('button', '다시 시도').should('be.visible');
        cy.contains('button', '목록으로 이동').should('be.visible');
    });
});
