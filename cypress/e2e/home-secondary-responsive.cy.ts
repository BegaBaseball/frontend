/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const selectedDate = '2026-04-19';

const featuredMate = {
  id: 501,
  hostId: 1501,
  hostName: '홈 메이트',
  hostBadge: 'VERIFIED',
  hostAverageRating: 4.8,
  hostReviewCount: 12,
  hostProfileImageUrl: null,
  hostFavoriteTeam: 'SS',
  teamId: 'SS',
  gameDate: selectedDate,
  gameTime: '18:30',
  stadium: '대구삼성라이온즈파크',
  homeTeam: 'SS',
  awayTeam: 'LG',
  section: '블루존',
  maxParticipants: 4,
  currentParticipants: 2,
  description: '홈 대시보드 반응형 검증용 메이트',
  ticketVerified: true,
  status: 'PENDING',
  ticketPrice: 26000,
  createdAt: '2026-04-19T09:00:00',
};

const rankings = [
  { rank: 1, teamId: 'SS', teamName: '삼성', wins: 12, draws: 1, losses: 6, games: 19, gamesBehind: 0, winRate: '0.667' },
  { rank: 2, teamId: 'LG', teamName: 'LG', wins: 11, draws: 1, losses: 7, games: 19, gamesBehind: 1, winRate: '0.611' },
  { rank: 3, teamId: 'KT', teamName: 'KT', wins: 10, draws: 2, losses: 7, games: 19, gamesBehind: 1.5, winRate: '0.588' },
  { rank: 4, teamId: 'HH', teamName: '한화', wins: 10, draws: 0, losses: 8, games: 18, gamesBehind: 2, winRate: '0.556' },
];

const installHomeDashboardIntercepts = () => {
  cy.intercept('GET', '**/api/home/bootstrap*', {
    statusCode: 200,
    body: {
      selectedDate,
      leagueStartDates: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
      navigation: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-04-18',
        nextGameDate: '2026-04-20',
      },
      games: [
        {
          gameId: 'home-secondary-responsive-game',
          time: '18:30',
          stadium: '대구삼성라이온즈파크',
          gameStatus: 'SCHEDULED',
          gameStatusKr: '경기 예정',
          gameInfo: '홈 대시보드 반응형 검증 경기',
          leagueType: 'REGULAR',
          homeTeam: 'SS',
          homeTeamFull: '삼성 라이온즈',
          awayTeam: 'LG',
          awayTeamFull: 'LG 트윈스',
          gameDate: selectedDate,
          sourceDate: selectedDate,
        },
      ],
      scheduledGamesWindow: [],
    },
  }).as('getResponsiveHomeBootstrap');

  cy.intercept('GET', '**/api/home/widgets*', {
    statusCode: 200,
    body: {
      hotCheerPosts: [
        {
          id: 701,
          teamId: 'SS',
          content: '오늘 블루존 응원 동선 공유합니다.',
          author: '응원장',
          authorHandle: '@cheer',
          createdAt: '2026-04-19T08:30:00',
          comments: 4,
          likes: 43,
          bookmarkCount: 2,
          views: 220,
          isHot: true,
          imageUrls: [],
        },
      ],
      featuredMates: [featuredMate],
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '테스트 fixture 시즌 순위',
        isOffSeason: false,
        rankings,
      },
    },
  }).as('getResponsiveHomeWidgets');
};

const visitResponsiveHome = () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.mockAPI();
  installHomeDashboardIntercepts();
  visitHomePage({
    path: '/home',
    authenticated: false,
    resetStorage: true,
  });
  cy.wait('@getResponsiveHomeBootstrap');
  cy.wait('@getResponsiveHomeWidgets');
  // gameInfo renders only in GameCard's desktop sub-layout (hidden lg:grid),
  // so at mobile widths it is present in the DOM but display:none. Assert
  // existence (page bootstrapped) rather than visibility to stay viewport-agnostic.
  cy.contains('홈 대시보드 반응형 검증 경기', { timeout: 10000 }).should('exist');
  cy.contains('실시간 인기 응원글', { timeout: 10000 }).should('exist');
  cy.get('[data-testid="home-secondary-panels"]', { timeout: 10000 }).within(() => {
    cy.contains('오늘 블루존 응원 동선 공유합니다.').should('exist');
    cy.contains('2/4명').should('exist');
    cy.contains('0.667').should('exist');
  });
};

describe('Home secondary panels responsive layout', () => {
  it('puts rankings first and keeps cheer/mate panels in a mobile snap pager', () => {
    cy.viewport(375, 900);
    visitResponsiveHome();

    cy.get('[data-testid="home-secondary-panels"]').scrollIntoView();
    cy.get('[data-testid="home-secondary-panels"] .snap-x').should(($pager) => {
      const pager = $pager[0];
      expect(pager.scrollWidth).to.be.greaterThan(pager.clientWidth + 80);
    });
    cy.get('[data-testid="home-secondary-panels"] .snap-x section').should(($sections) => {
      expect($sections.length).to.eq(2);
      const rects = [...$sections].map((section) => section.getBoundingClientRect());
      expect(Math.abs(rects[1].top - rects[0].top)).to.be.lessThan(4);
      expect(rects[1].left).to.be.greaterThan(rects[0].left);
    });
    cy.get('[data-testid="home-secondary-panels"] section').should(($sections) => {
      expect($sections.length).to.eq(3);
      const rects = [...$sections].map((section) => section.getBoundingClientRect());
      expect(rects[0].top).to.be.lessThan(rects[1].top - 16);
      expect(Math.abs(rects[2].top - rects[1].top)).to.be.lessThan(4);
      expect(rects[0].width).to.be.greaterThan(rects[1].width);
    });
    cy.contains(/최근\s*5경기|스파크라인|W\/L/).should('not.exist');
  });

  it('keeps three rich dashboard panels in one desktop row and shows season record bars', () => {
    cy.viewport(1280, 900);
    visitResponsiveHome();

    cy.get('[data-testid="home-secondary-panels"]').scrollIntoView();
    cy.get('[data-testid="home-secondary-panels"] section').should(($sections) => {
      expect($sections.length).to.eq(3);
      const rects = [...$sections].map((section) => section.getBoundingClientRect());
      const firstTop = rects[0].top;
      rects.forEach((rect) => {
        expect(Math.abs(rect.top - firstTop)).to.be.lessThan(4);
      });
    });
    cy.get('[role="img"][aria-label*="시즌 전적 막대"]').should(($bars) => {
      expect($bars.length).to.be.greaterThan(0);
    });
    cy.contains('12승 · 1무 · 6패').should('be.visible');
    cy.contains(/최근\s*5경기|스파크라인|W\/L/).should('not.exist');
  });
});
