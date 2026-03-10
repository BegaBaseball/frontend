/// <reference types="cypress" />

describe('Leaderboard page', () => {
  const leaderboardResponse = {
    content: [
      {
        rank: 1,
        userName: '한화스타',
        handle: 'testuser',
        profileImageUrl: null,
        level: 8,
        score: 12500,
        streak: 12,
        rankTitle: 'MAJOR_LEAGUER',
        rankChange: 3,
      },
      {
        rank: 2,
        userName: '부산불',
        handle: 'busanbull',
        profileImageUrl: null,
        level: 7,
        score: 11230,
        streak: 4,
        rankTitle: 'MINOR_LEAGUER',
        rankChange: -1,
      },
      {
        rank: 3,
        userName: '서울불매',
        handle: 'seoul',
        profileImageUrl: null,
        level: 5,
        score: 10880,
        streak: 2,
        rankTitle: 'ROOKIE',
      },
    ],
    totalPages: 2,
    totalElements: 3,
  };

  const myRankResponse = {
    handle: 'testuser',
    userName: 'TestUser',
    rank: 1,
    totalScore: 12500,
    seasonScore: 12500,
    monthlyScore: 6400,
    weeklyScore: 1800,
    level: 8,
    rankTitle: 'MAJOR_LEAGUER',
    currentStreak: 12,
    maxStreak: 18,
    experiencePoints: 640,
    nextLevelExp: 900,
    accuracy: 88.8,
    totalPredictions: 1400,
    correctPredictions: 1242,
  };

  const hotStreakResponse = [
    {
      handle: 'fireone',
      userName: '파이어원',
      streak: 7,
      level: 10,
    },
    {
      handle: 'lightning',
      userName: '라이트닝',
      streak: 5,
      level: 9,
    },
  ];

  const recentScoreResponse = [
    {
      id: 1,
      handle: 'commentator',
      userName: '해설자',
      eventType: 'UPSET_BONUS',
      score: 150,
      streak: 2,
      timestamp: '2026-02-07T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    (cy as any).mockAPI();

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
      statusCode: 200,
      body: leaderboardResponse,
    }).as('getLeaderboard');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/hot-streaks' }, {
      statusCode: 200,
      body: hotStreakResponse,
    }).as('getHotStreaks');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/recent-scores' }, {
      statusCode: 200,
      body: recentScoreResponse,
    }).as('getRecentScores');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups' }, {
      statusCode: 200,
      body: {
        MAGIC_BAT: 3,
        GOLDEN_GLOVE: 1,
        SCOUTER: 2,
      },
    }).as('getPowerups');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/powerups/active' }, {
      statusCode: 200,
      body: [
        {
          type: 'SCOUTER',
          gameId: '20260207HHLG0',
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      ],
    }).as('getActivePowerups');
  });

  it('renders leaderboard list, user stats card, ticker and powerups for logged-in users', () => {
    (cy as any).login('user');

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 200,
      body: myRankResponse,
    }).as('getMyRank');

    cy.visit('/leaderboard');

    cy.wait('@getLeaderboard');
    cy.wait('@getMyRank');
    cy.wait('@getHotStreaks');
    cy.wait('@getRecentScores');
    cy.wait('@getPowerups');
    cy.wait('@getActivePowerups');

    cy.contains('야구경기 예측 결과').should('be.visible');
    cy.contains('적중률').should('be.visible');
    cy.contains('88.8%').should('be.visible');
    cy.contains('12연승').should('be.visible');
    cy.contains(/1,?400회/).should('be.visible');
    cy.contains(/1,?242회/).should('be.visible');
    cy.contains('한화스타').should('be.visible');
    cy.contains('부산불').should('be.visible');
    cy.contains('POWER-UPS').should('be.visible');
    cy.contains('매직 배트').should('be.visible');
    cy.contains('x3').should('be.visible');
    cy.contains('연승 중인 플레이어').should('be.visible');
    cy.contains('파이어원').should('be.visible');
  });

  it('does not request my-rank endpoint when user is not logged in', () => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept({ method: 'GET', pathname: '/api/leaderboard/me' }, {
      statusCode: 401,
      body: { message: 'UNAUTHORIZED' },
    }).as('getMyRank');

    cy.intercept({ method: 'GET', pathname: '/auth/mypage' }, {
      statusCode: 401,
      body: { message: 'UNAUTHORIZED' },
    }).as('getMe');

    cy.visit('/leaderboard');

    cy.wait('@getLeaderboard');
    cy.wait('@getHotStreaks');
    cy.wait('@getRecentScores');
    cy.wait('@getPowerups');
    cy.wait('@getActivePowerups');
    cy.get('@getMe.all').should('have.length.gte', 1);
    cy.get('@getMyRank.all').should('have.length', 0);
    cy.contains('야구경기 예측 결과').should('be.visible');
  });
});
