/// <reference types="cypress" />

import {
    getPredictionAuthRequestTraces,
    installPredictionAuthenticatedSessionIntercept,
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

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop() || '20260206HHSS0';
            req.reply({
                statusCode: 200,
                body: buildGameDetail(gameId),
            });
        }).as('getGameDetailLazy');
    };

    const openPredictionPage = (path = '/prediction', waitForMatchDayAlias = 'getMatchDay') => {
        visitPredictionPage({
            path,
            token: 'prediction-lazy-load-token',
            resetStorage: true,
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

    it('loads today once and immediately prefetches only adjacent dates', () => {
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

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
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

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });

        cy.get('body').then(($body) => {
            const hasQuickAction = $body.find('[data-testid="prediction-empty-nearest-date-btn"]').length > 0;
            if (hasQuickAction) {
                cy.get('[data-testid="prediction-empty-nearest-date-btn"]').click({ force: true });
                return;
            }

            cy.get('button[aria-label="다음 날짜 보기"]:visible').first().click({ force: true });
        });
        cy.contains(displayDatePattern(nextDate)).should('exist');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });
    });

    it('offers a quick action to jump to the nearest available game date from the empty state', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], previousDate, null),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [
                        {
                            gameId: '20260202HHSS0',
                            gameDate: previousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: 4,
                            awayScore: 2,
                            winner: 'home',
                        },
                    ], null, today),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');

        cy.get('[data-testid="prediction-empty-nearest-date-btn"]')
            .should('contain', '가장 가까운 이전 경기 보기')
            .click({ force: true });

        cy.contains(displayDatePattern(previousDate)).should('exist');
        cy.contains(/(삼성\s*라이온즈|SS)\s+vs\s+(한화\s*이글스|HH)/).should('exist');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate]);
        });
    });

    it('moves to the prefetched previous date without issuing an extra day request', () => {
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
                    body: buildDayResponse(previousDate, [
                        {
                            gameId: '20260202HHSS0',
                            gameDate: previousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], null, today),
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

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });

        cy.get('button[aria-label="이전 날짜 보기"]').first().click({ force: true });
        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
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

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(nextDateRequestCount).to.eq(1);
        });

        cy.get('body').then(($body) => {
            const hasRetryButton = $body.find('button').filter((_, element) => (element.textContent || '').includes('다시 시도')).length > 0;
            if (hasRetryButton) {
                cy.contains('button', '다시 시도').click({ force: true });
                return;
            }

            const hasQuickAction = $body.find('[data-testid="prediction-empty-nearest-date-btn"]').length > 0;
            if (hasQuickAction) {
                cy.get('[data-testid="prediction-empty-nearest-date-btn"]').click({ force: true });
                return;
            }

            cy.get('button[aria-label="다음 날짜 보기"]:visible').first().click({ force: true });
        });
        cy.contains(displayDatePattern(nextDate), { timeout: 15000 }).should('exist');
        cy.wrap(null).should(() => {
            expect(nextDateRequestCount).to.be.gte(1);
        });
    });

    it('loads AdvancedMatchCard first and defers coaching enhancements until requested', () => {
        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.wait('@getMatchDayForLazyEntry');
        cy.contains('button', '경기 상세 보기').should('be.visible');
        cy.wait(1200);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.animatedSection).to.equal(0);
            expect(counts.comboAnimation).to.equal(0);
            expect(counts.coachBriefing).to.equal(0);
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.rankingTab).to.equal(0);
            expect(counts.rankingPrediction).to.equal(0);
            expect(counts.statsPanel).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
        cy.get('@getPredictionStatsLazy.all').should('have.length', 0);

        cy.contains('button', '경기 상세 보기').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
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

        cy.wait(1300);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.coachBriefing).to.be.greaterThan(0);
            expect(counts.coachAnalysisDialog).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
        cy.get('@coachAnalyzeLazy.all').should('have.length', 0);

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

        cy.wait('@getMatchDayForLazyEntry');
        cy.contains('button', '경기 상세 보기').should('be.visible');
        cy.wait(1200);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.comboAnimation).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });

        cy.contains('button', '경기 상세 보기').click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.equal(0);
            expect(counts.comboAnimation).to.equal(0);
            expect(counts.coachBriefing).to.equal(0);
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

    it('keeps match detail loaded immediately on deep link access', () => {
        const deepLinkDate = '2026-02-03';
        const deepLinkGameId = '20260203HHSS0';

        installMatchDayResponse(deepLinkDate, nextDate, deepLinkGameId);
        openPredictionPage(
            `/prediction?gameId=${deepLinkGameId}&date=${deepLinkDate}`,
            'getMatchDayForLazyEntry'
        );

        cy.wait('@getMatchDayForLazyEntry');
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.be.greaterThan(0);
            expect(counts.animatedSection).to.equal(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('does not load match card chunk until match detail entry even after ranking tab interaction', () => {
        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.wait('@getMatchDayForLazyEntry');
        cy.contains('button', '경기 상세 보기').should('be.visible');
        cy.contains('button', '순위예측').click({ force: true });

        cy.contains('button', '승부예측').click({ force: true });
        cy.contains('button', '경기 상세 보기').should('be.visible');
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.matchCard).to.equal(0);
            expect(counts.animatedSection).to.be.greaterThan(0);
            expect(counts.vendorMotion).to.equal(0);
        });
    });

    it('keeps ranking chunks and stats query deferred until the first ranking tab entry', () => {
        installMatchDayResponse(today, nextDate);
        openPredictionPage('/prediction', 'getMatchDayForLazyEntry');

        cy.wait('@getMatchDayForLazyEntry');
        cy.contains('button', '경기 상세 보기').should('be.visible');
        cy.wait(1200);
        assertPredictionChunkResourceCounts((counts) => {
            expect(counts.rankingTab).to.equal(0);
            expect(counts.rankingPrediction).to.equal(0);
            expect(counts.statsPanel).to.equal(0);
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
        openPredictionPage(`/prediction?gameId=${deepLinkGameId}&date=${deepLinkDate}`, 'getMatchDayForLazyEntry');

        cy.wait('@getMatchDayForLazyEntry');
        cy.get('[data-testid="vote-home-btn"]').should('be.visible');
        cy.contains('button', '경기 상세 보기').should('not.exist');

        cy.contains('button', '순위예측').click({ force: true });
        cy.get('button', { timeout: 10000 }).contains('승부예측').click({ force: true });
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
        cy.wait('@getGuestMatchDay');

        cy.contains('전력분석실').should('be.visible');
        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
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
