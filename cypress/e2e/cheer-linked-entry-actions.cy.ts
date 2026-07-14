/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

interface Task9EntryHarness {
  mountSubject: () => void;
  setTarget: (target: string) => void;
  waitForLinkedLookupSettlement: (index: number) => Promise<void>;
  unmountSubject: () => void;
  unmount: () => void;
}

interface Task9EntryHarnessModule {
  mountDiaryEntryHarness: (container: Element, initialDate?: string) => Task9EntryHarness;
  mountMateEntryHarness: (container: Element, initialPartyId?: string) => Task9EntryHarness;
}

interface HeldLookup {
  resolve: (body: { postId?: number | null }) => void;
  reject: (message: string) => void;
}

let activeHarness: Task9EntryHarness | null = null;

const diaryEntries = [
  {
    id: 73,
    date: '2026-07-15',
    type: 'attended',
    emoji: '/emojis/happy.png',
    emojiName: '최고',
    winningName: 'WIN',
    gameId: 8,
    memo: 'A 기록',
    photos: [],
    team: 'A 팀',
    stadium: '잠실',
    ticketVerified: true,
  },
  {
    id: 74,
    date: '2026-07-16',
    type: 'attended',
    emoji: '/emojis/happy.png',
    emojiName: '최고',
    winningName: 'WIN',
    gameId: 9,
    memo: 'B 기록',
    photos: [],
    team: 'B 팀',
    stadium: '잠실',
    ticketVerified: true,
  },
  {
    id: 75,
    date: '2026-07-17',
    type: 'attended',
    emoji: '/emojis/happy.png',
    emojiName: '최고',
    winningName: 'WIN',
    gameId: 10,
    memo: 'C 기록',
    photos: [],
    team: 'C 팀',
    stadium: '잠실',
    ticketVerified: true,
  },
] as const;

const buildParty = (id: number) => ({
  id,
  hostId: 1,
  hostHandle: '@task9host',
  hostName: 'Task 9 호스트',
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.8,
  hostReviewCount: 3,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-07-20',
  gameTime: '18:30',
  stadium: '잠실',
  homeTeam: '홈팀',
  awayTeam: '원정팀',
  section: `${id} 구역`,
  seatDetail: `${id}열`,
  maxParticipants: 3,
  currentParticipants: 1,
  description: `${id} 파티`,
  ticketVerified: true,
  status: 'PENDING',
  reservationDepositAmount: null,
  createdAt: '2026-07-01T00:00:00',
});

const task9Host = {
  id: 1,
  email: 'task9@example.com',
  name: 'Task 9 Host',
  handle: 'task9host',
  role: 'ROLE_USER',
  favoriteTeam: 'LG',
  hasPassword: true,
  profileImageUrl: null,
};

const loadHarness = (window: Cypress.AUTWindow) => {
  const load = new window.Function(
    'return import("/cypress/support/cheerLinkedEntryActionsHarness.tsx")',
  ) as () => Promise<Task9EntryHarnessModule>;
  return load();
};

const installImmediateIntersectionObserver = (window: Cypress.AUTWindow) => {
  class ImmediateIntersectionObserver {
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback([{
        target,
        isIntersecting: true,
        intersectionRatio: 1,
      } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }

    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '0px';
    thresholds = [0];
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: ImmediateIntersectionObserver,
  });
};

const installDiaryApis = () => {
  cy.intercept('GET', '**/api/diary/entries*', { statusCode: 200, body: diaryEntries });
  cy.intercept('GET', '**/api/diary/games*', { statusCode: 200, body: [] });
};

const installMateApis = () => {
  cy.intercept('GET', /\/api\/parties\/(44|45|46)(?:\?.*)?$/, (request) => {
    const id = Number(request.url.match(/\/parties\/(\d+)/)?.[1]);
    request.reply({ statusCode: 200, body: buildParty(id) });
  });
  cy.intercept('GET', /\/api\/applications\/party\/(44|45|46)(?:\?.*)?$/, {
    statusCode: 200,
    body: [],
  });
};

const holdLinkedLookups = (): HeldLookup[] => {
  const held: HeldLookup[] = [];
  cy.intercept('GET', '**/api/cheer/posts/linked*', (request) => new Cypress.Promise<void>((done) => {
    held.push({
      resolve: (body) => {
        request.reply({ statusCode: 200, body });
        done();
      },
      reject: (message) => {
        request.reply({ statusCode: 500, body: { message } });
        done();
      },
    });
  })).as('heldLinkedLookup');
  return held;
};

const awaitLinkedLookupSettlement = (
  mounted: () => Task9EntryHarness | null,
  index: number,
) => {
  cy.wait('@heldLinkedLookup');
  cy.then(() => {
    const harness = mounted();
    if (!harness) throw new Error('TASK_9_ENTRY_HARNESS_NOT_MOUNTED');
    return harness.waitForLinkedLookupSettlement(index);
  });
};

const mountDiary = (initialDate = '2026-07-15') => {
  let harness: Task9EntryHarness | null = null;
  cy.visit('/__cheer-linked-entry-actions-test');
  cy.window().then(async (window) => {
    const module = await loadHarness(window);
    const container = window.document.createElement('main');
    window.document.body.replaceChildren(container);
    harness = module.mountDiaryEntryHarness(container, initialDate);
    activeHarness = harness;
  });
  return () => harness;
};

const mountMate = (initialPartyId = '44') => {
  let harness: Task9EntryHarness | null = null;
  cy.visit('/__cheer-linked-entry-actions-test', {
    onBeforeLoad(window) {
      seedCypressAuthState(window, task9Host, undefined, { skipPublicBootstrap: true });
    },
  });
  cy.window().then(async (window) => {
    installImmediateIntersectionObserver(window);
    const module = await loadHarness(window);
    const container = window.document.createElement('main');
    window.document.body.replaceChildren(container);
    harness = module.mountMateEntryHarness(container, initialPartyId);
    activeHarness = harness;
  });
  return () => harness;
};

describe('Diary and Mate linked cheer entry behavior', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  afterEach(() => {
    activeHarness?.unmount();
    activeHarness = null;
  });

  it('clicks the real Diary action, preserves edit/delete, and navigates to an existing post', () => {
    installDiaryApis();
    cy.intercept('GET', '**/api/cheer/posts/linked*', (request) => {
      expect(request.query).to.deep.equal({ diaryId: '73' });
      request.reply({ statusCode: 200, body: { postId: 91 } });
    }).as('lookupDiary');
    const mounted = mountDiary();

    cy.get('[data-testid="diary-read-mode"]').should('contain.text', 'A 기록');
    cy.get('[data-testid="edit-diary-btn"]').should('be.visible');
    cy.get('[data-testid="delete-diary-btn"]').should('be.visible');
    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wait('@lookupDiary');
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/cheer/91');
    cy.get('[data-testid="edit-diary-btn"]').click();
    cy.get('[data-testid="diary-read-mode"]').should('not.exist');
  });

  it('keeps the real Diary delete action wired', () => {
    installDiaryApis();
    cy.intercept('POST', '**/api/diary/73/delete', { statusCode: 200, body: {} }).as('deleteDiary');
    const mounted = mountDiary();

    cy.get('[data-testid="delete-diary-btn"]').click();
    cy.get('[data-testid="confirm-dialog"]').contains('button', '삭제').click();
    cy.wait('@deleteDiary').its('request.body').should('deep.equal', { id: 73 });
  });

  it('clicks real Mate desktop/friend/top controls and existing-post navigation', () => {
    installMateApis();
    cy.intercept('GET', '**/api/cheer/posts/linked*', (request) => {
      expect(request.query).to.deep.equal({ partyId: '44' });
      request.reply({ statusCode: 200, body: { postId: 92 } });
    }).as('lookupParty');
    const mounted = mountMate();

    cy.window().then((window) => {
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: cy.stub().as('nativeShare').resolves(),
      });
    });
    cy.get('[data-testid="mate-desktop-action-rail"]').should('be.visible').within(() => {
      cy.contains('button', '친구에게 공유').click();
      cy.get('[data-testid="mate-share-to-cheer"]').click();
    });
    cy.wait('@lookupParty');
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/cheer/92');
    cy.contains('button', /^공유$/).click();
    cy.get('@nativeShare').should('have.been.calledTwice');
  });

  it('clicks the real Mate mobile action-sheet control and navigates to a new composer', () => {
    cy.viewport(390, 844);
    installMateApis();
    cy.intercept('GET', '**/api/cheer/posts/linked*', { statusCode: 200, body: { postId: null } }).as('lookupParty');
    const mounted = mountMate('45');

    cy.get('[data-testid="mate-mobile-action-bar"] button').last().click();
    cy.get('[data-testid="mate-share-to-cheer"]:visible').should('have.length', 1).click();
    cy.wait('@lookupParty').its('request.query').should('deep.equal', { partyId: '45' });
    cy.get('[data-testid="entry-router-location"]').should(
      'have.text',
      '/cheer/write?postType=RECRUITMENT&partyId=45',
    );
  });

  it('Diary target effects ignore stale success and rejection while the replacement executes', () => {
    installDiaryApis();
    const held = holdLinkedLookups();
    const mounted = mountDiary();

    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(1));
    cy.then(() => mounted()?.setTarget('2026-07-16'));
    cy.get('[data-testid="diary-read-mode"]').should('contain.text', 'B 기록');
    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(2));
    cy.then(() => held[0].resolve({ postId: 193 }));
    awaitLinkedLookupSettlement(mounted, 0);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.get('[data-testid="diary-share-to-cheer"]').should('contain.text', '공유 확인 중');
    cy.then(() => mounted()?.setTarget('2026-07-17'));
    cy.get('[data-testid="diary-read-mode"]').should('contain.text', 'C 기록');
    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(3));
    cy.then(() => held[1].reject('STALE_DIARY_ERROR'));
    awaitLinkedLookupSettlement(mounted, 1);
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
    cy.get('[data-testid="diary-share-to-cheer"]').should('contain.text', '공유 확인 중');
    cy.then(() => held[2].resolve({ postId: 95 }));
    awaitLinkedLookupSettlement(mounted, 2);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/cheer/95');
  });

  it('Diary unmount cleanup ignores deferred success and rejection', () => {
    installDiaryApis();
    const held = holdLinkedLookups();
    const mounted = mountDiary();

    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(1));
    cy.then(() => mounted()?.unmountSubject());
    cy.get('[data-testid="entry-subject"]').should('not.exist');
    cy.then(() => held[0].resolve({ postId: 196 }));
    awaitLinkedLookupSettlement(mounted, 0);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
    cy.then(() => mounted()?.mountSubject());
    cy.get('[data-testid="diary-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(2));
    cy.then(() => mounted()?.unmountSubject());
    cy.get('[data-testid="entry-subject"]').should('not.exist');
    cy.then(() => held[1].reject('UNMOUNTED_DIARY_ERROR'));
    awaitLinkedLookupSettlement(mounted, 1);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
  });

  it('Mate target effects ignore stale success and rejection while the replacement executes', () => {
    installMateApis();
    const held = holdLinkedLookups();
    const mounted = mountMate();

    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(1));
    cy.then(() => mounted()?.setTarget('45'));
    cy.contains('45 구역').should('be.visible');
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(2));
    cy.then(() => held[0].resolve({ postId: 197 }));
    awaitLinkedLookupSettlement(mounted, 0);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').should('contain.text', '공유 확인 중');
    cy.then(() => mounted()?.setTarget('46'));
    cy.contains('46 구역').should('be.visible');
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(3));
    cy.then(() => held[1].reject('STALE_MATE_ERROR'));
    awaitLinkedLookupSettlement(mounted, 1);
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').should('contain.text', '공유 확인 중');
    cy.then(() => held[2].resolve({ postId: 96 }));
    awaitLinkedLookupSettlement(mounted, 2);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/cheer/96');
  });

  it('Mate unmount cleanup ignores deferred success and rejection', () => {
    installMateApis();
    const held = holdLinkedLookups();
    const mounted = mountMate();

    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(1));
    cy.then(() => mounted()?.unmountSubject());
    cy.get('[data-testid="entry-subject"]').should('not.exist');
    cy.then(() => held[0].resolve({ postId: 198 }));
    awaitLinkedLookupSettlement(mounted, 0);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
    cy.then(() => mounted()?.mountSubject());
    cy.get('[data-testid="mate-desktop-action-rail"] [data-testid="mate-share-to-cheer"]').click();
    cy.wrap(null).should(() => expect(held).to.have.length(2));
    cy.then(() => mounted()?.unmountSubject());
    cy.get('[data-testid="entry-subject"]').should('not.exist');
    cy.then(() => held[1].reject('UNMOUNTED_MATE_ERROR'));
    awaitLinkedLookupSettlement(mounted, 1);
    cy.get('[data-testid="entry-router-location"]').should('have.text', '/task-9');
    cy.contains('[data-sonner-toast]', '응원석 공유 정보를 확인하지 못했습니다.').should('not.exist');
  });
});
