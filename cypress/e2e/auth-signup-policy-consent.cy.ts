describe('SignUp policy consent payload', () => {
  it('includes required policy consents when signing up', () => {
    const requiredPolicies = [
      {
        policyType: 'TERMS',
        version: '2026-02-26',
        path: '/terms',
        required: true,
        effectiveDate: '2026-02-26',
      },
      {
        policyType: 'PRIVACY',
        version: '2026-02-26',
        path: '/privacy',
        required: true,
        effectiveDate: '2026-02-26',
      },
      {
        policyType: 'DATA_DISCLAIMER',
        version: '2026-02-26',
        path: '/data-disclaimer',
        required: true,
        effectiveDate: '2026-02-26',
      },
    ];

    cy.intercept('GET', '**/api/auth/check-handle*', {
      statusCode: 200,
      body: { success: true, data: { available: true } },
    }).as('handleCheck');

    cy.intercept('GET', '**/api/auth/policies/required', {
      statusCode: 200,
      body: {
        success: true,
        message: '필수 정책 목록 조회 성공',
        data: {
          policies: requiredPolicies,
          gracePeriodDays: 14,
          effectiveDate: '2026-02-26',
          hardGateDate: '2026-03-12',
        },
      },
    }).as('requiredPolicies');

    cy.intercept('POST', '**/api/auth/signup', (req) => {
      expect(req.body.policyConsents).to.deep.equal([
        { policyType: 'TERMS', version: '2026-02-26', agreed: true },
        { policyType: 'PRIVACY', version: '2026-02-26', agreed: true },
        { policyType: 'DATA_DISCLAIMER', version: '2026-02-26', agreed: true },
      ]);

      req.reply({
        statusCode: 201,
        body: {
          success: true,
          message: '회원가입이 완료되었습니다.',
        },
      });
    }).as('signup');

    cy.visit('/signup');

    cy.get('input#name').type('테스트유저');
    cy.get('input#handle').clear().type('spolicy1');
    cy.wait('@handleCheck');
    cy.get('input#email').type('signup_policy_user@example.com');
    cy.get('input#password').type('Test1234!');
    cy.get('input#confirmPassword').type('Test1234!');

    cy.get('select#favoriteTeam').select('LG 트윈스');

    cy.contains('button', '회원가입').click();

    cy.wait('@requiredPolicies');
    cy.wait('@signup');
    cy.contains('회원가입 성공!').should('be.visible');
  });
});
