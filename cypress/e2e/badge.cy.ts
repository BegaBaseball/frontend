/// <reference types="cypress" />

describe('Badge Showcase in Diary Statistics', () => {
    const fakeToken = 'e2e-badge-token';
    const authState = {
        state: {
            user: {
                id: 1,
                email: 'test@example.com',
                name: 'TestUser',
                handle: '@testuser',
                role: 'ROLE_USER',
                favoriteTeam: 'HH',
                profileImageUrl: null,
            },
            isLoggedIn: true,
            isAdmin: false,
        },
        version: 0,
    };

    const seedAuthState = (win: Window) => {
        win.localStorage.setItem('auth-storage', JSON.stringify(authState));
        win.localStorage.setItem('accessToken', fakeToken);
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    const bootstrapAuthenticatedWindow = (win: Window) => {
        const originalAddEventListener = win.addEventListener.bind(win);
        win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'auth-session-expired' || type === 'global-api-error') {
                return;
            }
            return originalAddEventListener(type, listener, options);
        }) as typeof win.addEventListener;
        seedAuthState(win);
    };

    const visitAsLoggedIn = (path: string) => {
        cy.visit(path, {
            onBeforeLoad(win) {
                bootstrapAuthenticatedWindow(win);
            },
        });
        cy.window().then((win) => {
            seedAuthState(win);
        });
        cy.setCookie('Authorization', fakeToken);
    };

    const mockStatistics = {
        totalCount: 15,
        totalWins: 10,
        totalLosses: 5,
        totalDraws: 0,
        winRate: 66.7,
        currentWinStreak: 3,
        currentLossStreak: 0,
        avgScore: 4.2,
        homeGames: 8,
        awayGames: 7,
        bestOpponent: 'LG 트윈스',
        worstOpponent: 'KT 위즈',
        luckyDay: '토요일',
        yearlyWinRate: 66.7,
        yearlyWins: 10,
        yearlyCount: 15,
        dayOfWeekStats: {},
        earnedBadges: ['ticket', 'flame', 'map-pin'],
    };

    const openStats = () => {
        cy.get('[data-testid="mypage-toggle-stats"]', { timeout: 20000 })
            .should('be.visible')
            .click({ force: true });
        cy.contains(/업적 배지|현재 저장된 직관 기록/, { timeout: 20000 }).scrollIntoView().should('be.visible');
    };

    beforeEach(() => {
        cy.mockAPI();
        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 1,
                    email: 'test@example.com',
                    name: 'TestUser',
                    handle: 'testuser',
                    favoriteTeam: 'HH',
                    role: 'ROLE_USER',
                    hasPassword: true,
                    profileImageUrl: null,
                },
            },
        }).as('getMe');

        cy.intercept('GET', '**/api/diary/statistics*', {
            statusCode: 200,
            body: mockStatistics,
        }).as('getDiaryStats');

        cy.intercept('GET', '**/api/diary/games*', {
            statusCode: 200,
            body: [],
        }).as('getDiaryGames');

        visitAsLoggedIn('/mypage?view=diary');
        cy.wait('@getMe');
    });

    it('renders diary statistics section with badges after clicking stats button', () => {
        openStats();
        cy.getBySel('mypage-badge-showcase').scrollIntoView().should('be.visible');
    });

    it('shows earned badges with color and unearned badges as locked', () => {
        openStats();

        cy.contains(/업적 배지/).scrollIntoView().should('be.visible');

        cy.getBySel('mypage-badge-showcase').as('badgeCard');
        cy.get('@badgeCard').find('[data-testid="mypage-badge-orb"]').should('have.length', 5);
        cy.get('@badgeCard').find('[data-testid="mypage-badge-orb"].opacity-60').should('have.length', 2);
        cy.get('@badgeCard').find('svg.lucide-lock').should('have.length', 2);
    });

    it('shows correct badge count (5 badges total)', () => {
        openStats();

        cy.contains(/업적 배지 \(3\/5\)/).scrollIntoView().should('be.visible');
        cy.get('[data-screen-label="나의 기록"]').should('exist');
    });
});
