describe('Mate Chat Image Upload', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('채팅 이미지 업로드 버튼이 활성화되고 이미지 전송이 가능하다', () => {
    cy.intercept('GET', '**/api/parties/999', {
      statusCode: 200,
      body: {
        id: 999,
        hostId: 123,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostRating: 4.8,
        teamId: 'LG',
        gameDate: '2026-03-10',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '외야',
        maxParticipants: 2,
        currentParticipants: 2,
        description: 'chat upload test',
        ticketVerified: true,
        status: 'MATCHED',
      },
    }).as('getMatchedParty');

    cy.intercept('GET', '**/api/chat/party/999', {
      statusCode: 200,
      body: [],
    }).as('getChatMessages');

    cy.intercept('POST', '**/api/chat/party/999/read', {
      statusCode: 200,
      body: { success: true },
    }).as('markChatRead');

    cy.intercept('POST', '**/api/storage/image', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          path: 'https://example.com/chat-upload.png',
        },
      },
    }).as('uploadChatImage');

    cy.intercept('POST', '**/api/chat/messages', {
      statusCode: 200,
      body: {
        id: 1001,
        partyId: 999,
        senderId: 123,
        senderName: 'Test User',
        message: '(사진 전송)',
        imageUrl: 'https://example.com/chat-upload.png',
        createdAt: '2026-03-01T12:00:00Z',
      },
    }).as('sendChatMessage');

    cy.visit('/mate/999/chat');
    cy.wait('@getMatchedParty');
    cy.wait('@getChatMessages');

    cy.get('button[aria-label="이미지 업로드"]').should('be.enabled');

    cy.get('#mate-chat-image-upload').selectFile(
      {
        contents: Cypress.Buffer.from('fake-chat-image'),
        fileName: 'chat.png',
        mimeType: 'image/png',
      },
      { force: true }
    );

    cy.get('img[alt="Preview"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.enabled').click();

    cy.wait('@uploadChatImage');
    cy.wait('@sendChatMessage');
    cy.get('img[alt="Attachment"]').should('be.visible');
  });
});
