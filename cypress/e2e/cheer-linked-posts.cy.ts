/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

const authUser = {
  id: 10,
  email: 'task10@example.com',
  name: 'Task 10 사용자',
  handle: 'task10host',
  role: 'ROLE_USER',
  favoriteTeam: 'LG',
  hasPassword: true,
  profileImageUrl: null,
};

const emptyPage = {
  content: [],
  last: true,
  totalPages: 1,
  totalElements: 0,
  size: 20,
  number: 0,
};

const availableCheckin = {
  kind: 'CHECKIN',
  available: true,
  unavailableReason: null,
  checkin: {
    gameDate: '2026-07-15',
    homeTeam: 'LG',
    awayTeam: 'HH',
    cheeringTeam: 'LG',
    stadium: '잠실야구장',
    verified: true,
  },
  recruitment: null,
};

const buildRecruitment = (overrides: Record<string, unknown> = {}) => ({
  kind: 'RECRUITMENT',
  available: true,
  unavailableReason: null,
  checkin: null,
  recruitment: {
    partyId: 703,
    gameDate: '2026-07-20',
    gameTime: { hour: 18, minute: 30 },
    homeTeam: 'LG',
    awayTeam: 'HH',
    stadium: '잠실야구장',
    section: '오렌지석 203블록',
    currentParticipants: 2,
    maxParticipants: 4,
    description: '응원 도구를 함께 준비하는 Task 10 파티입니다.',
    price: 12000,
    ticketPrice: 45000,
    reservationDepositAmount: 5000,
    status: 'PENDING',
    recruiting: true,
    ...overrides,
  },
});

const unavailableLinkedContent = (
  kind: 'CHECKIN' | 'RECRUITMENT',
  unavailableReason: 'SOURCE_MISSING' | 'SOURCE_INELIGIBLE',
) => ({
  kind,
  available: false,
  unavailableReason,
  checkin: null,
  recruitment: null,
});

const buildPost = (
  id: number,
  postType: 'NORMAL' | 'CHECKIN' | 'RECRUITMENT',
  overrides: Record<string, unknown> = {},
) => ({
  id,
  teamId: 'LG',
  postType,
  content: `Task 10 게시글 ${id}`,
  author: 'Task 10 사용자',
  authorHandle: '@task10host',
  createdAt: '2026-07-15T09:00:00Z',
  comments: 0,
  likes: 0,
  bookmarkCount: 0,
  repostCount: 0,
  views: 1,
  liked: false,
  isBookmarked: false,
  isOwner: false,
  repostedByMe: false,
  isHot: false,
  imageUrls: [],
  ...overrides,
});

const buildParty = (
  id: number,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  hostId: authUser.id,
  hostHandle: authUser.handle,
  hostName: authUser.name,
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.8,
  hostReviewCount: 7,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-07-20',
  gameTime: '18:30',
  stadium: '잠실야구장',
  homeTeam: 'LG',
  awayTeam: 'HH',
  section: '오렌지석 203블록',
  seatDetail: '12열',
  maxParticipants: 4,
  currentParticipants: 2,
  description: '응원 도구를 함께 준비하는 Task 10 파티입니다.',
  price: 12000,
  ticketPrice: 45000,
  reservationDepositAmount: 5000,
  ticketVerified: true,
  status: 'PENDING',
  createdAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

const installAuthenticatedBootstrap = () => {
  cy.intercept({ method: 'GET', pathname: '/api/auth/mypage' }, {
    statusCode: 200,
    body: { success: true, data: toAuthApiUser(authUser) },
  }).as('authProfile');
  cy.intercept({ method: 'GET', pathname: '/api/users/me/follow-counts' }, {
    statusCode: 200,
    body: { followerCount: 0, followingCount: 0, isFollowedByMe: false },
  });
  cy.intercept({ method: 'GET', pathname: '/api/franchises/code/LG' }, {
    statusCode: 200,
    body: { id: 1, teamCode: 'LG', teamName: 'LG 트윈스' },
  });
  cy.intercept({ method: 'GET', pathname: '/api/franchises/1/metadata' }, {
    statusCode: 200,
    body: {},
  });
};

const installCheerShell = () => {
  cy.intercept({ method: 'GET', pathname: '/api/cheer/posts/hot' }, {
    statusCode: 200,
    body: emptyPage,
  });
  cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
    statusCode: 200,
    body: emptyPage,
  });
};

const visitAuthenticated = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(window) {
      seedCypressAuthState(window, authUser, undefined, { skipPublicBootstrap: true });
    },
  });
  cy.window().then((window) => {
    seedCypressAuthState(window, authUser, undefined, { skipPublicBootstrap: true });
  });
};

const installDiary = () => {
  cy.intercept({ method: 'GET', pathname: '/api/diary/entries' }, {
    statusCode: 200,
    body: [{
      id: 701,
      date: '2026-07-15',
      type: 'attended',
      emoji: '/emojis/happy.png',
      emojiName: '최고',
      winningName: 'WIN',
      gameId: 8001,
      memo: 'Task 10 직관 기록',
      photos: [],
      team: '한화 vs LG',
      stadium: '잠실야구장',
      ticketVerified: true,
    }],
  }).as('diaryEntries');
  cy.intercept({ method: 'GET', pathname: '/api/diary/games' }, {
    statusCode: 200,
    body: [],
  });
};

const installMate = (party: ReturnType<typeof buildParty>) => {
  cy.intercept({ method: 'GET', pathname: `/api/parties/${party.id}` }, {
    statusCode: 200,
    body: party,
  }).as(`party${party.id}`);
  cy.intercept({ method: 'GET', pathname: `/api/applications/party/${party.id}` }, {
    statusCode: 200,
    body: [],
  });
  cy.intercept({ method: 'GET', pathname: `/api/applications/party/${party.id}/mine` }, {
    statusCode: 404,
    body: {},
  });
};

const installDetail = (post: ReturnType<typeof buildPost>) => {
  cy.intercept({ method: 'GET', pathname: `/api/cheer/posts/${post.id}` }, {
    statusCode: 200,
    body: post,
  }).as(`post${post.id}`);
  cy.intercept({ method: 'GET', pathname: `/api/cheer/posts/${post.id}/comments` }, {
    statusCode: 200,
    body: emptyPage,
  });
};

const postLinkedCheer = (postId: number, postType: 'CHECKIN' | 'RECRUITMENT') => {
  const linkedContent = postType === 'CHECKIN' ? availableCheckin : buildRecruitment();
  const post = buildPost(postId, postType, { linkedContent, isOwner: true });
  cy.intercept({ method: 'POST', pathname: '/api/cheer/posts' }, {
    statusCode: 201,
    body: post,
  }).as('createLinkedPost');
  installDetail(post);
};

describe('linked cheer posts in the production application', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.viewport(1280, 800);
    installAuthenticatedBootstrap();
    installCheerShell();
  });

  it('opens an eligible Diary preview, requires a body, creates CHECKIN, and navigates to it', () => {
    installDiary();
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts/linked' }, (request) => {
      expect(request.query).to.deep.equal({ diaryId: '701' });
      request.reply({ statusCode: 200, body: { postId: null, preview: availableCheckin } });
    }).as('lookupDiary');
    postLinkedCheer(9701, 'CHECKIN');

    visitAuthenticated('/mypage?view=diaryEditor&date=2026-07-15');
    cy.wait('@diaryEntries');
    cy.get('[data-testid="diary-share-to-cheer"]', { timeout: 20000 }).click();
    cy.wait('@lookupDiary');
    cy.location('pathname').should('equal', '/cheer/write');
    cy.location('search').should('equal', '?postType=CHECKIN&diaryId=701');
    cy.wait('@lookupDiary');

    cy.get('[data-testid="cheer-linked-preview"]', { timeout: 20000 })
      .should('contain.text', '직관 인증')
      .and('contain.text', '인증 완료');
    cy.get('[data-testid="cheer-linked-preview"]')
      .closest('[role="dialog"]')
      .within(() => {
        cy.contains('button', '게시하기').should('be.disabled');
        cy.get('textarea[placeholder="지금 우리 팀에게 응원을 남겨주세요!"]')
          .type('직관의 열기를 응원석에 남깁니다.');
        cy.contains('button', '게시하기').should('not.be.disabled').click();
      });
    cy.wait('@createLinkedPost').then(({ request }) => {
      expect(request.body).to.include({
        content: '직관의 열기를 응원석에 남깁니다.',
        postType: 'CHECKIN',
        diaryId: 701,
        shareMode: 'INTERNAL_REPOST',
      });
      expect(request.body).not.to.have.property('partyId');
    });
    cy.location('pathname').should('equal', '/cheer/9701');
  });

  it('routes an existing Diary link directly to the post without opening a modal', () => {
    installDiary();
    const existing = buildPost(9702, 'CHECKIN', { linkedContent: availableCheckin });
    installDetail(existing);
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts/linked' }, (request) => {
      expect(request.query).to.deep.equal({ diaryId: '701' });
      request.reply({ statusCode: 200, body: { postId: existing.id } });
    }).as('lookupExistingDiary');

    visitAuthenticated('/mypage?view=diaryEditor&date=2026-07-15');
    cy.wait('@diaryEntries');
    cy.get('[data-testid="diary-share-to-cheer"]', { timeout: 20000 }).click();
    cy.wait('@lookupExistingDiary');
    cy.location('pathname').should('equal', '/cheer/9702');
    cy.get('[data-testid="cheer-linked-preview"]').should('not.exist');
    cy.contains('[role="dialog"]', '새 응원글 작성').should('not.exist');
  });

  it('gives a PENDING host a separate Mate action and creates from description and price preview', () => {
    const party = buildParty(703);
    installMate(party);
    const preview = buildRecruitment();
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts/linked' }, (request) => {
      expect(request.query).to.deep.equal({ partyId: '703' });
      request.reply({ statusCode: 200, body: { postId: null, preview } });
    }).as('lookupParty');
    postLinkedCheer(9703, 'RECRUITMENT');

    visitAuthenticated('/mate/703');
    cy.wait('@party703');
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]', { timeout: 20000 })
      .scrollIntoView()
      .should('contain.text', '응원석에 공유')
      .and('be.visible')
      .click();
    cy.wait('@lookupParty');
    cy.location('pathname').should('equal', '/cheer/write');
    cy.location('search').should('equal', '?postType=RECRUITMENT&partyId=703');
    cy.wait('@lookupParty');

    cy.get('[data-testid="cheer-linked-preview"]', { timeout: 20000 })
      .should('contain.text', '응원 도구를 함께 준비하는 Task 10 파티입니다.')
      .and('contain.text', '참가비')
      .and('contain.text', '12,000원')
      .and('contain.text', '티켓')
      .and('contain.text', '45,000원')
      .and('contain.text', '예약금')
      .and('contain.text', '5,000원');
    cy.get('[data-testid="cheer-linked-preview"]')
      .closest('[role="dialog"]')
      .within(() => {
        cy.get('textarea[placeholder="지금 우리 팀에게 응원을 남겨주세요!"]')
          .type('함께 응원할 동행을 모집합니다.');
        cy.contains('button', '게시하기').click();
      });
    cy.wait('@createLinkedPost').then(({ request }) => {
      expect(request.body).to.include({
        content: '함께 응원할 동행을 모집합니다.',
        postType: 'RECRUITMENT',
        partyId: 703,
        shareMode: 'INTERNAL_REPOST',
      });
      expect(request.body).not.to.have.property('diaryId');
    });
    cy.location('pathname').should('equal', '/cheer/9703');
  });

  it('keeps friend sharing but hides cheer sharing from non-host and non-PENDING parties', () => {
    const nonHost = buildParty(704, { hostId: 44, hostHandle: 'another-host' });
    installMate(nonHost);
    visitAuthenticated('/mate/704');
    cy.wait('@party704');
    cy.get('[data-testid="mate-desktop-action-rail"]', { timeout: 20000 })
      .contains('button', '친구에게 공유')
      .scrollIntoView()
      .should('be.visible');
    cy.get('[data-testid="mate-share-to-cheer"]').should('not.exist');

    const matchedHost = buildParty(705, { status: 'MATCHED' });
    installMate(matchedHost);
    visitAuthenticated('/mate/705');
    cy.wait('@party705');
    cy.get('[data-testid="mate-desktop-action-rail"]', { timeout: 20000 })
      .contains('button', '친구에게 공유')
      .scrollIntoView()
      .should('be.visible');
    cy.get('[data-testid="mate-share-to-cheer"]').should('not.exist');
  });

  it('renders missing and ineligible CHECKIN sources unavailable without a link', () => {
    ([
      [9705, 'SOURCE_MISSING'],
      [9715, 'SOURCE_INELIGIBLE'],
    ] as const).forEach(([postId, reason]) => {
      const post = buildPost(postId, 'CHECKIN', {
        linkedContent: unavailableLinkedContent('CHECKIN', reason),
      });
      installDetail(post);
      visitAuthenticated(`/cheer/${postId}`);
      cy.wait(`@post${postId}`);
      cy.get('[data-testid="cheer-linked-unavailable"]', { timeout: 20000 })
        .should('contain.text', '원본을 확인할 수 없음');
      cy.get('[data-testid="cheer-linked-party-link"]').should('not.exist');
      cy.get('[data-testid="cheer-linked-unavailable"] a').should('not.exist');
    });
  });

  it('renders a MATCHED RECRUITMENT closed with an enabled party link', () => {
    const linkedContent = buildRecruitment({
      partyId: 706,
      status: 'MATCHED',
      recruiting: false,
    });
    const post = buildPost(9706, 'RECRUITMENT', { linkedContent });
    installDetail(post);

    visitAuthenticated('/cheer/9706');
    cy.wait('@post9706');
    cy.contains('[aria-label="동행 모집 정보"]', '모집 마감', { timeout: 20000 })
      .should('be.visible');
    cy.get('[data-testid="cheer-linked-party-link"]')
      .should('have.attr', 'href', '/mate/706')
      .and('contain.text', '파티 보기');
  });

  it('renders a FAILED RECRUITMENT unavailable without a party link', () => {
    const post = buildPost(9707, 'RECRUITMENT', {
      linkedContent: unavailableLinkedContent('RECRUITMENT', 'SOURCE_INELIGIBLE'),
    });
    installDetail(post);

    visitAuthenticated('/cheer/9707');
    cy.wait('@post9707');
    cy.get('[data-testid="cheer-linked-unavailable"]', { timeout: 20000 })
      .should('contain.text', '원본을 확인할 수 없음');
    cy.get('[data-testid="cheer-linked-party-link"]').should('not.exist');
  });

  it('keeps the linked badge and card on an embedded original post', () => {
    const originalLinkedContent = buildRecruitment({ partyId: 708 });
    const post = buildPost(9708, 'NORMAL', {
      content: 'Task 10 인용 본문',
      repostOfId: 8708,
      repostType: 'QUOTE',
      originalDeleted: false,
      originalPost: {
        id: 8708,
        teamId: 'LG',
        teamColor: '#C30452',
        postType: 'RECRUITMENT',
        content: 'Task 10 원본 모집글',
        author: '원글 작성자',
        authorHandle: '@original-host',
        createdAt: '2026-07-14T09:00:00Z',
        imageUrls: [],
        deleted: false,
        linkedContent: originalLinkedContent,
      },
    });
    installDetail(post);

    visitAuthenticated('/cheer/9708');
    cy.wait('@post9708');
    cy.contains('인용 원문을 함께 볼 수 있어요.', { timeout: 20000 })
      .parent()
      .parent()
      .within(() => {
        cy.contains('동행 모집').should('be.visible');
        cy.get('[aria-label="동행 모집 정보"]')
          .should('contain.text', '응원 도구를 함께 준비하는 Task 10 파티입니다.')
          .and('contain.text', '모집 중');
        cy.get('[data-testid="cheer-linked-party-link"]')
          .should('have.attr', 'href', '/mate/708');
      });
  });
});
