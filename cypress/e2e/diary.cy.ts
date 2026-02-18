/// <reference types="cypress" />

describe('Personal Diary', () => {
    beforeEach(() => {
        // Set fixed date to match mock data (2024-05-15)
        // This ensures the calendar renders May 2024 and clicks on '10' etc select 2024-05-10
        const now = new Date('2024-05-15T12:00:00').getTime();
        cy.clock(now, ['Date']);

        cy.login('user');
        cy.mockAPI();

        // Diary-specific mocks using standard globs - method agnostic to catch preflights
        cy.intercept('**/api/diary/entries*', (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    { id: 1, date: '2024-05-10', type: 'attended', mood: 'great', teamId: 'HH', emojiName: '최고' }
                ]
            });
        }).as('getDiaries');

        cy.intercept('**/api/diary/games*', (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    { id: 101, homeTeam: 'HH', awayTeam: 'SS', stadium: '대전', gameDate: '2024-05-15' }
                ]
            });
        }).as('getGames');

        cy.intercept('**/api/diary/statistics*', {
            statusCode: 200,
            body: { attendedCount: 1, winCount: 1, lossCount: 0, drawCount: 0 }
        }).as('getDiaryStats');

        // Mock image upload if any
        cy.intercept('**/api/diary/*/images*', {
            statusCode: 200,
            body: []
        }).as('uploadImages');

        // Mock league dates specifically for this spec to avoid any 500 from global mock
        cy.intercept('**/api/kbo/league-start-dates*', {
            statusCode: 200,
            body: { regularSeasonStart: '2025-03-22', postseasonStart: '2025-10-06', koreanSeriesStart: '2025-10-26' }
        }).as('getLeagueDatesLocal');

        cy.visit('/mypage');
        cy.contains('TestUser', { timeout: 20000 }).should('be.visible');

        // Diary is the default view on MyPage, but let's make sure it's selected or visible
        cy.contains('직관 기록').should('be.visible');

        // Wait for diary data
        cy.wait('@getDiaries', { timeout: 15000 });
    });

    it('should display the calendar', () => {
        // Our custom calendar uses month/year header
        cy.contains('년').should('be.visible');
        cy.contains('월').should('be.visible');
        // Check for day buttons
        cy.get('button').filter('.border.rounded-lg').should('have.length.at.least', 28);
    });

    it('should allow creating a record', () => {
        cy.viewport(1280, 800);

        cy.intercept('**/api/diary/entries*', {
            statusCode: 200,
            body: []
        }).as('getDiaries');

        cy.visit('/mypage');
        cy.wait('@getDiaries');

        // Click a white day (no entry)
        cy.get('[data-testid^="day-"]').filter(':not(:has(img))').first().click({ force: true });

        cy.wait('@getGames');

        cy.intercept('**/api/diary/save*', {
            statusCode: 201,
            body: { id: 2, date: '2024-05-15', type: 'attended' }
        }).as('saveDiary');

        // Fill form
        cy.contains('직관 완료').click();
        cy.get('button').contains('최고').click();
        cy.get('select').select('101');
        cy.get('textarea').type('Great game! Hanwha won!');
        cy.get('[data-testid="save-diary-btn"]').click();

        cy.wait('@saveDiary');
        cy.contains('li', '다이어리가 작성되었습니다').should('be.visible');
    });

    it('should allow modifying a record', () => {
        cy.viewport(1280, 800);

        // Mock a diary entry for modification
        cy.intercept('**/api/diary/entries*', (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        date: '2024-05-10',
                        type: 'attended',
                        emoji: '/emojis/happy.png',
                        emojiName: '최고',
                        winningName: 'WIN',
                        gameId: '101',
                        memo: 'Original content',
                        team: '한화 vs 삼성',
                        stadium: '대전'
                    }
                ]
            });
        }).as('getDiariesForModify');

        cy.visit('/mypage');
        cy.wait('@getDiariesForModify');

        // Check if the card title updates for the default selected date (today is 15th)
        cy.contains('5월 15일 직관 기록').should('be.visible');

        // Verify the entry exists on day 10 by checking for the emoji image
        cy.get('[data-testid="day-10"]').find('img', { timeout: 10000 }).should('be.visible');

        // Click on the day with the existing record
        cy.get('[data-testid="day-10"]').click({ force: true });

        // Modal/Card should update to ReadMode
        cy.contains('5월 10일 직관 기록').should('be.visible');
        cy.get('[data-testid="diary-memo"]').should('contain', 'Original content');

        // Click Edit to enter EditMode
        cy.get('[data-testid="edit-diary-btn"]').click();

        // Now in EditMode, textarea should exist
        cy.get('textarea').should('have.value', 'Original content');

        // Modify the content
        cy.get('textarea').clear().type('Modified content!');

        cy.intercept('POST', '**/api/diary/*/modify*', {
            statusCode: 200,
            body: { success: true }
        }).as('updateDiary');

        cy.get('[data-testid="save-diary-btn"]').click();

        cy.wait('@updateDiary');
        cy.contains('li', '다이어리가 수정되었습니다').should('be.visible');
    });

    it('should allow deleting a record', () => {
        cy.viewport(1280, 800);

        // Mock a diary entry for deletion
        cy.intercept('**/api/diary/entries*', (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    {
                        id: 1,
                        date: '2024-05-10',
                        type: 'attended',
                        emoji: '/emojis/happy.png',
                        emojiName: '최고',
                        winningName: 'WIN',
                        gameId: '101',
                        memo: 'Content to be deleted',
                        team: '한화 vs 삼성',
                        stadium: '대전'
                    }
                ]
            });
        }).as('getDiariesForDelete');

        cy.visit('/mypage');
        cy.wait('@getDiariesForDelete');

        // Verify the entry exists
        cy.get('[data-testid="day-10"]').find('img', { timeout: 10000 }).should('be.visible');

        // Click on the day with the existing record
        cy.get('[data-testid="day-10"]').click({ force: true });

        // Check card title
        cy.contains('5월 10일 직관 기록').should('be.visible');

        // Mock the DELETE request (The app actually uses POST /api/diary/{id}/delete)
        cy.intercept('POST', '**/api/diary/*/delete*', {
            statusCode: 200,
            body: { success: true }
        }).as('deleteDiary');

        // Mock the REFETCH triggered by deletion success
        cy.intercept('**/api/diary/entries*', (req) => {
            req.reply({
                statusCode: 200,
                body: [] // Return empty list now
            });
        }).as('getDiariesEmpty');

        // Click the delete button
        cy.get('[data-testid="delete-diary-btn"]').click();

        // ConfirmDialogContext renders a custom alert dialog; explicitly confirm deletion
        cy.get('[role="alertdialog"]').should('be.visible');
        cy.get('[role="alertdialog"]').contains('button', '삭제').click();

        cy.wait('@deleteDiary');
        cy.wait('@getDiariesEmpty');

        // The success message comes from toast.success
        cy.contains('li', '다이어리가 삭제되었습니다').should('be.visible');

        // Verify the entry is no longer displayed on the calendar (image gone)
        cy.get('[data-testid="day-10"]').find('img').should('not.exist');
    });
});
