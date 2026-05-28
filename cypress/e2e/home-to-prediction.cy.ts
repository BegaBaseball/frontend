/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

describe('Home to Prediction deep link', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayCompact = today.replace(/-/g, '');
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
    const tomorrowCompact = tomorrow.replace(/-/g, '');
    const matchDetailPattern = /\/api\/matches\/(?!day(?:[/?#]|$)|range(?:[/?#]|$)|bounds(?:[/?#]|$))[^/?#]+(?:\?.*)?$/;
    const buildWidgetsResponse = (rankingSeasonYear = now.getFullYear()) => ({
        hotCheerPosts: [],
        featuredMates: [],
        rankingSnapshot: {
            rankingSeasonYear,
            rankingSourceMessage: `${rankingSeasonYear} 시즌 순위 데이터`,
            isOffSeason: false,
            rankings: [],
        },
    });
    const homeGames = [
        {
            gameId: `${todayCompact}HHLG0`,
            time: '18:30',
            stadium: '대전',
            gameStatus: 'SCHEDULED',
            gameStatusKr: '경기전',
            gameInfo: '',
            leagueType: 'REGULAR',
            homeTeam: 'HH',
            homeTeamFull: '한화 이글스',
            awayTeam: 'LG',
            awayTeamFull: 'LG 트윈스',
            sourceDate: today,
        },
        {
            gameId: `${todayCompact}KTSS0`,
            time: '18:30',
            stadium: '수원',
            gameStatus: 'SCHEDULED',
            gameStatusKr: '경기전',
            gameInfo: '',
            leagueType: 'REGULAR',
            homeTeam: 'SS',
            homeTeamFull: '삼성 라이온즈',
            awayTeam: 'KT',
            awayTeamFull: 'KT 위즈',
            sourceDate: today,
        },
    ];
    const tomorrowGames = homeGames.map((game) => ({
        ...game,
        gameId: game.gameId.includes('KTSS0') ? `${tomorrowCompact}KTSS0` : `${tomorrowCompact}HHLG0`,
        sourceDate: tomorrow,
    }));

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        (cy as any).mockAPI();

        const autoCoachResponse = [
            'event: message',
            'data: {"delta":"{\\"headline\\":\\"테스트 브리핑\\",\\"coach_note\\":\\"요약 테스트\\"}"}',
            '',
            'event: meta',
            'data: {"validation_status":"success","resolved_focus":["recent_form"],"focus_signature":"recent_form","question_signature":"auto","cache_key_version":"v3","request_mode":"auto_brief","cached":false}',
            '',
            'event: done',
            'data: [DONE]',
            '',
        ].join('\\n');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: autoCoachResponse,
        }).as('coachAnalyze');

        cy.intercept('GET', '**/api/home/bootstrap*', {
            statusCode: 200,
            body: {
                selectedDate: today,
                leagueStartDates: {
                    regularSeasonStart: `${now.getFullYear()}-03-22`,
                    postseasonStart: `${now.getFullYear()}-10-06`,
                    koreanSeriesStart: `${now.getFullYear()}-10-26`,
                },
                navigation: {
                    hasPrev: true,
                    hasNext: true,
                    prevGameDate: today,
                    nextGameDate: today,
                },
                games: homeGames,
                scheduledGamesWindow: homeGames,
            },
        }).as('getHomeBootstrapCustom');

        cy.intercept('GET', '**/api/home/widgets*', {
            statusCode: 200,
            body: buildWidgetsResponse(),
        }).as('getHomeWidgetsCustom');

        cy.intercept('GET', '**/api/matches/range*', {
            statusCode: 200,
            body: {
                content: homeGames.map((game) => ({
                    ...game,
                    gameDate: game.sourceDate,
                })),
                page: 0,
                size: 500,
                totalElements: homeGames.length,
                totalPages: 1,
                hasNext: false,
                hasPrevious: false,
            },
        }).as('getScheduleRange');

        cy.intercept('**/api/matches/day*', {
            statusCode: 200,
            body: {
                date: today,
                games: [
                    {
                        gameId: `${todayCompact}HHLG0`,
                        gameDate: today,
                        time: '18:30',
                        stadium: '대전',
                        gameStatus: 'SCHEDULED',
                        homeTeam: 'HH',
                        awayTeam: 'LG'
                    },
                    {
                        gameId: `${todayCompact}KTSS0`,
                        gameDate: today,
                        time: '18:30',
                        stadium: '수원',
                        gameStatus: 'SCHEDULED',
                        homeTeam: 'SS',
                        awayTeam: 'KT'
                    }
                ],
                prevDate: null,
                nextDate: null,
                hasPrev: false,
                hasNext: false,
            }
        }).as('getScheduleDay');

        // Use a more specific pattern for game details to avoid matching schedule endpoints.
        // The actual URL is /api/matches/${gameId}
        cy.intercept('GET', matchDetailPattern, (req) => {
            const isSecondGame = req.url.includes(`${todayCompact}KTSS0`);
            req.reply({
                statusCode: 200,
                body: {
                    gameId: isSecondGame ? `${todayCompact}KTSS0` : `${todayCompact}HHLG0`,
                    gameDate: today,
                    startTime: '18:30',
                    stadium: isSecondGame ? '수원 KT위즈파크' : '대전 한화생명볼파크',
                    homeTeam: isSecondGame ? 'SS' : 'HH',
                    awayTeam: isSecondGame ? 'KT' : 'LG',
                    gameStatus: 'SCHEDULED',
                    homePitcher: isSecondGame ? '원태인' : '류현진',
                    awayPitcher: isSecondGame ? '소형준' : '임찬규'
                }
            });
        }).as('getGameDetail');

        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: {
                votes: {
                    [`${todayCompact}HHLG0`]: null,
                    [`${todayCompact}KTSS0`]: null,
                },
            },
        }).as('getUserVotes');

        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getUserVote');

        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatus');
    });

    it('moves to prediction with gameId/date query and preselects clicked game', () => {
        cy.viewport(1280, 720); // Desktop view forcing
        visitHomePage({
            path: '/home',
            token: 'home-to-prediction-token',
            resetStorage: true,
        });
        cy.wait('@getHomeBootstrapCustom');
        cy.wait('@getHomeWidgetsCustom');
        cy.get('@getMe.all').should('have.length', 0);



        // 인증 완료 대기 (Navbar에 유저 이름 표시 확인 - 없으면 실패)
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');

        cy.contains('[data-slot="card"]', '한화')
            .should('contain.text', 'LG')
            .click();

        cy.url().should('include', '/prediction');

        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.wait('@getGameDetail').then((interception) => {
            expect(interception.request.url).to.include(`${todayCompact}HHLG0`);
        });
    });

    it('keeps the clicked second game selected after prediction schedule refresh', () => {
        cy.viewport(1280, 720);
        visitHomePage({
            path: '/home',
            token: 'home-to-prediction-token',
            resetStorage: true,
        });
        cy.wait('@getHomeBootstrapCustom');
        cy.wait('@getHomeWidgetsCustom');
        cy.get('@getMe.all').should('have.length', 0);
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');

        cy.contains('[data-slot="card"]', '삼성')
            .should('contain.text', 'KT')
            .click();

        cy.url().should('include', '/prediction');
        cy.location('search').should('include', `date=${today}`);
        cy.location('search').should('include', `gameId=${todayCompact}KTSS0`);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.wait('@getGameDetail').then((interception) => {
            expect(interception.request.url).to.include(`${todayCompact}KTSS0`);
            expect(interception.request.url).not.to.include(`${todayCompact}HHLG0`);
        });
        cy.contains(/KT(\s*위즈)?/).should('be.visible');
        cy.contains(/삼성(\s*라이온즈)?/).should('be.visible');
    });

    it('restores selected home date and scheduled tab after returning from prediction', () => {
        cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
            const requestUrl = new URL(req.url);
            const requestDate = requestUrl.searchParams.get('date') || today;
            const isTomorrow = requestDate === tomorrow;
            const responseGames = isTomorrow ? tomorrowGames : homeGames;

            req.reply({
                statusCode: 200,
                body: {
                    selectedDate: requestDate,
                    leagueStartDates: {
                        regularSeasonStart: `${now.getFullYear()}-03-22`,
                        postseasonStart: `${now.getFullYear()}-10-06`,
                        koreanSeriesStart: `${now.getFullYear()}-10-26`,
                    },
                    navigation: {
                        hasPrev: isTomorrow,
                        hasNext: !isTomorrow,
                        prevGameDate: isTomorrow ? today : null,
                        nextGameDate: isTomorrow ? null : tomorrow,
                    },
                    games: responseGames,
                    scheduledGamesWindow: responseGames,
                },
            });
        }).as('getHomeBootstrapRouteState');

        cy.intercept('**/api/matches/day*', (req) => {
            const requestUrl = new URL(req.url);
            const requestDate = requestUrl.searchParams.get('date') || tomorrow;
            const responseGames = requestDate === tomorrow ? tomorrowGames : homeGames;

            req.reply({
                statusCode: 200,
                body: {
                    date: requestDate,
                    games: responseGames.map((game) => ({
                        gameId: game.gameId,
                        gameDate: requestDate,
                        time: game.time,
                        stadium: game.stadium,
                        gameStatus: 'SCHEDULED',
                        homeTeam: game.homeTeam,
                        awayTeam: game.awayTeam,
                    })),
                    prevDate: null,
                    nextDate: null,
                    hasPrev: false,
                    hasNext: false,
                },
            });
        }).as('getScheduleDayRouteState');

        cy.intercept('GET', matchDetailPattern, (req) => {
            const isTomorrowSecondGame = req.url.includes(`${tomorrowCompact}KTSS0`);
            req.reply({
                statusCode: 200,
                body: {
                    gameId: isTomorrowSecondGame ? `${tomorrowCompact}KTSS0` : `${tomorrowCompact}HHLG0`,
                    gameDate: tomorrow,
                    startTime: '18:30',
                    stadium: isTomorrowSecondGame ? '수원 KT위즈파크' : '대전 한화생명볼파크',
                    homeTeam: isTomorrowSecondGame ? 'SS' : 'HH',
                    awayTeam: isTomorrowSecondGame ? 'KT' : 'LG',
                    gameStatus: 'SCHEDULED',
                    homePitcher: isTomorrowSecondGame ? '원태인' : '류현진',
                    awayPitcher: isTomorrowSecondGame ? '소형준' : '임찬규'
                }
            });
        }).as('getGameDetailRouteState');

        cy.viewport(1280, 720);
        visitHomePage({
            path: '/home?tab=scheduled',
            token: 'home-route-state-token',
            resetStorage: true,
        });
        cy.wait('@getHomeBootstrapRouteState');
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');
        cy.get('[aria-controls="home-tabpanel-scheduled"]').should('have.attr', 'aria-selected', 'true');

        cy.get('[data-testid="home-date-next"]').click();
        cy.location('search').should('include', `date=${tomorrow}`);
        cy.location('search').should('include', 'tab=scheduled');
        cy.wait('@getHomeBootstrapRouteState');

        cy.contains('[data-slot="card"]', '삼성')
            .should('contain.text', 'KT')
            .click();

        cy.location('pathname').should('eq', '/prediction');
        cy.location('search').should('include', `date=${tomorrow}`);
        cy.location('search').should('include', `gameId=${tomorrowCompact}KTSS0`);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getGameDetailRouteState').then((interception) => {
            expect(interception.request.url).to.include(`${tomorrowCompact}KTSS0`);
        });

        cy.go('back');
        cy.location('pathname').should('eq', '/home');
        cy.location('search').should('include', `date=${tomorrow}`);
        cy.location('search').should('include', 'tab=scheduled');
        cy.get('[aria-controls="home-tabpanel-scheduled"]', { timeout: 10000 })
            .should('have.attr', 'aria-selected', 'true');
        cy.contains('[data-slot="card"]', '삼성')
            .should('contain.text', 'KT')
            .should('be.visible');
    });

    it('keeps the clicked schedule page game selected after prediction schedule refresh', () => {
        cy.viewport(1280, 720);
        visitHomePage({
            path: '/schedule',
            token: 'schedule-to-prediction-token',
            resetStorage: true,
        });
        cy.wait('@getScheduleRange');
        cy.get('@getMe.all').should('have.length', 0);
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');

        cy.get('[data-testid="schedule-selected-date-panel"]', { timeout: 10000 })
            .should('have.attr', 'data-date', today)
            .within(() => {
                cy.contains('[data-slot="card"]', '삼성')
                    .should('contain.text', 'KT')
                    .click();
            });

        cy.url().should('include', '/prediction');
        cy.location('search').should('include', `date=${today}`);
        cy.location('search').should('include', `gameId=${todayCompact}KTSS0`);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.wait('@getGameDetail').then((interception) => {
            expect(interception.request.url).to.include(`${todayCompact}KTSS0`);
            expect(interception.request.url).not.to.include(`${todayCompact}HHLG0`);
        });
        cy.contains(/KT(\s*위즈)?/).should('be.visible');
        cy.contains(/삼성(\s*라이온즈)?/).should('be.visible');
    });

    it('does not fall back to the first game detail when requested gameId is missing', () => {
        const missingGameId = `${todayCompact}MISSING0`;

        cy.viewport(1280, 720);
        visitHomePage({
            path: `/prediction?date=${today}&gameId=${missingGameId}`,
            token: 'missing-game-to-prediction-token',
            resetStorage: true,
        });

        cy.wait('@getScheduleDay');
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.contains('현재 목록에서 찾을 수 없습니다', { timeout: 20000 }).should('be.visible');
        cy.contains('경기 목록에서 다시 선택해주세요.').should('be.visible');
        cy.get('@getGameDetail.all').should('have.length', 0);
    });

    it('keeps seeded game data visible while background detail refresh is running', () => {
        cy.intercept('GET', matchDetailPattern, {
            delay: 2500,
            statusCode: 200,
            body: {
                gameId: `${todayCompact}HHLG0`,
                gameDate: today,
                startTime: '18:30',
                stadium: '대전 한화생명볼파크',
                homeTeam: 'HH',
                awayTeam: 'LG',
                gameStatus: 'SCHEDULED',
                homePitcher: '류현진',
                awayPitcher: '임찬규'
            }
        }).as('getDelayedGameDetail');

        cy.viewport(1280, 720);
        visitHomePage({
            path: '/home',
            token: 'home-to-prediction-token',
            resetStorage: true,
        });
        cy.wait('@getHomeBootstrapCustom');
        cy.wait('@getHomeWidgetsCustom');
        cy.get('@getMe.all').should('have.length', 0);

        cy.contains('[data-slot="card"]', '한화')
            .should('contain.text', 'LG')
            .click();

        cy.url().should('include', '/prediction');
        cy.get('[data-testid="prediction-detail-refresh-indicator"]', { timeout: 10000 }).should('be.visible');
        cy.contains(/LG(\s*트윈스)?/).should('be.visible');
        cy.contains(/한화(\s*이글스)?/).should('be.visible');
        cy.wait('@getDelayedGameDetail');
    });
});
