/// <reference types="cypress" />

import { installPredictionAuthenticatedSessionIntercept, visitPredictionPage } from '../support/predictionPage';

describe('Prediction Range Recovery', () => {
    const today = '2026-02-22';
    const todayGameId = '20260222HHSS0';
    const pastDate = '2026-02-18';
    const pastGameId = '20260218LGKT0';
    const futureDate = '2026-02-23';
    const matchBoundsPayload = {
        hasData: true,
        earliestGameDate: '2026-02-18',
        latestGameDate: '2026-02-23',
    };

    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
        { teamId: 'LG', teamName: 'LG 트윈스', rank: 3, wins: 45, losses: 35, draws: 0, winRate: '0.563', games: 80, gamesBehind: 2.0 },
        { teamId: 'KT', teamName: 'KT 위즈', rank: 4, wins: 44, losses: 36, draws: 0, winRate: '0.550', games: 80, gamesBehind: 2.5 },
    ];

    const buildDayResponse = (
        date: string,
        games: Array<Record<string, unknown>>,
        prevDateValue: string | null,
        nextDateValue: string | null
    ) => ({
        date,
        games,
        prevDate: prevDateValue,
        nextDate: nextDateValue,
        hasPrev: Boolean(prevDateValue),
        hasNext: Boolean(nextDateValue),
    });

    const openPredictionPage = (onBeforeLoad?: (win: Window) => void) => {
        visitPredictionPage({
            path: '/prediction',
            token: 'prediction-range-recovery-token',
            onBeforeLoad,
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('exist');
        cy.wait('@getMatchDay');
    };

    const interceptPredictionCommon = () => {
        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: {
                votes: {
                    [todayGameId]: null,
                    [pastGameId]: null,
                },
            },
        }).as('getUserVotesRecovery');

        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getUserVote');

        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatusRecovery');

        cy.intercept('**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getRankingsRecovery');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: matchBoundsPayload,
        }).as('getMatchBoundsRecovery');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop()?.split('?')[0];
            if (gameId === pastGameId) {
                req.reply({
                    statusCode: 200,
                body: {
                    gameId: pastGameId,
                    gameDate: pastDate,
                    homeTeam: 'LG',
                    awayTeam: 'KT',
                    stadium: '잠실',
                    startTime: '18:30',
                    gameStatus: 'COMPLETED',
                    gameStatusKr: '경기 종료',
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
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getGameDetailRecovery');
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
        cy.clock(new Date('2026-02-22T12:00:00').getTime(), ['Date']);
        cy.mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept('getPredictionSessionRecovery');
        interceptPredictionCommon();
    });

    it('빈 현재 날짜에서는 자동 과거 이동 없이 중립 empty state를 유지한다', () => {
        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], pastDate, null),
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: buildDayResponse(pastDate, [
                    {
                        gameId: pastGameId,
                        gameDate: pastDate,
                        homeTeam: 'LG',
                        awayTeam: 'KT',
                        stadium: '잠실',
                        homeScore: null,
                        awayScore: null,
                        winner: null,
                    },
                ], null, today),
            });
        }).as('getMatchDay');

        openPredictionPage();
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.wait('@getMatchDay');
        cy.contains('KT 위즈').should('not.exist');
        cy.contains('조회 실패').should('not.exist');
        cy.contains('이전 경기 조회 실패').should('not.exist');
    });

    it('경계 도달 시 오류 대신 중립 안내를 표시한다', () => {
        cy.intercept('GET', '**/api/matches/day*', {
            statusCode: 200,
            body: buildDayResponse(today, [], null, null),
        }).as('getMatchDay');

        openPredictionPage();
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.contains(/예정된 경기 일정이 없습니다.|현재 표시할 예측 경기가 없습니다.|더 이상 (이전|예정) 경기가 없습니다\./, { timeout: 10000 }).should('be.visible');
        cy.contains('조회 실패').should('not.exist');
    });

    it('초기 목록 로드 실패에서는 인라인 에러만 보이고 오버레이는 노출하지 않는다', () => {
        cy.intercept('GET', '**/api/matches/day*', {
            statusCode: 500,
            body: { message: 'Request failed with status code 500' },
        }).as('getMatchDay');

        openPredictionPage();
        cy.contains('예측 경기 데이터를 불러오지 못했습니다.').should('be.visible');
        cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
        cy.get('[data-slot="alert-dialog-overlay"]').should('not.exist');
    });

    it('실제 미래 조회 실패에서는 오류 배너를 표시한다', () => {
        let futureRequestCount = 0;

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
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
                    ], null, futureDate),
                });
                return;
            }

            futureRequestCount += 1;
            req.reply({
                statusCode: 500,
                body: { message: 'future day failed' },
            });
        }).as('getMatchDay');

        openPredictionPage();
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.get('button[aria-label="다음 날짜 보기"]').first().click({ force: true });
        cy.contains(/예측 처리 중 오류가 발생했습니다.|미래 구간 조회|요청 실패|오류/, { timeout: 10000 }).should('exist');
        cy.contains('예측으로 돌아가기').should('exist');
        cy.contains(/예정 경기 다시 불러오기|다시 시도|닫기/).should('exist');
        cy.wrap(null).then(() => {
            expect(futureRequestCount).to.be.gte(1);
        });
    });

    it('stale 실행 세션이 남아 있어도 초기 prediction 화면은 중단되지 않는다', () => {
        const staleStartedAt = Date.now() - 130_000;
        const staleRunSession = JSON.stringify({
            flowId: 'stale-flow-1',
            gameId: todayGameId,
            action: 'vote',
            startedAt: staleStartedAt,
            team: 'home',
            bannerDismissed: true,
            timeoutStage: 'warning',
        });

        cy.intercept('GET', '**/api/matches/day*', {
            statusCode: 200,
            body: buildDayResponse(today, [
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
            ], null, null),
        }).as('getMatchDay');

        openPredictionPage();
        cy.window().then((win) => {
            win.sessionStorage.setItem('prediction:run-session:v1', staleRunSession);
        });
        cy.tick(100);
        cy.window().then((win) => {
            win.dispatchEvent(new Event('pageshow'));
        });
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.contains('전력분석실', { timeout: 10000 }).should('be.visible');
        cy.contains('삼성 라이온즈 vs 한화 이글스').should('be.visible');
    });
});
