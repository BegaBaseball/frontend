/// <reference types="cypress" />

describe('Home scheduled tab', () => {
  const scheduleByDate: Record<string, Array<Record<string, unknown>>> = {
    '2026-02-10': [],
    '2026-02-11': [
      {
        gameId: '20260211LGHH0',
        time: '18:30',
        stadium: '잠실구장',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
        gameInfo: '',
        leagueType: 'PRE',
        homeTeam: 'HH',
        homeTeamFull: '한화 이글스',
        awayTeam: 'LG',
        awayTeamFull: 'LG 트윈스',
        homeScore: null,
        awayScore: null,
      },
      {
        gameId: '20260211KTNC0',
        time: '19:00',
        stadium: '수원구장',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
        gameInfo: '',
        leagueType: 'OFFSEASON',
        homeTeam: 'KT',
        homeTeamFull: 'KT 위즈',
        awayTeam: 'NC',
        awayTeamFull: 'NC 다이노스',
        homeScore: null,
        awayScore: null,
      },
    ],
    '2026-02-12': [
      {
        gameId: '20260212KTSS0',
        time: '18:30',
        stadium: '수원구장',
        gameStatus: 'POSTPONED',
        gameStatusKr: '경기 연기',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'KT',
        homeTeamFull: 'KT 위즈',
        awayTeam: 'SS',
        awayTeamFull: '삼성 라이온즈',
        homeScore: null,
        awayScore: null,
      },
    ],
    '2026-02-13': [
      {
        gameId: '20260213LTSK0',
        time: '18:30',
        stadium: '사직구장',
        gameStatus: 'CANCELLED',
        gameStatusKr: '경기 취소',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'LT',
        homeTeamFull: '롯데 자이언츠',
        awayTeam: 'SK',
        awayTeamFull: 'SSG 랜더스',
        homeScore: null,
        awayScore: null,
      },
      {
        gameId: '20260213WOKW0',
        time: '18:30',
        stadium: '고척구장',
        gameStatus: 'COMPLETED',
        gameStatusKr: '경기 종료',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'WO',
        homeTeamFull: '키움 히어로즈',
        awayTeam: 'OB',
        awayTeamFull: '두산 베어스',
        homeScore: 2,
        awayScore: 1,
      },
    ],
    '2026-02-14': [
      {
        gameId: '20260214KIASS0',
        time: '18:30',
        stadium: '광주구장',
        gameStatus: null,
        gameStatusKr: '정보 없음',
        gameInfo: '',
        leagueType: 'REGULAR',
        homeTeam: 'KIA',
        homeTeamFull: 'KIA 타이거즈',
        awayTeam: 'SS',
        awayTeamFull: '삼성 라이온즈',
        homeScore: null,
        awayScore: null,
      },
    ],
  };

  beforeEach(() => {
    const now = new Date('2026-02-10T12:00:00').getTime();
    cy.clock(now, ['Date']);

    (cy as any).login('user');
    (cy as any).mockAPI();

    cy.intercept('GET', '**/api/kbo/schedule/navigation?*', {
      statusCode: 200,
      body: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-02-09',
        nextGameDate: '2026-02-11',
      },
    }).as('getHomeNavigation');

    cy.intercept('GET', '**/api/kbo/schedule?*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '');
      req.reply({
        statusCode: 200,
        body: scheduleByDate[date] || [],
      });
    }).as('getHomeScheduleByDate');

    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: [
        {
          gameId: '20260211LGHH0',
          gameDate: '2026-02-11',
          homeTeam: 'HH',
          awayTeam: 'LG',
          stadium: '잠실',
          homeScore: null,
          awayScore: null,
          winner: null,
        },
      ],
    }).as('getPredictionRange');

    cy.intercept('GET', '**/api/matches/bounds*', {
      statusCode: 200,
      body: {
        hasData: true,
        earliestGameDate: '2026-02-01',
        latestGameDate: '2026-10-01',
      },
    }).as('getPredictionBounds');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      const pathname = new URL(req.url).pathname;
      const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);

      if (lastSegment === 'range' || lastSegment === 'bounds') {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          gameId: '20260211LGHH0',
          gameDate: '2026-02-11',
          homeTeam: 'HH',
          awayTeam: 'LG',
          stadium: '잠실',
          homeScore: null,
          awayScore: null,
          gameStatus: 'SCHEDULED',
          startTime: '18:30',
        },
      });
    }).as('getPredictionDetail');

    cy.intercept('POST', '**/api/predictions/my-votes', {
      statusCode: 200,
      body: {
        votes: {
          '20260211LGHH0': null,
        },
      },
    }).as('getPredictionVotes');

    cy.intercept('GET', '**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
    }).as('getPredictionVoteStatus');
  });

  it('auto switches to 예정경기 and separates scheduled vs postponed/cancelled games', () => {
    cy.visit('/home');

    cy.contains('button', '예정경기', { timeout: 15000 })
      .should('be.visible')
      .and('have.attr', 'data-state', 'active');

    cy.contains('곧 열리는 경기').should('be.visible');
    cy.contains('연기/취소').should('be.visible');

    cy.contains('[data-slot="card"]', 'LG').should('contain.text', '프리시즌');
    cy.contains('[data-slot="card"]', 'NC').should('contain.text', '기타 일정');
    cy.contains('[data-slot="card"]', 'KIA').should('contain.text', '경기 예정');

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .should('have.attr', 'aria-expanded', 'false')
      .should('contain.text', '펼치기');

    cy.contains('[data-slot="card"]', '경기 연기').should('not.exist');
    cy.contains('[data-slot="card"]', '경기 취소').should('not.exist');
    cy.contains('연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.').should('be.visible');

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .click({ force: true })
      .should('have.attr', 'aria-expanded', 'true');

    cy.contains('[data-slot="card"]', '경기 연기').should('be.visible');
    cy.contains('[data-slot="card"]', '경기 취소').should('be.visible');

    cy.contains('기타 상태 경기 1건은 예정경기 탭에서 제외되었습니다.').should('be.visible');
  });

  it('resets secondary section to collapsed after date change', () => {
    cy.visit('/home');

    cy.get('[data-testid="home-scheduled-secondary-toggle"]')
      .should('have.attr', 'aria-expanded', 'false')
      .click({ force: true })
      .should('have.attr', 'aria-expanded', 'true');

    cy.get('[data-testid="home-date-next"]').click({ force: true });

    cy.get('[data-testid="home-scheduled-secondary-toggle"]', { timeout: 15000 })
      .should('have.attr', 'aria-expanded', 'false')
      .should('contain.text', '펼치기');

    cy.contains('연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.').should('be.visible');
  });

  it('navigates to prediction using scheduled card CTA', () => {
    cy.visit('/home');

    cy.get('[data-slot="alert-dialog-overlay"]').should('not.exist');

    cy.contains('[data-slot="card"]', 'LG')
      .should('be.visible')
      .within(() => {
        cy.contains('승부예측 하러가기').click();
      });

    cy.location('pathname').should('eq', '/prediction');
    cy.get('[data-slot="alert-dialog-overlay"]').should('not.exist');

    cy.contains('전력분석실', { timeout: 15000 }).should('exist');
  });
});
