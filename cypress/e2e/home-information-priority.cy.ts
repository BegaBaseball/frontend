/// <reference types="cypress" />

export {};

const fixedNow = new Date('2026-06-14T12:00:00').getTime();
const today = '2026-06-14';

const homeGames = [
  {
    gameId: '20260614LTHH0',
    time: '18:30',
    stadium: '대전',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기전',
    gameInfo: '',
    leagueType: 'REGULAR',
    homeTeam: 'HH',
    homeTeamFull: '한화 이글스',
    awayTeam: 'LT',
    awayTeamFull: '롯데 자이언츠',
    sourceDate: today,
  },
  {
    gameId: '20260614OBLG0',
    time: '18:30',
    stadium: '잠실',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기전',
    gameInfo: '',
    leagueType: 'REGULAR',
    homeTeam: 'LG',
    homeTeamFull: 'LG 트윈스',
    awayTeam: 'OB',
    awayTeamFull: '두산 베어스',
    sourceDate: today,
  },
];

const buildWidgetsResponse = () => ({
  hotCheerPosts: [],
  featuredMates: [],
  rankingSnapshot: {
    rankingSeasonYear: 2026,
    rankingSourceMessage: '2026 시즌 순위 데이터',
    isOffSeason: false,
    rankings: [],
  },
});

const mockGuestAuth = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    },
  }).as('getMeAnonymous');
  cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 }).as('reissueAnonymous');
};

const visitHome = () => {
  cy.clock(fixedNow, ['Date']);
  cy.clearCookies();
  cy.clearLocalStorage();
  mockGuestAuth();
  cy.intercept('GET', '**/api/home/bootstrap*', {
    statusCode: 200,
    body: {
      selectedDate: today,
      leagueStartDates: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
      navigation: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-06-13',
        nextGameDate: '2026-06-15',
      },
      games: homeGames,
      scheduledGamesWindow: homeGames,
    },
  }).as('getHomeBootstrap');
  cy.intercept('GET', '**/api/home/widgets*', {
    statusCode: 200,
    body: buildWidgetsResponse(),
  }).as('getHomeWidgets');

  cy.visit('/home');
  cy.wait('@getHomeBootstrap');
};

describe('Home information priority', () => {
  it('makes today matches the primary area and demotes prediction to a secondary action', () => {
    cy.viewport(1280, 900);
    visitHome();

    cy.get('[data-testid="home-match-priority-panel"]')
      .should('be.visible')
      .and('have.attr', 'data-priority', 'primary')
      .and('have.attr', 'aria-label', '오늘 경기 중심 영역')
      .within(() => {
        cy.contains('오늘의 매치업').should('be.visible');
        cy.get('[data-testid="home-game-card"]').should('have.length', 2);
      });

    cy.get('[data-testid="home-secondary-prediction-cta"]')
      .should('be.visible')
      .and('have.attr', 'data-priority', 'secondary')
      .and('contain', '전력분석실');
    cy.get('[data-testid="home-primary-prediction-cta"]').should('not.exist');
  });

  it('marks ranking, cheer, and mate as secondary support panels', () => {
    cy.viewport(390, 844);
    visitHome();

    cy.get('[data-testid="home-secondary-panels"]', { timeout: 10000 })
      .should('have.attr', 'data-priority', 'secondary')
      .and('have.attr', 'aria-label', '홈 보조 패널');

    cy.get('[data-testid="home-secondary-panels"] [data-home-panel-priority="secondary"]')
      .should('have.length', 3);
  });
});
