interface MountedRoot {
  unmount: () => void;
}

interface NavigationHarnessModule {
  mountCheerLinkedContentNavigationHarness: (container: Element) => MountedRoot;
}

describe('linked cheer navigation ownership', () => {
  let root: MountedRoot | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
  });

  it('lets the embedded QUOTE recruitment CTA child target own /mate/42 without competing /cheer/:id navigation', () => {
    let defaultTarget = '';

    cy.visit('/__cheer-linked-content-test');
    cy.window().then(async (window) => {
      const loadHarness = new window.Function(
        'return import("/cypress/support/cheerLinkedContentNavigationHarness.tsx")',
      ) as () => Promise<NavigationHarnessModule>;
      const harness = await loadHarness();
      const container = window.document.createElement('main');
      window.document.body.replaceChildren(container);
      window.document.addEventListener('click', (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]');
        if (!link) return;
        defaultTarget = link.getAttribute('href') ?? '';
        event.preventDefault();
      }, { capture: true });

      root = harness.mountCheerLinkedContentNavigationHarness(container);
    });

    cy.get('a[href="/mate/42"]').should('contain.text', '파티 보기').then(($link) => {
      const childTarget = $link[0].ownerDocument.createElement('span');
      childTarget.textContent = 'CTA child';
      $link[0].appendChild(childTarget);
      cy.wrap(childTarget).click();
    });

    cy.then(() => expect(defaultTarget).to.equal('/mate/42'));
    cy.get('[data-testid="router-location"]').should('have.text', '/quote');
  });
});
