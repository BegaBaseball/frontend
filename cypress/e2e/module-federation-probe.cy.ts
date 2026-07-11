/// <reference types="cypress" />

describe('Module Federation design system probe', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('/api/**', {
      statusCode: 204,
      body: {},
    });
  });

  it('renders the design_system contract for the configured host mode', () => {
    cy.visit('/internal/module-federation-design-system');

    cy.contains('h1', 'Design System Remote Probe').should('be.visible');
    cy.env<Record<string, unknown>>(['EXPECT_MF_REMOTE']).then((runtimeEnv) => {
      const value = runtimeEnv?.EXPECT_MF_REMOTE;
      const expectsRemoteEntry = value === true || value === 'true';

      if (expectsRemoteEntry) {
        cy.contains('Remote entry is configured. The design_system modules are loaded through Module Federation.')
          .should('be.visible');
        cy.contains('Remote entry is unset.').should('not.exist');
        return;
      }

      cy.contains('Remote entry is unset. This route is using the local design_system fallback aliases.')
        .should('be.visible');
    });
    cy.contains('Remote Button').should('be.visible');
    cy.contains('button', 'Open Remote Modal').should('be.visible').click();
    cy.contains('Design system modal').should('be.visible');
    cy.contains('The host imports this dialog from design_system/Modal.').should('be.visible');
  });
});
