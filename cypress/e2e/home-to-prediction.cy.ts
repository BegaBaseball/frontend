/// <reference types="cypress" />

describe('Home to Prediction deep link', () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayCompact = today.replace(/-/g, '');

    beforeEach(() => {
        (cy as any).login('user');
        (cy as any).mockAPI();

        cy.intercept('**/api/kbo/schedule?*', {
            statusCode: 200,
            body: [
                {
                    gameId: `${todayCompact}HHLG0`,
                    time: '18:30',
                    stadium: '대전',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기전',
                    leagueType: 'REGULAR',
                    homeTeam: 'HH',
                    homeTeamFull: '한화 이글스',
                    awayTeam: 'LG',
                    awayTeamFull: 'LG 트윈스',
                    sourceDate: today
                },
                {
                    gameId: `${todayCompact}KTSS0`,
                    time: '18:30',
                    stadium: '수원',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기전',
                    leagueType: 'REGULAR',
                    homeTeam: 'SS',
                    homeTeamFull: '삼성 라이온즈',
                    awayTeam: 'KT',
                    awayTeamFull: 'KT 위즈',
                    sourceDate: today
                }
            ]
        }).as('getHomeScheduleCustom');

        cy.intercept('**/api/matches/range*', {
            statusCode: 200,
            body: [
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
            ]
        }).as('getScheduleRange');

        // Use a more specific pattern for game details to avoid matching /matches/range
        // The actual URL is /api/matches/${gameId}
        cy.intercept('GET', '**/api/matches/[0-9]*', {
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

        cy.intercept('POST', '**/api/predictions/my-votes', {
            statusCode: 200,
            body: {
                votes: {
                    [`${todayCompact}HHLG0`]: null,
                    [`${todayCompact}KTSS0`]: null,
                },
            },
        }).as('getUserVotes');

        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0 },
        }).as('getVoteStatus');
    });

    it('moves to prediction with gameId/date query and preselects clicked game', () => {
        cy.viewport(1280, 720); // Desktop view forcing
        cy.visit('/home');
        // Wait for the auth check to occur
        cy.wait('@getMe');
        cy.wait('@getHomeScheduleCustom');



        // 인증 완료 대기 (Navbar에 유저 이름 표시 확인 - 없으면 실패)
        cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');

        cy.contains('[data-slot="card"]', '한화')
            .should('contain.text', 'LG')
            .click();

        cy.wait('@getScheduleRange');

        cy.url().should('include', '/prediction?');
        cy.url().should('include', `gameId=${todayCompact}HHLG0`);
        cy.url().should('include', `date=${today}`);

        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.contains('button[aria-pressed="true"]', 'LG vs 한화').should('be.visible');
    });
});
