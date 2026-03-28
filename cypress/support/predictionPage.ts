export interface PredictionPathGame {
  gameId: string;
  gameDate: string;
}

export const buildDefaultPredictionPath = (games: PredictionPathGame[]): string => {
  const firstGame = games[0];
  if (!firstGame) {
    return '/prediction';
  }

  const params = new URLSearchParams({
    gameId: firstGame.gameId,
    date: firstGame.gameDate,
  });

  return `/prediction?${params.toString()}`;
};

export const ensureCoachBriefingVisible = () => {
  cy.get('body').then(($body) => {
    const hasCoachBriefing = $body.find('[data-testid="coach-briefing-title"]').length > 0;
    if (hasCoachBriefing) {
      return;
    }

    const detailButton = [...$body.find('button')].find((button) => (
      button.textContent?.includes('경기 상세 보기')
    ));

    if (detailButton) {
      cy.wrap(detailButton).click({ force: true });
    }
  });

  cy.get('[data-testid="coach-briefing-title"]', { timeout: 20000 }).should('exist');
  cy.get('[data-testid="coach-briefing-card"]').scrollIntoView().should('be.visible');
};
