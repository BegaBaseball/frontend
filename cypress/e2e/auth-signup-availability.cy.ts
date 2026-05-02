/// <reference types="cypress" />

const requiredPolicies = [
  { policyType: 'TERMS', version: '2026-02-26', required: true },
  { policyType: 'PRIVACY', version: '2026-02-26', required: true },
  { policyType: 'DATA_DISCLAIMER', version: '2026-02-26', required: true },
];

const stubRequiredPolicies = () => {
  cy.intercept('GET', '**/api/auth/policies/required', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        policies: requiredPolicies,
      },
    },
  }).as('requiredPolicies');
};

const fillRequiredSignUpFields = ({
  name = '중복확인유저',
  handle,
  email,
}: {
  name?: string;
  handle: string;
  email: string;
}) => {
  cy.get('input#name').clear().type(name);
  cy.get('input#password').clear().type('Test1234!');
  cy.get('input#confirmPassword').clear().type('Test1234!');
  cy.get('select#favoriteTeam').select('LG 트윈스');
  cy.get('input#handle').clear().type(handle);
  cy.get('input#email').clear().type(email);
};

const getSignUpSubmitButton = () => cy.get('form').find('button[type="submit"]').first();

const setEmailInputValue = (value: string) => {
  cy.get('input#email').then(($input) => {
    const input = $input[0] as HTMLInputElement;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nativeValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

describe('SignUp availability checks', () => {
  beforeEach(() => {
    cy.mockAPI();
  });

  it('checks only valid handle values, keeps submit disabled while checking, and submits canonical values', () => {
    // 이메일 중복 검증은 signup 응답(DUPLICATE_EMAIL)에서만 확인한다.
    let handleCheckCount = 0;

    cy.intercept('GET', '**/api/auth/check-handle*', (req) => {
      handleCheckCount += 1;
      req.alias = 'checkHandleAvailable';
      req.reply({
        delay: 1200,
        statusCode: 200,
        body: {
          success: true,
          data: {
            available: true,
            normalized: '@fresh_slug',
          },
        },
      });
    });

    stubRequiredPolicies();

    cy.intercept('POST', '**/api/auth/signup', (req) => {
      expect(req.body.handle).to.eq('@fresh_slug');
      expect(req.body.email).to.eq('fresh.user@example.com');

      req.reply({
        statusCode: 201,
        body: {
          success: true,
          message: '회원가입이 완료되었습니다.',
        },
      });
    }).as('signupSuccess');

    cy.visit('/signup');

    cy.get('input#handle').clear().type('Invalid-Handle!');
    cy.get('input#email').type('not-an-email');
    cy.wait(650);
    cy.then(() => {
      expect(handleCheckCount).to.eq(0);
    });

    fillRequiredSignUpFields({
      handle: 'Fresh_Slug',
      email: 'Fresh.User@Example.com',
    });

    cy.get('input#handle').should('have.value', '@fresh_slug');

    cy.wait(500);
    cy.contains('핸들 중복 확인 중...').should('be.visible');
    getSignUpSubmitButton().should('be.disabled');

    cy.wait('@checkHandleAvailable');
    cy.contains('사용 가능한 핸들입니다.').should('be.visible');
    getSignUpSubmitButton().should('not.be.disabled').click();

    cy.wait('@requiredPolicies');
    cy.wait('@signupSuccess');
    cy.contains('회원가입 성공!').should('be.visible');
  });

  it('ignores stale handle availability responses and keeps the latest state', () => {
    cy.intercept('GET', '**/api/auth/check-handle*', (req) => {
      const handle = String(req.query.handle ?? '');

      if (handle === '@takenfirst') {
        req.alias = 'staleHandleTaken';
        req.reply({
          delay: 700,
          statusCode: 409,
          body: {
            success: false,
            code: 'HANDLE_UNAVAILABLE',
            message: '이미 사용 중인 핸들입니다.',
            data: {
              available: false,
              normalized: '@takenfirst',
            },
          },
        });
        return;
      }

      if (handle === '@freshfinal') {
        req.alias = 'latestHandleAvailable';
        req.reply({
          delay: 50,
          statusCode: 200,
          body: {
            success: true,
            data: {
              available: true,
              normalized: '@freshfinal',
            },
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            available: true,
            normalized: handle,
          },
        },
      });
    });

    cy.visit('/signup');

    cy.get('input#handle').clear().type('TakenFirst');
    cy.wait(500);
    cy.get('input#handle').clear().type('FreshFinal');
    cy.get('input#handle').should('have.value', '@freshfinal');
    cy.wait(500);

    cy.wait('@latestHandleAvailable');
    cy.wait('@staleHandleTaken');
    cy.contains('사용 가능한 핸들입니다.').should('be.visible');
    cy.contains('이미 사용 중인 핸들입니다.').should('not.exist');
  });

  it('syncs final signup conflicts back into the field availability state', () => {
    cy.intercept('GET', '**/api/auth/check-handle*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          available: true,
          normalized: '@takenlater',
        },
      },
    }).as('checkHandleAvailable');

    stubRequiredPolicies();

    cy.intercept('POST', '**/api/auth/signup', {
      statusCode: 409,
      body: {
        success: false,
        code: 'HANDLE_UNAVAILABLE',
        message: '이미 사용 중인 아이디(@handle)입니다.',
        data: {
          handle: '@takenlater',
        },
      },
    }).as('signupConflict');

    cy.visit('/signup');

    fillRequiredSignUpFields({
      handle: 'TakenLater',
      email: 'TakenLater@Example.com',
    });

    cy.wait('@checkHandleAvailable');
    getSignUpSubmitButton().should('not.be.disabled').click();

    cy.wait('@requiredPolicies');
    cy.wait('@signupConflict');
    cy.contains('회원가입 실패').should('be.visible');
    cy.contains('이미 사용 중인 아이디(@handle)입니다.').should('be.visible');
    getSignUpSubmitButton().should('be.disabled');
  });

  it('keeps duplicate email submissions blocked until the normalized email changes', () => {
    cy.intercept('GET', '**/api/auth/check-handle*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          available: true,
          normalized: '@emailtaken',
        },
      },
    }).as('checkHandleAvailableForEmailConflict');

    stubRequiredPolicies();

    let signupRequestCount = 0;
    cy.intercept('POST', '**/api/auth/signup', (req) => {
      signupRequestCount += 1;
      req.alias = signupRequestCount === 1 ? 'signupEmailConflict' : 'signupRetryAfterEmailChange';

      if (signupRequestCount === 1) {
        expect(req.body.email).to.eq('taken@example.com');
        req.reply({
          statusCode: 409,
          body: {
            success: false,
            code: 'DUPLICATE_EMAIL',
            message: '이미 사용 중인 이메일입니다.',
            data: {
              email: 'taken@example.com',
            },
          },
        });
        return;
      }

      req.reply({
        statusCode: 201,
        body: {
          success: true,
          message: '회원가입이 완료되었습니다.',
        },
      });
    });

    cy.visit('/signup');

    fillRequiredSignUpFields({
      handle: 'EmailTaken',
      email: 'Taken@Example.com',
    });

    cy.wait('@checkHandleAvailableForEmailConflict');
    getSignUpSubmitButton().should('not.be.disabled').click();

    cy.wait('@requiredPolicies');
    cy.wait('@signupEmailConflict');
    cy.contains('회원가입 실패').should('be.visible');
    cy.contains('이미 사용 중인 이메일입니다.').should('be.visible');
    getSignUpSubmitButton().should('be.disabled');

    setEmailInputValue('TAKEN@EXAMPLE.COM');
    cy.get('input#email').should('have.value', 'TAKEN@EXAMPLE.COM');
    cy.contains('이미 사용 중인 이메일입니다.').should('be.visible');
    getSignUpSubmitButton().should('be.disabled');
    cy.then(() => {
      expect(signupRequestCount).to.eq(1);
    });

    cy.get('input#email').clear().type('fresh.email@example.com');
    cy.contains('이미 사용 중인 이메일입니다.').should('not.exist');
    getSignUpSubmitButton().should('not.be.disabled');
  });
});
