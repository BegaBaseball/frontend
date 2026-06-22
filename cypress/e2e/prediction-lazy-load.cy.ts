/// <reference types="cypress" />

import {
    getPredictionAuthRequestTraces,
    installPredictionAuthenticatedSessionIntercept,
    installPredictionBootstrapIntercept,
    installPredictionGuestSessionIntercept,
    visitPredictionPage,
} from '../support/predictionPage';

const COACH_BRIEFING_SESSION_STORAGE_KEY = 'prediction:coachBriefing:v2';
const COACH_BRIEFING_LOCAL_STORAGE_KEY = 'prediction:coachBriefing:local:v2';

const matchBoundsPayload = {
    hasData: true,
    earliestGameDate: '2026-02-01',
    latestGameDate: '2026-02-10',
};

type ControlledIdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

type PredictionDeferredIdleWindow = Window & {
    __flushPredictionDeferredIdle?: () => void;
    __flushPredictionDeferredWork?: () => void;
};

describe('Prediction Lazy Load', () => {
    const today = '2026-02-03';
    const previousDate = '2026-02-02';
    const nextDate = '2026-02-06';
    const emptyStateText = /오늘은 예정된 경기가 없습니다\.|예정된 경기 일정이 없습니다\./;
    const displayDatePattern = (date: string) => {
        const [year, month, day] = date.split('-').map((value) => Number(value));
        return new RegExp(`${year}년\\s*${month}월\\s*${day}일`);
    };

    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
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

    const buildCoachAnalyzeSse = (message = '실데이터 브리핑을 준비했습니다.') => [
        'event: message\n',
        `data: ${JSON.stringify({ delta: message })}\n`,
        '\n',
        'event: meta\n',
        `data: ${JSON.stringify({
            request_mode: 'auto_brief',
            game_status_bucket: 'SCHEDULED',
            structured_response: {
                headline: '메타 헤드라인',
                sentiment: 'positive',
                key_metrics: [],
                analysis: {
                    strengths: [],
                    weaknesses: [],
                    risks: [],
                },
                detailed_markdown: '상세 리포트',
                coach_note: '코치 노트',
            },
        })}\n`,
        '\n',
        'event: done\n',
        'data: [DONE]',
    ].join('');

    const buildGameDetail = (gameId: string) => {
        const datePrefix = gameId.slice(0, 8);
        const gameDate = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;
        const isCompletedExample = gameId === '20260202HHSS0';

        return {
            gameId,
            homeTeam: 'HH',
            awayTeam: 'SS',
            stadium: '대전',
            gameDate,
            gameStatus: isCompletedExample ? 'COMPLETED' : 'SCHEDULED',
            gameStatusKr: isCompletedExample ? '경기 종료' : '경기 예정',
            homeScore: isCompletedExample ? 4 : null,
            awayScore: isCompletedExample ? 2 : null,
            winner: isCompletedExample ? 'home' : null,
        };
    };

    const installDeferredIdleControl = (win: Window) => {
        const callbacks = new Map<number, ControlledIdleCallback>();
        const rafCallbacks = new Map<number, FrameRequestCallback>();
        let nextId = 1;
        let nextRafId = 1;
        const controlledWindow = win as PredictionDeferredIdleWindow & {
            requestIdleCallback: (callback: ControlledIdleCallback, options?: { timeout?: number }) => number;
            cancelIdleCallback: (id: number) => void;
            requestAnimationFrame: (callback: FrameRequestCallback) => number;
            cancelAnimationFrame: (id: number) => void;
        };

        controlledWindow.requestAnimationFrame = (callback: FrameRequestCallback) => {
            const id = nextRafId;
            nextRafId += 1;
            rafCallbacks.set(id, callback);
            return id;
        };
        controlledWindow.cancelAnimationFrame = (id: number) => {
            rafCallbacks.delete(id);
        };
        controlledWindow.requestIdleCallback = (callback: ControlledIdleCallback) => {
            const id = nextId;
            nextId += 1;
            callbacks.set(id, callback);
            return id;
        };
        controlledWindow.cancelIdleCallback = (id: number) => {
            callbacks.delete(id);
        };
        const flushAnimationFrame = () => {
            const pendingCallbacks = [...rafCallbacks.values()];
            rafCallbacks.clear();
            pendingCallbacks.forEach((callback) => callback(win.performance.now()));
        };
        const flushIdle = () => {
            const pendingCallbacks = [...callbacks.values()];
            callbacks.clear();
            pendingCallbacks.forEach((callback) => callback({
                didTimeout: false,
                timeRemaining: () => 50,
            }));
        };
        controlledWindow.__flushPredictionDeferredIdle = () => {
            flushIdle();
        };
        controlledWindow.__flushPredictionDeferredWork = () => {
            flushAnimationFrame();
            flushAnimationFrame();
            flushIdle();
        };
    };

    const flushPredictionDeferredWork = () => {
        cy.window().then((win) => {
            const controlledWindow = win as PredictionDeferredIdleWindow;
            if (controlledWindow.__flushPredictionDeferredWork) {
                controlledWindow.__flushPredictionDeferredWork();
                return;
            }
            controlledWindow.__flushPredictionDeferredIdle?.();
        });
    };

    const flushPredictionAdjacentPrefetchWork = (selectedDate: string) => {
        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${selectedDate}"]`)
            .should('have.attr', 'aria-pressed', 'true');
        cy.wait(0, { log: false });
        flushPredictionDeferredWork();
    };

    const installCommonPredictionIntercepts = () => {
        installPredictionAuthenticatedSessionIntercept('getPredictionSessionLazy');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: matchBoundsPayload,
        }).as('getMatchBoundsLazy');

        cy.intercept('GET', '**/api/leaderboard/me', {
            statusCode: 200,
            body: {
                handle: 'testuser',
                userName: 'TestUser',
                rank: 1,
                totalScore: 0,
                seasonScore: 0,
                monthlyScore: 0,
                weeklyScore: 0,
                level: 1,
                rankTitle: 'ROOKIE',
                currentStreak: 0,
                maxStreak: 0,
                experiencePoints: 0,
                nextLevelExp: 100,
            },
        }).as('getLeaderboardMeLazy');

        cy.intercept('GET', '**/api/prediction/stats/me*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    accuracy: 61.5,
                    totalPredictions: 13,
                    correctPredictions: 8,
                    streak: 2,
                },
            },
        }).as('getPredictionStatsLazy');

        cy.intercept('GET', /\/api\/predictions\/ranking\/current-season(?:\?.*)?$/, {
            statusCode: 200,
            body: { seasonYear: 2026 },
        }).as('getRankingPredictionSeasonLazy');

        cy.intercept('GET', /\/api\/predictions\/ranking(?:\?.*)?$/, {
            statusCode: 404,
            body: { message: '저장된 순위 예측이 없습니다.' },
        }).as('getSavedRankingPredictionLazy');

        cy.intercept('GET', '**/api/predictions/ranking/init*', {
            statusCode: 200,
            body: {
                seasonYear: 2026,
                saved: null,
            },
        }).as('getRankingPredictionInitLazy');

        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: { votes: {} },
        }).as('getUserVotesLazy');

        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getUserVoteLazy');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatusLazy');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapLazy',
            games: (url) => {
                const date = url.searchParams.get('date') || today;
                const gameId = url.searchParams.get('gameId') || '20260203HHSS0';
                return [{
                    gameId,
                    gameDate: date,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                }];
            },
            detailByGameId: (gameId) => buildGameDetail(gameId || '20260203HHSS0'),
            voteStatusByGameId: (gameId) => ({
                gameId,
                homeVotes: 0,
                awayVotes: 0,
                totalVotes: 0,
                homePercentage: 0,
                awayPercentage: 0,
            }),
        });

        cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getRankingsLazy');

        cy.intercept('POST', '**/ai/coach/analyze*', {
            statusCode: 200,
            headers: {
                'content-type': 'text/event-stream',
            },
            body: buildCoachAnalyzeSse(),
        }).as('coachAnalyzeLazy');

        cy.intercept('GET', /\/api\/matches\/[^/]+\/live-relay(?:\?.*)?$/, {
            statusCode: 200,
            body: {
                gameId: '20260203HHSS0',
                events: [],
                lastRelayId: null,
                lastUpdatedAt: null,
            },
        }).as('getLiveRelayLazy');

        cy.intercept('GET', /\/api\/matches\/[^/]+\/live(?:\?.*)?$/, {
            statusCode: 200,
            body: {
                gameId: '20260203HHSS0',
                events: [],
                lastEventSeq: null,
                lastUpdatedAt: null,
            },
        }).as('getLiveSnapshotLazy');

        cy.intercept('GET', /\/api\/matches\/\d{8}[A-Z]{4}\d(?:\?.*)?$/, (req) => {
            const gameId = req.url.split('/').pop() || '20260206HHSS0';
            req.reply({
                statusCode: 200,
                body: buildGameDetail(gameId),
            });
        }).as('getGameDetailLazy');
    };

    const openPredictionPage = (
        path = '/prediction',
        waitForMatchDayAlias = 'getMatchDay',
        onBeforeLoad?: (win: Window) => void
    ) => {
        visitPredictionPage({
            path,
            token: 'prediction-lazy-load-token',
            persistedAuthHint: true,
            resetStorage: true,
            onBeforeLoad,
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        if (waitForMatchDayAlias) {
            cy.wait(`@${waitForMatchDayAlias}`);
        }
        cy.get('@getUserVoteLazy.all').should('have.length', 0);
        getPredictionAuthRequestTraces().should('deep.equal', []);
    };

    const installMatchDayResponse = (currentDate: string, nextDate: string, gameId = '20260203HHSS0') => {
        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === currentDate) {
                req.reply({
                    statusCode: 200,
                    body: {
                        date: currentDate,
                        games: [
                            {
                                gameId,
                                gameDate: currentDate,
                                homeTeam: 'HH',
                                awayTeam: 'SS',
                                stadium: '대전',
                                homeScore: null,
                                awayScore: null,
                                winner: null,
                            },
                        ],
                        prevDate: null,
                        nextDate,
                        hasPrev: false,
                        hasNext: true,
                    },
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: {
                        date: nextDate,
                        games: [
                            {
                                gameId: gameId.replace(currentDate.replace(/-/g, ''), nextDate.replace(/-/g, '')),
                                gameDate: nextDate,
                                homeTeam: 'HH',
                                awayTeam: 'SS',
                                stadium: '서울',
                                homeScore: null,
                                awayScore: null,
                                winner: null,
                            },
                        ],
                        prevDate: currentDate,
                        nextDate: null,
                        hasPrev: true,
                        hasNext: false,
                    },
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDayForLazyEntry');
    };

    const getPredictionChunkResourceCounts = (win: Window) => {
        const resourceEntries = win.performance.getEntriesByType('resource');
        const countChunkLoads = (chunkName: string) =>
            resourceEntries.filter((entry) => entry.name.includes(chunkName)).length;
        const countCoachAnalysisDialogLoads = () =>
            resourceEntries.filter((entry) => (
                entry.name.includes('/CoachAnalysisDialog.tsx')
                || entry.name.includes('CoachAnalysisDialog-')
            )).length;

        return {
            matchCard: countChunkLoads('AdvancedMatchCard'),
            animatedSection: countChunkLoads('PredictionAnimatedSections'),
            comboAnimation: countChunkLoads('ComboAnimation'),
            coachBriefing: countChunkLoads('CoachBriefing'),
            coachAnalysisDialog: countCoachAnalysisDialogLoads(),
            rankingTab: countChunkLoads('PredictionRankingTab'),
            rankingPrediction: countChunkLoads('RankingPrediction'),
            statsPanel: countChunkLoads('PredictionStatsPanel'),
            vendorMotion: countChunkLoads('vendor-motion'),
        };
    };

    const assertPredictionChunkResourceCounts = (
        assertCounts: (counts: ReturnType<typeof getPredictionChunkResourceCounts>) => void
    ) => {
        cy.window().should((win) => {
            assertCounts(getPredictionChunkResourceCounts(win));
        });
    };

    beforeEach(() => {
        cy.visit('about:blank');
        cy.window().then((win) => {
            win.sessionStorage.clear();
            win.sessionStorage.removeItem(COACH_BRIEFING_SESSION_STORAGE_KEY);
            win.localStorage.removeItem('kbo-theme');
            win.localStorage.removeItem('prediction:run-session');
            win.sessionStorage.removeItem('prediction:run-session:v1');
            win.localStorage.removeItem('prediction:run-session');
            win.localStorage.removeItem(COACH_BRIEFING_LOCAL_STORAGE_KEY);
        });
        cy.mockAPI({ skipRankings: true });
        installCommonPredictionIntercepts();
        const now = new Date('2026-02-03T12:00:00').getTime();
        cy.clock(now, ['Date']);
    });

    it('loads today once and prefetches only adjacent non-past dates', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
                        {
                            gameId: '20260203HHSS0',
                            gameDate: today,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage('/prediction', 'getMatchDay', installDeferredIdleControl);
        flushPredictionAdjacentPrefetchWork(today);
        cy.wait('@getMatchDay');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, nextDate]);
        });
    });

    it('moves to the prefetched next date without issuing an extra day request', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage('/prediction', 'getMatchDay', installDeferredIdleControl);
        flushPredictionAdjacentPrefetchWork(today);
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.have.members([today, nextDate]);
        });

        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${nextDate}"]`).click({ force: true });
        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${nextDate}"]`)
            .should('have.attr', 'aria-pressed', 'true');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, nextDate]);
        });
    });

    it('offers a quick action to jump to the nearest available game date from the empty state', () => {
        const emptyAnchorDate = '2026-02-05';
        const nearestPreviousDate = '2026-02-04';
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === emptyAnchorDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(emptyAnchorDate, [], nearestPreviousDate, null),
                });
                return;
            }

            if (date === nearestPreviousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nearestPreviousDate, [
                        {
                            gameId: '20260204HHSS0',
                            gameDate: nearestPreviousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: 4,
                            awayScore: 2,
                            winner: 'home',
                        },
                    ], today, emptyAnchorDate),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage(`/prediction?date=${emptyAnchorDate}`, 'getMatchDay', installDeferredIdleControl);
        flushPredictionAdjacentPrefetchWork(emptyAnchorDate);
        cy.wait('@getMatchDay');

        cy.get('[data-testid="prediction-empty-nearest-date-btn"]')
            .should('contain', '가장 가까운 이전 경기 보기')
            .click({ force: true });

        cy.location('search').should('include', `date=${nearestPreviousDate}`);
        cy.get('[data-testid="prediction-date-game-list"]').should('not.exist');
        cy.get('[data-testid="prediction-schedule-match-row"][data-game-id="20260204HHSS0"]')
            .should('be.visible')
            .and('have.attr', 'aria-label')
            .and('include', '삼성 라이온즈')
            .and('include', '한화 이글스');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.include(emptyAnchorDate);
            expect(requestedDates).to.include(nearestPreviousDate);
        });
    });

    it('moves to the prefetched previous non-past date without issuing an extra day request', () => {
        const anchorDate = '2026-02-05';
        const prefetchedPreviousDate = '2026-02-04';
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === anchorDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(anchorDate, [], prefetchedPreviousDate, nextDate),
                });
                return;
            }

            if (date === prefetchedPreviousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(prefetchedPreviousDate, [
                        {
                            gameId: '20260204HHSS0',
                            gameDate: prefetchedPreviousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, anchorDate),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage(`/prediction?date=${anchorDate}`, 'getMatchDay', installDeferredIdleControl);
        flushPredictionAdjacentPrefetchWork(anchorDate);
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.include.members([anchorDate, prefetchedPreviousDate, nextDate]);
        });

        let previousDateRequestCountBeforeClick = 0;
        cy.then(() => {
            previousDateRequestCountBeforeClick = requestedDates.filter((date) => date === prefetchedPreviousDate).length;
        });
        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${prefetchedPreviousDate}"]`).click({ force: true });
        cy.wrap(null).then(() => {
            expect(requestedDates.filter((date) => date === prefetchedPreviousDate)).to.have.length(previousDateRequestCountBeforeClick);
        });
    });

    it('retries the target day on click when background prefetch failed', () => {
        let nextDateRequestCount = 0;

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], null, nextDate),
                });
                return;
            }

            if (date === nextDate) {
                nextDateRequestCount += 1;
                if (nextDateRequestCount === 1) {
                    req.reply({
                        statusCode: 500,
                        body: { message: 'prefetch failed' },
                    });
                    return;
                }

                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: buildDayResponse(previousDate, [], null, today),
            });
        }).as('getMatchDay');

        openPredictionPage('/prediction', 'getMatchDay', installDeferredIdleControl);
        flushPredictionAdjacentPrefetchWork(today);
        cy.wait('@getMatchDay').then((interception) => {
            const date = new URL(interception.request.url).searchParams.get('date');
            expect(date).to.eq(nextDate);
            expect(interception.response?.statusCode).to.eq(500);
        });
        cy.wrap(null).should(() => {
            expect(nextDateRequestCount).to.eq(1);
        });
        cy.wait(0, { log: false });

        cy.get('body').then(($body) => {
            const hasTargetDateButton = $body.find(`[data-testid="prediction-schedule-date-button"][data-date="${nextDate}"]`).length > 0;
            if (hasTargetDateButton) {
                cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${nextDate}"]`).click({ force: true });
                return;
            }

            const hasQuickAction = $body.find('[data-testid="prediction-empty-nearest-date-btn"]').length > 0;
            if (hasQuickAction) {
                cy.get('[data-testid="prediction-empty-nearest-date-btn"]').click({ force: true });
                return;
            }

            cy.contains('button', '다시 시도').click({ force: true });
        });
        cy.wait('@getMatchDay').then((interception) => {
            const date = new URL(interception.request.url).searchParams.get('date');
            expect(date).to.eq(nextDate);
            expect(interception.response?.statusCode).to.eq(200);
        });
        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${nextDate}"]`, { timeout: 15000 })
            .should('have.attr', 'aria-pressed', 'true');
        cy.wrap(null).should(() => {
            expect(nextDateRequestCount).to.be.gte(2);
        });
    });

    it('loads AdvancedMatchCard first and defers coaching enhancements until requested', () => {
        const detailGameId = '20260203HHSS1';

        openPredictionPage(
            `/prediction?gameId=${detailGameId}&date=${today}`,
            'getPredictionBootstrapLazy',
            installDeferredIdleControl
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.get('@getPredictionBootstrapLazy.all').should('have.length', 1);
        cy.wait(100);
        cy.get('@getRankingsLazy.all').should('have.length', 0);
        cy.get('@getLiveSnapshotLazy.all').should('have.length', 0);
        cy.get('@getLiveRelayLazy.all').should('have.length', 0);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.equal(0);
            expect(counts.comboAnimation).to.equal(0);
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.rankingTab).to.equal(0);
            expect(counts.rankingPrediction).to.equal(0);
            expect(counts.statsPanel).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
        cy.get('@getPredictionStatsLazy.all').should('have.length', 0);

        flushPredictionDeferredWork();
        cy.wait('@getRankingsLazy');
        cy.wait(600);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.coachBriefing).to.be.greaterThan(0);
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
        cy.get('@coachAnalyzeLazy.all').should('have.length', 1);

        cy.get('[data-testid="coach-briefing-card"]')
            .scrollIntoView()
            .should('be.visible');
        cy.window().then((win) => {
            win.dispatchEvent(new Event('scroll'));
        });
        cy.wait(400);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });

        cy.get('[data-testid="coach-analysis-open"]').click({ force: true });
        cy.get('[data-testid="coach-analysis-dialog"]').should('be.visible');
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.coachAnalysisDialog).to.be.greaterThan(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('starts live polling only after detail render and deferred idle work', () => {
        const liveGameId = '20260203HHSS0';

        installPredictionBootstrapIntercept({
            alias: 'getLivePredictionBootstrapLazy',
            games: (url) => {
                const date = url.searchParams.get('date') || today;
                const gameId = url.searchParams.get('gameId') || liveGameId;
                return [{
                    gameId,
                    gameDate: date,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    homeScore: 1,
                    awayScore: 0,
                    winner: null,
                    gameStatus: 'LIVE',
                }];
            },
            detailByGameId: (gameId) => ({
                ...buildGameDetail(gameId || liveGameId),
                gameStatus: 'LIVE',
                gameStatusKr: '경기 중',
                homeScore: 1,
                awayScore: 0,
            }),
            voteStatusByGameId: (gameId) => ({
                gameId,
                homeVotes: 0,
                awayVotes: 0,
                totalVotes: 0,
                homePercentage: 0,
                awayPercentage: 0,
            }),
        });

        openPredictionPage(
            `/prediction?gameId=${liveGameId}&date=${today}`,
            'getLivePredictionBootstrapLazy',
            installDeferredIdleControl
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.wait(100);
        cy.get('@getLiveSnapshotLazy.all').should('have.length', 0);
        cy.get('@getLiveRelayLazy.all').should('have.length', 0);

        flushPredictionDeferredWork();
        cy.wait(100);
        flushPredictionDeferredWork();
        cy.wait('@getLiveSnapshotLazy');
        cy.wait('@getLiveRelayLazy');
    });

    it('does not start live polling for a past completed deep link after deferred idle work', () => {
        const completedGameId = '20260202HHSS0';

        openPredictionPage(
            `/prediction?gameId=${completedGameId}&date=${previousDate}`,
            'getPredictionBootstrapLazy',
            installDeferredIdleControl
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.wait(100);
        cy.get('@getLiveSnapshotLazy.all').should('have.length', 0);
        cy.get('@getLiveRelayLazy.all').should('have.length', 0);

        flushPredictionDeferredWork();
        cy.wait('@getRankingsLazy');
        cy.wait(100);
        cy.get('@getLiveSnapshotLazy.all').should('have.length', 0);
        cy.get('@getLiveRelayLazy.all').should('have.length', 0);
    });

    it('stops live polling retries after manual-data-required from live relay', () => {
        const liveGameId = '20260203HHSS2';

        cy.intercept('GET', /\/api\/matches\/[^/]+\/live(?:\?.*)?$/, {
            statusCode: 200,
            body: {
                gameId: liveGameId,
                gameStatus: 'LIVE',
                homeScore: 1,
                awayScore: 0,
                events: [],
                lastEventSeq: null,
                lastUpdatedAt: null,
            },
        }).as('getManualRelayLiveSnapshotLazy');

        cy.intercept('GET', /\/api\/matches\/[^/]+\/live-relay(?:\?.*)?$/, {
            statusCode: 409,
            body: {
                code: 'MANUAL_BASEBALL_DATA_REQUIRED',
                message: '문자중계 데이터 준비가 필요합니다.',
            },
        }).as('getManualRelayLiveRelayLazy');

        installPredictionBootstrapIntercept({
            alias: 'getManualRelayPredictionBootstrapLazy',
            games: [{
                gameId: liveGameId,
                gameDate: today,
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: 1,
                awayScore: 0,
                winner: null,
                gameStatus: 'LIVE',
            }],
            detailByGameId: (gameId) => ({
                ...buildGameDetail(gameId || liveGameId),
                gameStatus: 'LIVE',
                gameStatusKr: '경기 중',
                homeScore: 1,
                awayScore: 0,
            }),
            voteStatusByGameId: (gameId) => ({
                gameId,
                homeVotes: 0,
                awayVotes: 0,
                totalVotes: 0,
                homePercentage: 0,
                awayPercentage: 0,
            }),
        });

        openPredictionPage(
            `/prediction?gameId=${liveGameId}&date=${today}`,
            'getManualRelayPredictionBootstrapLazy',
            installDeferredIdleControl
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.wait(100);
        flushPredictionDeferredWork();
        cy.wait(100);
        flushPredictionDeferredWork();
        cy.wait('@getManualRelayLiveSnapshotLazy');
        cy.wait('@getManualRelayLiveRelayLazy');
        cy.get('@getManualRelayLiveSnapshotLazy.all').should('have.length', 1);
        cy.get('@getManualRelayLiveRelayLazy.all').should('have.length', 1);

        cy.window().then((win) => {
            win.dispatchEvent(new Event('focus'));
            (win as PredictionDeferredIdleWindow).__flushPredictionDeferredWork?.();
        });
        cy.wait(100);
        cy.get('@getManualRelayLiveSnapshotLazy.all').should('have.length', 1);
        cy.get('@getManualRelayLiveRelayLazy.all').should('have.length', 1);
    });

    it('loads ComboAnimation only after vote success triggers combo state', () => {
        let voteSubmitted = false;
        let voteStatusRequestCount = 0;
        let initialVoteStatusRequestCount = 0;

        cy.intercept('GET', '**/api/leaderboard/me', {
            statusCode: 200,
            body: {
                handle: 'testuser',
                userName: 'TestUser',
                rank: 1,
                totalScore: 0,
                seasonScore: 0,
                monthlyScore: 0,
                weeklyScore: 0,
                level: 1,
                rankTitle: 'ROOKIE',
                currentStreak: 3,
                maxStreak: 5,
                experiencePoints: 0,
                nextLevelExp: 100,
            },
        }).as('getLeaderboardMeLazyCombo');

        cy.intercept('POST', '**/api/predictions/vote', (req) => {
            voteSubmitted = true;
            req.reply({
                statusCode: 200,
                body: { success: true },
            });
        }).as('submitPredictionVoteLazy');

        cy.intercept('GET', '**/api/predictions/status/*', (req) => {
            voteStatusRequestCount += 1;
            req.reply({
                statusCode: 200,
                body: voteSubmitted
                    ? { homeVotes: 1, awayVotes: 0, totalVotes: 1 }
                    : { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
            });
        }).as('getVoteStatusComboLazy');

        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.get('[data-testid="prediction-match-preview-root"]').should('be.visible');
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').first().click({ force: true });
        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.wait(1200);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.comboAnimation).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });

        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.equal(0);
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });

        cy.then(() => {
            initialVoteStatusRequestCount = voteStatusRequestCount;
        });

        cy.get('[data-testid="vote-home-btn"]').click({ force: true });
        cy.wait('@submitPredictionVoteLazy');
        assertPredictionChunkResourceCounts((counts) => {
            expect(voteSubmitted).to.equal(true);
            expect(voteStatusRequestCount).to.be.greaterThan(initialVoteStatusRequestCount);
            expect(counts.comboAnimation).to.be.greaterThan(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('keeps the selected match detail visible when a date has multiple matches', () => {
        const secondGameId = '20260203LGKT0';

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
                        {
                            gameId: '20260203HHSS0',
                            gameDate: today,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            startTime: '18:30',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                            aiSummary: '한화와 삼성의 선발 매치업을 확인하세요.',
                        },
                        {
                            gameId: secondGameId,
                            gameDate: today,
                            homeTeam: 'KT',
                            awayTeam: 'LG',
                            stadium: '수원',
                            startTime: '19:00',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                            aiSummary: 'LG와 KT의 불펜 운영이 관전 포인트입니다.',
                        },
                    ], previousDate, nextDate),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMultiMatchDay');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop() || '';
            req.reply({
                statusCode: 200,
                body: gameId === secondGameId
                    ? {
                        gameId: secondGameId,
                        homeTeam: 'KT',
                        awayTeam: 'LG',
                        stadium: '수원',
                        gameDate: today,
                        gameStatus: 'SCHEDULED',
                        homeScore: null,
                        awayScore: null,
                        winner: null,
                    }
                    : buildGameDetail(gameId || '20260203HHSS0'),
            });
        }).as('getMultiGameDetail');

        openPredictionPage('/prediction', 'getMultiMatchDay');

        cy.get('[data-testid="prediction-date-game-list"]').should('not.exist');
        cy.get('[data-testid="prediction-date-game-item"]').should('not.exist');
        cy.get('[data-testid="prediction-schedule-match-row"]').should('have.length', 2);
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').first().click({ force: true });
        cy.location('search').should('include', 'gameId=20260203HHSS0').and('include', `date=${today}`);
        cy.get('[data-testid="prediction-match-detail-root"]')
            .contains('삼성 라이온즈', { timeout: 15000 })
            .should('be.visible');
    });

    it('keeps match detail loaded immediately on deep link access', () => {
        const deepLinkDate = '2026-02-03';
        const deepLinkGameId = '20260203HHSS0';

        installMatchDayResponse(deepLinkDate, nextDate, deepLinkGameId);
        openPredictionPage(
            `/prediction?gameId=${deepLinkGameId}&date=${deepLinkDate}`,
            'getPredictionBootstrapLazy'
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        cy.get('@getPredictionBootstrapLazy.all').should('have.length', 1);
        cy.get('@getMatchDayForLazyEntry.all').should('have.length', 0);
        cy.get('@getGameDetailLazy.all').should('have.length', 0);
        cy.get('@getVoteStatusLazy.all').should('have.length', 0);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('shows the existing detail error UI when bootstrap detail fails partially', () => {
        const deepLinkDate = '2026-02-03';
        const deepLinkGameId = '20260203HHSS0';

        installMatchDayResponse(deepLinkDate, nextDate, deepLinkGameId);
        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapDetailFailure',
            games: [{
                gameId: deepLinkGameId,
                gameDate: deepLinkDate,
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            }],
            detailByGameId: {
                [deepLinkGameId]: {
                    ok: false,
                    data: null,
                    error: {
                        message: 'detail fetch failed',
                        status: 404,
                        code: 'MATCH_NOT_FOUND',
                    },
                },
            },
            voteStatusByGameId: {
                [deepLinkGameId]: {
                    gameId: deepLinkGameId,
                    homeVotes: 0,
                    awayVotes: 0,
                    totalVotes: 0,
                    homePercentage: 0,
                    awayPercentage: 0,
                },
            },
        });

        openPredictionPage(
            `/prediction?gameId=${deepLinkGameId}&date=${deepLinkDate}`,
            'getPredictionBootstrapDetailFailure'
        );

        cy.get('[data-testid="prediction-match-detail-root"]').should('be.visible');
        cy.get('[data-testid="prediction-detail-error-banner"]').should('be.visible');
        cy.get('@getGameDetailLazy.all').should('have.length', 0);
    });

    it('keeps match detail loaded across ranking tab interaction', () => {
        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.get('[data-testid="prediction-match-preview-root"]').should('be.visible');
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').first().click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        cy.contains('button', '순위예측').click({ force: true });

        cy.contains('button', '승부예측').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.be.greaterThan(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('keeps ranking chunks and stats query deferred until the first ranking tab entry', () => {
        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.get('[data-testid="prediction-match-preview-root"]').should('be.visible');
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').first().click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        cy.wait(1200);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.rankingTab).to.equal(0);
            expect(counts.rankingPrediction).to.equal(0);
            expect(counts.statsPanel).to.equal(0);
            expect(counts.matchCard).to.be.greaterThan(0);
        });
        cy.get('@getPredictionStatsLazy.all').should('have.length', 0);

        cy.contains('button', '순위예측').click({ force: true });
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.rankingTab).to.be.greaterThan(0);
            expect(counts.rankingPrediction).to.be.greaterThan(0);
        });
    });

    it('retains deep-link selected match across tab switches in the same session', () => {
        const deepLinkDate = '2026-02-03';
        const deepLinkGameId = '20260203HHSS0';

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === deepLinkDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(deepLinkDate, [
                        {
                            gameId: deepLinkGameId,
                            gameDate: deepLinkDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], null, nextDate),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '서울',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], deepLinkDate, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDayDeepRetention');

        installMatchDayResponse(deepLinkDate, nextDate, deepLinkGameId);
        openPredictionPage(`/prediction?gameId=${deepLinkGameId}&date=${deepLinkDate}`, 'getPredictionBootstrapLazy');

        cy.get('@getMatchDayForLazyEntry.all').should('have.length', 0);
        cy.get('@getGameDetailLazy.all').should('have.length', 0);
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');

        cy.get('[data-testid="prediction-tab-ranking"]').click({ force: true });
        cy.get('[data-testid="prediction-tab-match"]', { timeout: 10000 }).click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');

        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.be.greaterThan(0);
        });
    });
});

describe('Prediction Public Access', () => {
    const today = '2026-02-03';
    const previousDate = '2026-02-02';
    const nextDate = '2026-02-06';
    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
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

    const buildGuestGameDetail = (gameId: string) => {
        const datePrefix = gameId.slice(0, 8);
        const gameDate = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;

        return {
            gameId,
            homeTeam: 'HH',
            awayTeam: 'SS',
            stadium: '대전',
            gameDate,
            gameStatus: 'SCHEDULED',
            gameStatusKr: '경기 예정',
            homeScore: null,
            awayScore: null,
            winner: null,
        };
    };

    const installGuestPredictionIntercepts = () => {
        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: matchBoundsPayload,
        }).as('getGuestMatchBoundsLazy');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getGuestVoteStatusLazy');

        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getGuestUserVoteLazy');

        cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getGuestRankingsLazy');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop() || '20260203HHSS0';
            req.reply({
                statusCode: 200,
                body: buildGuestGameDetail(gameId),
            });
        }).as('getGuestGameDetailLazy');
    };

    const openPredictionPageAsGuest = () => {
        visitPredictionPage({
            path: '/prediction',
            authenticated: false,
            resetStorage: true,
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    };

    beforeEach(() => {
        cy.visit('about:blank');
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.mockAPI({ skipRankings: true });
        installGuestPredictionIntercepts();
        cy.clock(new Date('2026-02-03T12:00:00').getTime(), ['Date']);
        installPredictionGuestSessionIntercept('getGuestSession');
    });

    it('loads public match day data for guests without requesting my-votes', () => {
        const requestedDates: string[] = [];
        let myVotesCallCount = 0;

        cy.intercept('**/api/predictions/my-votes*', (req) => {
            myVotesCallCount += 1;
            req.reply({
                statusCode: 200,
                body: { votes: {} },
            });
        }).as('getGuestUserVotesLazy');

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
                        {
                            gameId: '20260203HHSS0',
                            gameDate: today,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getGuestMatchDay');

        openPredictionPageAsGuest();
        cy.wait('@getGuestMatchDay');
        cy.wait('@getGuestMatchDay');

        cy.contains('전력분석실').should('be.visible');
        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, nextDate]);
            expect(myVotesCallCount).to.equal(0);
            cy.get('@getGuestSession.all').should('have.length.at.most', 2);
            cy.get('@getGuestUserVoteLazy.all').should('have.length', 0);
        });
        getPredictionAuthRequestTraces().should((traces) => {
            expect(traces.length).to.be.at.most(2);
            traces.forEach((trace) => {
                expect(trace.url).to.include('/api/auth/mypage');
            });
        });
    });
});
