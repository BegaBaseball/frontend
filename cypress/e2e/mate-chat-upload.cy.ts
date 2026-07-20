describe('Mate Chat Image Upload', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('채팅 이미지 업로드 버튼이 활성화되고 업로드 요청이 호출된다', () => {
    const uploadedChatPath = 'media/chat/123/51.webp';

    cy.intercept('GET', '**/api/parties/999', {
      statusCode: 200,
      body: {
        id: 999,
        hostId: 123,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 4.8,
        hostReviewCount: 6,
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

    cy.intercept({ method: 'GET', pathname: '/api/chat/party/999' }, {
      statusCode: 200,
      body: [],
    }).as('getChatMessages');

    cy.intercept('POST', '**/api/chat/party/999/read', {
      statusCode: 200,
      body: { success: true },
    }).as('markChatRead');

    cy.intercept('POST', '**/api/media/uploads/init', (req) => {
      expect(req.body.domain).to.eq('CHAT');
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            assetId: 51,
            uploadUrl: 'https://object.example.com/upload/chat-51',
            stagingObjectKey: 'media/staging/chat/123/51-chat.png',
            expiresAt: '2026-04-14T00:00:00Z',
            requiredHeaders: {
              'Content-Type': 'image/png',
            },
          },
        },
      });
    }).as('initChatImageUpload');

    cy.intercept('PUT', 'https://object.example.com/upload/chat-51', {
      statusCode: 200,
      body: '',
    }).as('putChatImageUpload');

    cy.intercept('POST', '**/api/media/uploads/51/finalize', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          assetId: 51,
          storagePath: uploadedChatPath,
          publicUrl: 'https://cdn.example.com/media/chat/123/51.webp',
        },
      },
    }).as('finalizeChatImageUpload');

    cy.intercept('POST', '**/api/chat/messages', (req) => {
      expect(req.body.partyId).to.eq(999);
      expect(req.body.imageUrl).to.eq(uploadedChatPath);
      req.reply({
        statusCode: 200,
        body: {
          id: 7001,
          partyId: 999,
          senderId: 123,
          senderName: 'TestUser',
          message: '(사진 전송)',
          imageUrl: uploadedChatPath,
          createdAt: '2026-04-14T12:00:00Z',
        },
      });
    }).as('sendChatMessage');

    cy.visit('/mate/999/chat');
    cy.wait('@getMatchedParty');
    cy.wait('@getChatMessages');

    cy.get('[data-testid="chat-summary-strip"]').within(() => {
      cy.contains('대화 권한').should('be.visible');
      cy.contains('거래 흐름').should('be.visible');
      cy.contains('연결 상태').should('be.visible');
    });
    cy.contains('대화 기록').should('be.visible');

    cy.get('button[aria-label="이미지 업로드"]').should('be.enabled');

    cy.fixture('tiny-image.base64').then((base64) => {
      cy.get('#mate-chat-image-upload').selectFile(
        {
          contents: Cypress.Buffer.from(base64, 'base64'),
          fileName: 'chat.png',
          mimeType: 'image/png',
        },
        { force: true }
      );
    });

    cy.get('img[alt="Preview"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.enabled').click();

    cy.wait('@initChatImageUpload');
    cy.wait('@putChatImageUpload');
    cy.wait('@finalizeChatImageUpload');
    cy.wait('@sendChatMessage');
    cy.get('img[alt="Preview"]').should('not.exist');
  });
});
