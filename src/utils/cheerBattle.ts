import { buildLoginPath } from './loginRedirect';

export const resolveCheerBattleVoteLoginPath = (
  isLoggedIn: boolean,
  currentRelativeUrl?: string | null,
): string | null => {
  if (isLoggedIn) {
    return null;
  }

  return buildLoginPath(currentRelativeUrl);
};
