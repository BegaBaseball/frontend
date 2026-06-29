describe('Cypress Docker runner smoke', () => {
  it('starts the Docker Cypress runtime and reaches the configured baseUrl', () => {
    expect(Cypress.config('baseUrl')).to.be.a('string').and.not.be.empty;

    cy.request('/').its('status').should('be.within', 200, 499);
  });
});
