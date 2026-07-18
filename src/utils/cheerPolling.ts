export interface PostChangesQueryParams {
  sinceId?: number | null;
  teamId?: string | null;
}

export interface PostWithId {
  id: number;
}

export const buildPostChangesQuery = (params: PostChangesQueryParams = {}): string => {
  const { sinceId, teamId } = params;
  const searchParams = new URLSearchParams();

  if (typeof sinceId === 'number' && Number.isFinite(sinceId)) {
    searchParams.append('sinceId', sinceId.toString());
  }
  if (teamId && teamId !== 'all') {
    searchParams.append('teamId', teamId);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const resolveLatestVisiblePostId = (posts: PostWithId[]): number | null => {
  if (!posts.length) return null;

  const positiveIds = posts
    .map((post) => post.id)
    .filter((id) => typeof id === 'number' && id > 0);

  if (!positiveIds.length) return null;
  return Math.max(...positiveIds);
};

export const advanceCheerPollingCursor = (
  currentCursor: number | null,
  responseCursor: number | null,
): number | null => {
  const validCurrent = typeof currentCursor === 'number' && Number.isFinite(currentCursor)
    ? currentCursor
    : null;
  const validResponse = typeof responseCursor === 'number' && Number.isFinite(responseCursor)
    ? responseCursor
    : null;

  if (validCurrent === null) return validResponse;
  if (validResponse === null) return validCurrent;
  return Math.max(validCurrent, validResponse);
};

export const accumulateCheerPollingCount = (currentCount: number, chunkCount: number): number => {
  const safeCurrent = Number.isFinite(currentCount) ? Math.max(0, currentCount) : 0;
  const safeChunk = Number.isFinite(chunkCount) ? Math.max(0, chunkCount) : 0;
  return safeCurrent + safeChunk;
};
