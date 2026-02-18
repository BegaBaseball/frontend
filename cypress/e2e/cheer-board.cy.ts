/// <reference types="cypress" />

describe('Cheer Board', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        // Standard posts mock
        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: {
                content: [
                    { id: 10, content: 'Popular post 1', author: 'HotUser', teamId: 'HH', timeAgo: '2024. 03. 20.', comments: 50, likes: 100, likedByUser: false, views: 1000, postType: 'NORMAL' },
                    { id: 11, content: 'Popular post 2', author: 'HotUser2', teamId: 'OB', timeAgo: '2024. 03. 21.', comments: 20, likes: 200, likedByUser: false, views: 2000, postType: 'NORMAL' }
                ],
                last: true,
                totalPages: 1,
                totalElements: 2,
                size: 20,
                number: 0
            }
        }).as('getPopularPosts');

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            if (req.url.includes('/api/cheer/posts/hot')) {
                return; // Let getPopularPosts handle it
            }
            req.reply({
                statusCode: 200,
                body: {
                    content: [
                        { id: 1, content: 'This is a test post content.', author: 'TestUser', teamId: 'HH', timeAgo: '2024. 03. 20.', comments: 2, likes: 5, likedByUser: false, views: 100, postType: 'NORMAL' },
                        { id: 2, content: 'Another test post.', author: 'OtherUser', teamId: 'OB', timeAgo: '2024. 03. 21.', comments: 0, likes: 10, likedByUser: true, views: 200, postType: 'NORMAL' }
                    ],
                    last: true,
                    totalPages: 1,
                    totalElements: 2,
                    size: 20,
                    number: 0
                }
            });
        }).as('getPosts');

        cy.visit('/cheer');
        // Wait for hydration and user greeting
        cy.contains('TestUser 님', { timeout: 20000 }).should('be.visible');
        cy.wait('@getPosts');
    });

    describe('Public View', () => {
        it('should display list of posts', () => {
            cy.contains('This is a test post content.').should('be.visible');
            cy.contains('Another test post.').should('be.visible');
        });

        it('should switch feed tabs', () => {
            // "인기" tab has sort=views,desc
            cy.contains('button', '인기').click();

            // Should trigger a new request with sort parameter
            cy.wait('@getPopularPosts');
            cy.contains('Popular post 1').should('be.visible');
        });
    });

    describe('Interactions (Requires Login)', () => {
        it('should create a new post', () => {
            const content = 'Winning post!';

            cy.intercept('POST', '**/api/cheer/posts', {
                statusCode: 200,
                body: {
                    id: 3,
                    content: content,
                    author: 'TestUser',
                    teamId: 'HH',
                    postType: 'CHEER',
                    createdAt: new Date().toISOString()
                }
            }).as('createPost');

            // The textarea has placeholder text that involves "응원"
            cy.get('textarea[placeholder*="응원"]').first().type(content);
            cy.get('button[data-testid="write-post-btn"]').click();

            cy.wait('@createPost');

            // Check for the new post - it should appear via optimistic update or refetch
            cy.contains(content, { timeout: 10000 }).should('be.visible');
        });

        it('should toggle like on a post', () => {
            cy.intercept('POST', '**/api/cheer/posts/1/like', {
                statusCode: 200,
                body: { liked: true, likes: 6 }
            }).as('toggleLike');

            // Find the first post's like button using aria-label which contains "좋아요"
            cy.get('button[aria-label*="좋아요"]').first().click();
            cy.wait('@toggleLike');
            cy.contains('6').should('be.visible');
        });
    });
});
