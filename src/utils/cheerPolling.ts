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
