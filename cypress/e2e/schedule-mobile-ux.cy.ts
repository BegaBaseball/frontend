/// <reference types="cypress" />

export {};

const fixedNow = new Date('2026-04-15T12:00:00').getTime();

const buildGame = (date: string, gameId: string, awayTeam = 'LG', homeTeam = 'KT') => ({
  gameId,
  time: '18:30',
  stadium: '잠실',
  gameStatus: 'SCHEDULED',
  gameStatusKr: '경기 예정',
  gameInfo: `${awayTeam} vs ${homeTeam}`,
  leagueType: 'REGULAR',
  homeTeam,
  homeTeamFull: homeTeam === 'KT' ? 'KT 위즈' : '두산 베어스',
  awayTeam,
  awayTeamFull: awayTeam === 'LG' ? 'LG 트윈스' : '삼성 라이온즈',
  gameDate: date,
  sourceDate: date,
});

const buildRangeResponse = (games: Array<ReturnType<typeof buildGame>>) => ({
  content: games,
  page: 0,
  size: 500,
  totalElements: games.length,
  totalPages: games.length > 0 ? 1 : 0,
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

const assertNoHorizontalOverflow = () => {
  cy.document().then((doc) => {
    const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
    const viewportWidth = doc.documentElement.clientWidth;

    expect(documentWidth, 'document width').to.be.at.most(viewportWidth + 1);
  });
};

const assertMinTarget = (selector: string, label: string, minSize = 44) => {
  cy.get(selector)
    .first()
    .scrollIntoView()
    .should('be.visible')
    .then(($element) => {
      const rect = $element[0].getBoundingClientRect();

      expect(rect.width, `${label} width`).to.be.at.least(minSize);
      expect(rect.height, `${label} height`).to.be.at.least(minSize);
    });
};

describe('Schedule mobile UX', () => {
  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
  });

  it('shows a mobile date rail and updates the selected date panel', () => {
    cy.viewport(390, 844);
    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: buildRangeResponse([
        buildGame('2026-04-15', '20260415LGKT'),
        buildGame('2026-04-18', '20260418SSOB', 'SS', 'OB'),
      ]),
    }).as('scheduleRange');

    visitScheduleAsGuest();
    cy.wait('@scheduleRange');

    cy.get('[data-testid="schedule-mobile-date-rail"]').should('be.visible');
    cy.get('[data-testid="schedule-desktop-month-grid"]').should('not.be.visible');
    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-04-15')
      .and('contain', '2026-04-15 경기')
      .and('contain', 'LG')
      .and('contain', 'KT');

    cy.get('[data-testid="schedule-mobile-date-button"][data-date="2026-04-18"]')
      .scrollIntoView()
      .click();
    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-04-18')
      .and('contain', '삼성')
      .and('contain', '두산');

    assertMinTarget('[data-testid="schedule-month-prev"]', 'previous month button');
    assertMinTarget('[data-testid="schedule-month-next"]', 'next month button');
    assertMinTarget('[data-testid="schedule-mobile-date-button"][data-date="2026-04-18"]', 'date rail button');
    assertNoHorizontalOverflow();
  });

  it('loads one range per month and resets selection on month change', () => {
    cy.viewport(430, 932);
    const requestedStarts: string[] = [];

    cy.intercept('GET', '**/api/matches/range*', (req) => {
      const url = new URL(req.url);
      const startDate = url.searchParams.get('startDate') || '';
      requestedStarts.push(startDate);

      req.reply({
        statusCode: 200,
        body: buildRangeResponse(
          startDate === '2026-05-01'
            ? [buildGame('2026-05-03', '20260503LGKT')]
            : [buildGame('2026-04-15', '20260415LGKT')],
        ),
      });
    }).as('scheduleRange');

    visitScheduleAsGuest();
    cy.wait('@scheduleRange');

    cy.get('[data-testid="schedule-month-next"]').click();
    cy.wait('@scheduleRange').then((interception) => {
      const url = new URL(interception.request.url);

      expect(url.searchParams.get('startDate')).to.equal('2026-05-01');
      expect(url.searchParams.get('endDate')).to.equal('2026-05-31');
    });
    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-05-03')
      .and('contain', '2026-05-03 경기');

    cy.wrap(null).then(() => {
      expect(requestedStarts).to.deep.equal(['2026-04-01', '2026-05-01']);
    });
  });

  it('separates empty selected date and empty month states', () => {
    cy.viewport(390, 844);
    cy.intercept('GET', '**/api/matches/range*', (req) => {
      const url = new URL(req.url);
      const startDate = url.searchParams.get('startDate') || '';

      req.reply({
        statusCode: 200,
        body: buildRangeResponse(
          startDate === '2026-04-01'
            ? [buildGame('2026-04-20', '20260420LGKT')]
            : [],
        ),
      });
    }).as('scheduleRange');

    visitScheduleAsGuest();
    cy.wait('@scheduleRange');

    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-04-15')
      .and('contain', '선택한 날짜에는 경기가 없습니다.');

    cy.get('[data-testid="schedule-month-next"]').click();
    cy.wait('@scheduleRange');
    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-05-01')
      .and('contain', '이번 달에 등록된 경기가 없습니다.');
  });

  it('keeps the desktop month grid on wide screens', () => {
    cy.viewport(1440, 1000);
    cy.intercept('GET', '**/api/matches/range*', {
      statusCode: 200,
      body: buildRangeResponse([buildGame('2026-04-15', '20260415LGKT')]),
    }).as('scheduleRange');

    visitScheduleAsGuest();
    cy.wait('@scheduleRange');

    cy.get('[data-testid="schedule-desktop-month-grid"]').should('be.visible');
    cy.get('[data-testid="schedule-mobile-date-rail"]').should('not.be.visible');
    cy.get('[data-testid="schedule-selected-date-panel"]')
      .should('have.attr', 'data-date', '2026-04-15')
      .and('contain', '2026-04-15 경기');
  });
});
