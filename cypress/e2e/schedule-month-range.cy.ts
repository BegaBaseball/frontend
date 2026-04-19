/// <reference types="cypress" />

const fixedNow = new Date('2026-04-15T12:00:00').getTime();

const buildRangeResponse = (startDate: string) => ({
  content: [{
    gameId: `${startDate.replace(/-/g, '')}LTHH`,
    time: '18:30',
    stadium: '대전',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기 예정',
    gameInfo: '롯데 vs 한화',
    leagueType: 'REGULAR',
    homeTeam: 'HH',
    homeTeamFull: '한화 이글스',
    awayTeam: 'LT',
    awayTeamFull: '롯데 자이언츠',
    gameDate: startDate,
    sourceDate: startDate,
  }],
  page: 0,
  size: 500,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
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

const visitScheduleAsGuest = () => {
  cy.visit('/schedule', {
    onBeforeLoad: (win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem('bega_has_visited', 'true');
      win.localStorage.setItem('bega_dont_show_guide', 'true');
    },
  });
};

describe('Schedule month range loading', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
  });

  it('loads the visible month through one matches/range request', () => {
    let dailyScheduleCalls = 0;

    cy.intercept('GET', '**/api/kbo/schedule?*', (req) => {
      dailyScheduleCalls += 1;
      req.reply({ statusCode: 500, body: { message: 'unexpected daily schedule call' } });
    }).as('dailySchedule');

    cy.intercept('GET', '**/api/matches/range*', (req) => {
      const url = new URL(req.url);
      const startDate = url.searchParams.get('startDate') || '2026-04-01';
      req.reply({
        statusCode: 200,
        body: buildRangeResponse(startDate),
      });
    }).as('scheduleRange');

    visitScheduleAsGuest();

    cy.wait('@scheduleRange').then((interception) => {
      const url = new URL(interception.request.url);

      expect(url.searchParams.get('startDate')).to.equal('2026-04-01');
      expect(url.searchParams.get('endDate')).to.equal('2026-04-30');
      expect(url.searchParams.get('size')).to.equal('500');
      expect(url.searchParams.get('withMeta')).to.equal('true');
    });
    cy.contains('KBO 경기 일정').should('be.visible');
    cy.contains('2026.04').should('be.visible');
    cy.wrap(null).then(() => {
      expect(dailyScheduleCalls, 'daily /kbo/schedule calls').to.equal(0);
    });
  });

  it('loads a new month when the calendar month changes', () => {
    cy.intercept('GET', '**/api/matches/range*', (req) => {
      const url = new URL(req.url);
      const startDate = url.searchParams.get('startDate') || '2026-04-01';
      req.reply({
        statusCode: 200,
        body: buildRangeResponse(startDate),
      });
    }).as('scheduleRange');

    visitScheduleAsGuest();

    cy.wait('@scheduleRange');
    cy.get('button[aria-label="다음 달"]').click();

    cy.wait('@scheduleRange').then((interception) => {
      const url = new URL(interception.request.url);

      expect(url.searchParams.get('startDate')).to.equal('2026-05-01');
      expect(url.searchParams.get('endDate')).to.equal('2026-05-31');
    });
    cy.contains('2026.05').should('be.visible');
  });
});
