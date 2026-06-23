let sessionScopedQueryCleanup: (() => void) | null = null;
let userProfileQueryPrimer: ((profile: unknown) => void) | null = null;

export const registerSessionScopedQueryCleanup = (cleanup: () => void) => {
  sessionScopedQueryCleanup = cleanup;
};

export const runSessionScopedQueryCleanup = () => {
  sessionScopedQueryCleanup?.();
};

export const registerUserProfileQueryPrimer = (primer: (profile: unknown) => void) => {
  userProfileQueryPrimer = primer;
};

export const primeUserProfileQuery = (profile: unknown) => {
  userProfileQueryPrimer?.(profile);
};
