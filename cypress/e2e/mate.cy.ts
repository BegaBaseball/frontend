/// <reference types="cypress" />

describe('Mate Page Accuracy', () => {
  const baseParty = {
    hostProfileImageUrl: 'https://cdn.example.com/profile.png',
    hostFavoriteTeam: 'KT',
    hostBadge: 'NEW',
    hostRating: 4.5,
    ticketVerified: false,
    createdAt: '2026-02-01T00:00:00',
  };

  const pendingPartyPage0 = {
    id: 201,
    hostId: 501,
    hostName: '테스트 호스트',
    status: 'PENDING',
    gameDate: '2026-02-20',
    gameTime: '18:30',
    stadium: '잠실야구장',
    teamId: 'LG',
    homeTeam: 'LG',
    awayTeam: 'KT',
    section: '1루석',
    maxParticipants: 4,
    currentParticipants: 1,
    description: '기본 모집 파티',
    ...baseParty,
  };

  const pendingPartyPage1 = {
    id: 202,
    hostId: 502,
    hostName: '둘째 호스트',
    status: 'PENDING',
    gameDate: '2026-02-21',
    gameTime: '16:00',
    stadium: '서울종합운동장',
    teamId: 'SS',
    homeTeam: 'SS',
    awayTeam: 'NC',
    section: '내야석',
    maxParticipants: 4,
    currentParticipants: 1,
    description: '페이지 2의 파티',
    ...baseParty,
  };

  const matchedParty = {
    id: 301,
    hostId: 503,
    hostName: '매칭 호스트',
    status: 'MATCHED',
    gameDate: '2026-02-22',
    gameTime: '14:30',
    stadium: '대구 삼성 라이온즈파크',
    teamId: 'KT',
    homeTeam: 'KT',
    awayTeam: 'LG',
    section: '블루존',
    maxParticipants: 2,
    currentParticipants: 2,
    description: '매칭 완료 파티',
    ...baseParty,
  };

  const sellingParty = {
    id: 302,
    hostId: 504,
    hostName: '판매 호스트',
    status: 'SELLING',
    gameDate: '2026-02-23',
    gameTime: '19:00',
    stadium: '고척 스카이돔',
    teamId: 'HH',
    homeTeam: 'HH',
    awayTeam: 'HT',
    section: '테이블',
    maxParticipants: 2,
    currentParticipants: 1,
    price: 110000,
    ticketPrice: 100000,
    description: '판매 중인 파티',
    ...baseParty,
  };

  const searchParty = {
    id: 303,
    hostId: 505,
    hostName: '검색 호스트',
    status: 'PENDING',
    gameDate: '2026-02-24',
    gameTime: '20:00',
    stadium: '대전 한화생명 이글스파크',
    teamId: 'HH',
    homeTeam: 'HH',
    awayTeam: 'SS',
    section: '응원석',
    maxParticipants: 5,
    currentParticipants: 1,
    description: '검색용 파티',
    ...baseParty,
  };

  const dateFilteredParty = {
    id: 304,
    hostId: 506,
    hostName: '날짜 호스트',
    status: 'PENDING',
    gameDate: '2026-02-25',
    gameTime: '17:00',
    stadium: '수원 켈틱 파크',
    teamId: 'KT',
    homeTeam: 'KT',
    awayTeam: 'SS',
    section: '내야석',
    maxParticipants: 4,
    currentParticipants: 1,
    description: '날짜 필터 파티',
    ...baseParty,
  };

  const detailParty = {
    id: 777,
    hostId: 123,
    hostName: '상세호스트',
    status: 'PENDING',
    gameDate: '2026-02-27',
    gameTime: '19:00',
    stadium: '문학 카펜트리',
    teamId: 'LT',
    homeTeam: 'KT',
    awayTeam: 'LG',
    section: '1루석',
    maxParticipants: 4,
    currentParticipants: 1,
    ticketPrice: 50000,
    description: '딥링크 검증용 파티',
    ...baseParty,
  };

  const defaultPartiesPayload = {
    content: [pendingPartyPage0],
    totalElements: 1,
    totalPages: 2,
    number: 0,
    size: 9,
  };

  const mockState = {
    matchedContent: [matchedParty],
    sellingContent: [sellingParty],
    searchContent: [searchParty],
    dateContent: [dateFilteredParty],
  };

  const setupPartiesListMock = (overrides: {
    matchedContent?: typeof mockState.matchedContent;
    sellingContent?: typeof mockState.sellingContent;
    searchContent?: typeof mockState.searchContent;
    dateContent?: typeof mockState.dateContent;
  } = {}) => {
    mockState.matchedContent = overrides.matchedContent ?? [matchedParty];
    mockState.sellingContent = overrides.sellingContent ?? [sellingParty];
    mockState.searchContent = overrides.searchContent ?? [searchParty];
    mockState.dateContent = overrides.dateContent ?? [dateFilteredParty];
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/parties*', (req) => {
      const requestUrl = new URL(req.url);
      const pathname = requestUrl.pathname;
      if (!pathname.endsWith('/parties') && !pathname.endsWith('/parties/')) return;

      req.alias = 'getParties';
      const status = requestUrl.searchParams.get('status')?.toUpperCase();
      const searchQuery = requestUrl.searchParams.get('searchQuery');
      const selectedDate = requestUrl.searchParams.get('date');
      const page = requestUrl.searchParams.get('page') || '0';

      if (status === 'MATCHED') {
        req.alias = 'getPartiesMatched';
        req.reply({
          content: mockState.matchedContent,
          totalElements: mockState.matchedContent.length,
          totalPages: 1,
          number: Number(page),
          size: 9,
        });
        return;
      }

      if (status === 'SELLING') {
        req.alias = 'getPartiesSelling';
        req.reply({
          content: mockState.sellingContent,
          totalElements: mockState.sellingContent.length,
          totalPages: 1,
          number: Number(page),
          size: 9,
        });
        return;
      }

      if (searchQuery) {
        req.alias = 'getPartiesSearch';
        req.reply({
          content: mockState.searchContent,
          totalElements: mockState.searchContent.length,
          totalPages: 1,
          number: Number(page),
          size: 9,
        });
        return;
      }

      if (selectedDate) {
        req.alias = 'getPartiesDate';
        req.reply({
          content: mockState.dateContent,
          totalElements: mockState.dateContent.length,
          totalPages: 1,
          number: Number(page),
          size: 9,
        });
        return;
      }

        req.alias = `getPartiesPage${page}`;
        if (page === '1') {
        req.reply({
          content: [pendingPartyPage1],
          totalElements: 2,
          totalPages: 2,
          number: 1,
          size: 9,
        });
      } else {
        req.reply(defaultPartiesPayload);
      }
    });

    cy.login('user');
    cy.mockAPI();
    setupPartiesListMock();
  });

  it('uses backend status filtering so matched tab shows results even outside the current page', () => {
    cy.visit('/mate');
    cy.wait('@getPartiesPage0');
    cy.contains('잠실야구장').should('be.visible');

    cy.contains('button', '매칭 완료').click();
    cy.wait('@getPartiesMatched').then((interception) => {
      expect(interception.request.url).to.include('status=MATCHED');
    });

    cy.contains('대구 삼성 라이온즈파크').should('be.visible');
  });

  it('resets pagination to first page on search and date filter changes', () => {
    cy.visit('/mate');
    cy.wait('@getPartiesPage0')
      .its('request.url')
      .should('include', 'page=0');

    cy.contains('button', '다음').click();
    cy.wait('@getPartiesPage1')
      .then((interception) => {
        const requestUrl = new URL(interception.request.url);
        expect(requestUrl.searchParams.get('page')).to.eq('1');
      });
    cy.contains('2 / 2').should('be.visible');

    cy.get('input[type="text"]').clear().type('검색용');
    cy.wait('@getPartiesSearch').then((interception) => {
      const requestUrl = new URL(interception.request.url);
      expect(requestUrl.searchParams.get('page')).to.eq('0');
      expect(requestUrl.searchParams.get('searchQuery')).to.eq('검색용');
    });
    cy.contains('대전 한화생명 이글스파크').should('be.visible');

    cy.get('input[type="text"]').clear();
    cy.get('.min-w-\\[60px\\]').eq(1).click();
    cy.wait('@getPartiesDate').then((interception) => {
      const requestUrl = new URL(interception.request.url);
      expect(requestUrl.searchParams.get('page')).to.eq('0');
      expect(requestUrl.searchParams.has('date')).to.eq(true);
    });
    cy.contains('수원 켈틱 파크').should('be.visible');
  });

  it('loads detail, manage, and checkin pages from deep links with URL id', () => {
    cy.intercept('GET', '**/api/parties/777', {
      statusCode: 200,
      body: detailParty,
    }).as('getPartyById');
    cy.intercept('GET', '**/api/applications/my', {
      statusCode: 200,
      body: [],
    }).as('getMyApplications');
    cy.intercept('GET', '**/api/reviews/user/123/average', {
      statusCode: 200,
      body: 4.3,
    }).as('getHostRating');
    cy.intercept('GET', '**/api/applications/party/777', {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('GET', '**/api/checkin/party/777', {
      statusCode: 200,
      body: [],
    }).as('getPartyCheckins');

    cy.visit('/mate/777');
    cy.wait('@getPartyById');
    cy.contains('문학 카펜트리').should('be.visible');

    cy.visit('/mate/777/manage');
    cy.wait('@getPartyApplications');
    cy.contains('파티 관리').should('be.visible');

    cy.visit('/mate/777/checkin');
    cy.wait('@getPartyCheckins');
    cy.contains('체크인').should('be.visible');
  });

  it('shows tab-specific empty state message when no result exists', () => {
    setupPartiesListMock({ sellingContent: [] });

    cy.visit('/mate');
    cy.contains('button', '티켓 판매').click();
    cy.wait('@getPartiesSelling').then((interception) => {
      const requestUrl = new URL(interception.request.url);
      expect(requestUrl.searchParams.get('status')).to.eq('SELLING');
      expect(requestUrl.searchParams.get('page')).to.eq('0');
    });
    cy.contains('판매 중인 파티가 없습니다').should('be.visible');
  });
});
