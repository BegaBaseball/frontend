/// <reference types="cypress" />

describe('Home to Prediction deep link', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayCompact = today.replace(/-/g, '');
    const fakeToken = 'home-to-prediction-token';
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

    const seedAuthState = (win: Window) => {
        win.localStorage.setItem('auth-storage', JSON.stringify({
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
        }));
        win.localStorage.setItem('accessToken', fakeToken);
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    beforeEach(() => {
        (cy as any).login('user');
        (cy as any).mockAPI();

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
                rankingSeasonYear: now.getFullYear(),
                rankingSourceMessage: `${now.getFullYear()} 시즌 순위 데이터`,
                isOffSeason: false,
                rankings: [],
            },
        }).as('getHomeBootstrapCustom');

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

        // Use a more specific pattern for game details to avoid matching /matches/range
        // The actual URL is /api/matches/${gameId}
        cy.intercept('GET', /\/api\/matches\/(?!day$|range$|bounds$)[^/?#]+(?:\?.*)?$/, {
            statusCode: 200,
            body: {
                gameId: `${todayCompact}HHLG0`,
                gameDate: today,
                startTime: '18:30',
                stadium: '대전 한화생명 이글스파크',
                homeTeam: 'HH',
                awayTeam: 'LG',
                gameStatus: 'SCHEDULED',
                homePitcher: '류현진',
                awayPitcher: '임찬규'
            }
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
        cy.visit('/home', {
            onBeforeLoad: (win) => {
                seedAuthState(win);
            },
        });
        cy.window().then((win) => {
            seedAuthState(win);
        });
        cy.setCookie('Authorization', fakeToken);
        // Wait for the auth check to occur
        cy.wait('@getMe');
        cy.wait('@getHomeBootstrapCustom');



        // 인증 완료 대기 (Navbar에 유저 이름 표시 확인 - 없으면 실패)
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');

        cy.contains('[data-slot="card"]', '한화')
            .should('contain.text', 'LG')
            .click();

        cy.url().should('include', '/prediction');

        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.get('@getUserVote.all').should('have.length', 0);
        cy.contains('로그인 필요').should('not.exist');
        cy.contains(/LG(\s*트윈스)?/).should('be.visible');
        cy.contains(/한화(\s*이글스)?/).should('be.visible');
    });

    it('keeps seeded game data visible while background detail refresh is running', () => {
        cy.intercept('GET', /\/api\/matches\/(?!day$|range$|bounds$)[^/?#]+(?:\?.*)?$/, {
            delay: 2500,
            statusCode: 200,
            body: {
                gameId: `${todayCompact}HHLG0`,
                gameDate: today,
                startTime: '18:30',
                stadium: '대전 한화생명 이글스파크',
                homeTeam: 'HH',
                awayTeam: 'LG',
                gameStatus: 'SCHEDULED',
                homePitcher: '류현진',
                awayPitcher: '임찬규'
            }
        }).as('getDelayedGameDetail');

        cy.viewport(1280, 720);
        cy.visit('/home', {
            onBeforeLoad: (win) => {
                seedAuthState(win);
            },
        });
        cy.window().then((win) => {
            seedAuthState(win);
        });
        cy.setCookie('Authorization', fakeToken);
        cy.wait('@getMe');
        cy.wait('@getHomeBootstrapCustom');

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
