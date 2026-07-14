import type { CheerPost, LinkedContent } from '../../src/api/cheerApi';
import type { CheerComposerLifecycleHarness } from '../support/cheerComposerLifecycleHarness';

interface LifecycleHarnessModule {
  mountCheerComposerLifecycleHarness: (container: Element) => CheerComposerLifecycleHarness;
}

const checkinPreview: LinkedContent = {
  kind: 'CHECKIN',
  available: true,
  checkin: {
    gameDate: '2026-07-13',
    homeTeam: 'LG',
    awayTeam: '두산',
    cheeringTeam: 'LG',
    stadium: '잠실',
    verified: true,
  },
  recruitment: null,
  unavailableReason: null,
};

const existingPost = (id: number): CheerPost => ({
  id,
  teamId: 'LG',
  team: 'LG',
  postType: 'NORMAL',
  author: 'Writer',
  authorHandle: '@writer',
  content: 'existing',
  timeAgo: '방금 전',
  teamColor: '#C30452',
  likeCount: 0,
  commentCount: 0,
  bookmarkCount: 0,
  repostCount: 0,
  views: 0,
  isHot: false,
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T00:00:00Z',
  liked: false,
  bookmarked: false,
  isOwner: true,
  repostedByMe: false,
  imageUrls: [],
});

describe('linked cheer composer mounted lifecycle', () => {
  let harness: CheerComposerLifecycleHarness | null = null;

  const mount = (setup?: (nextHarness: CheerComposerLifecycleHarness) => void) => {
    cy.visit('/__cheer-composer-lifecycle-test');
    cy.window().then(async (window) => {
      const loadHarness = new window.Function(
        'return import("/cypress/support/cheerComposerLifecycleHarness.tsx")',
      ) as () => Promise<LifecycleHarnessModule>;
      const module = await loadHarness();
      const container = window.document.createElement('div');
      window.document.body.replaceChildren(container);
      harness = module.mountCheerComposerLifecycleHarness(container);
      if (setup) {
        setup(harness);
      } else {
        harness.setAuth({ isAuthLoading: false, isLoggedIn: true });
      }
    });
  };

  afterEach(() => {
    harness?.unmount();
    harness = null;
  });

  it('gates auth, surfaces loading before import, and dedupes StrictMode lookup', () => {
    mount((mounted) => {
      mounted.holdNextImport();
      mounted.setAuth({ isAuthLoading: true, isLoggedIn: false });
    });

    cy.then(() => {
      expect(harness?.getImportCalls()).to.equal(0);
      harness?.setAuth({ isAuthLoading: false, isLoggedIn: false });
    });
    cy.wrap(null).should(() => {
      expect(harness?.getImportCalls()).to.equal(0);
      expect(harness?.getLoginCalls()).to.equal(1);
    });
    cy.then(() => {
      harness?.setAuth({ isAuthLoading: false, isLoggedIn: true });
    });
    cy.contains('연결 대상을 확인하는 중...').should('be.visible');
    cy.then(() => {
      expect(harness?.getImportCalls()).to.equal(1);
      harness?.resolveHeldImport();
    });
    cy.wrap(null).should(() => {
      expect(harness?.getLookupCalls()).to.deep.equal([{ diaryId: 12 }]);
    });
    cy.then(() => {
      harness?.setAuth({ isAuthLoading: false, isLoggedIn: false });
      harness?.resolveLookup(0, { postId: 81, preview: checkinPreview });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/write');
  });

  it('keeps only B when A resolves late and ignores a stale A error', () => {
    mount();
    cy.wrap(null).should(() => {
      expect(harness?.getLookupCalls()).to.deep.equal([{ diaryId: 12 }]);
    });
    cy.then(() => {
      harness?.setRoute({
        openComposerOnMount: true,
        linkedRouteRequested: true,
        linkedTarget: { postType: 'RECRUITMENT', partyId: 44 },
      });
    });
    cy.wrap(null).should(() => {
      expect(harness?.getLookupCalls()).to.deep.equal([{ diaryId: 12 }, { partyId: 44 }]);
    });
    cy.then(() => {
      harness?.resolveLookup(1, { postId: 82, preview: checkinPreview });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/82');
    cy.then(() => harness?.rejectLookup(0, new Error('STALE_CHECKIN_ERROR')));
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/82');
  });

  it('invalidates a linked request when the route becomes an ordinary write', () => {
    mount();
    cy.then(() => {
      harness?.setRoute({
        openComposerOnMount: true,
        linkedRouteRequested: false,
        linkedTarget: null,
      });
      harness?.resolveLookup(0, { postId: 83, preview: checkinPreview });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/write');
    cy.contains('새 응원글 작성').should('be.visible');
  });

  it('ignores late navigation and state callbacks after composer unmount', () => {
    mount();
    cy.then(() => {
      harness?.unmountComposer();
      harness?.resolveLookup(0, { postId: 84, preview: checkinPreview });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/write');
    cy.contains('새 응원글 작성').should('not.exist');
  });

  it('handles a rejected route chunk and retries successfully after route re-entry', () => {
    mount((mounted) => {
      mounted.failNextImport();
      mounted.setAuth({ isAuthLoading: false, isLoggedIn: true });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer');
    cy.get('main[data-linked-route-requested]').should('have.attr', 'data-linked-route-requested', 'false');
    cy.then(() => {
      expect(harness?.getImportCalls()).to.equal(1);
      harness?.setRoute({ openComposerOnMount: false, linkedRouteRequested: false, linkedTarget: null });
    });
    cy.contains('연결 대상을 확인하는 중...').should('not.exist');
    cy.then(() => {
      harness?.setRoute({
        openComposerOnMount: true,
        linkedRouteRequested: true,
        linkedTarget: { postType: 'CHECKIN', diaryId: 12 },
      });
    });
    cy.wrap(null).should(() => {
      expect(harness?.getImportCalls()).to.equal(2);
      expect(harness?.getLookupCalls()).to.deep.equal([{ diaryId: 12 }]);
    });
    cy.then(() => {
      harness?.resolveLookup(0, { postId: 85, preview: checkinPreview });
    });
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/85');
  });

  it('removes the linked optimistic cache entry and navigates to the returned create ID', () => {
    cy.intercept('POST', '**/api/cheer/posts', {
      statusCode: 200,
      body: {
        id: 91,
        teamId: 'LG',
        content: 'already linked',
        author: 'Writer',
        authorHandle: '@writer',
        createdAt: '2026-07-15T00:00:00Z',
        commentCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 0,
        liked: false,
        isBookmarked: false,
        isOwner: true,
        repostedByMe: false,
        isHot: false,
        postType: 'CHECKIN',
        imageUrls: [],
      },
    }).as('createLinkedPost');
    mount((mounted) => {
      mounted.seedFeed([existingPost(7)]);
      mounted.setAuth({ isAuthLoading: false, isLoggedIn: true });
    });
    cy.wrap(null).should(() => {
      expect(harness?.getLookupCalls()).to.deep.equal([{ diaryId: 12 }]);
    });
    cy.then(() => harness?.resolveLookup(0, { preview: checkinPreview }));
    cy.contains('직관 인증').should('be.visible');
    cy.get('[role="dialog"] textarea[placeholder="지금 우리 팀에게 응원을 남겨주세요!"]').type('함께 응원해요');
    cy.get('[role="dialog"]').contains('button', '게시하기').click();
    cy.wait('@createLinkedPost');
    cy.get('[data-testid="composer-router-location"]').should('have.text', '/cheer/91');
    cy.then(() => expect(harness?.getFeedPostIds()).to.deep.equal([7]));
  });
});
