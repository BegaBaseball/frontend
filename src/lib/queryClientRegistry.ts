let sessionScopedQueryCleanup: (() => void) | null = null;

export const registerSessionScopedQueryCleanup = (cleanup: () => void) => {
  sessionScopedQueryCleanup = cleanup;
};

export const runSessionScopedQueryCleanup = () => {
  sessionScopedQueryCleanup?.();
};
