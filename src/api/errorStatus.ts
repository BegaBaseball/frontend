export const getApiErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null;
  }

  const status = Number((error as { status: number | string }).status);
  return Number.isNaN(status) ? null : status;
};
