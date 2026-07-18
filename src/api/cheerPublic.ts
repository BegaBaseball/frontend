import { normalizeCheerPost, type CheerPost, type PageResponse } from './cheerApi';
import type { components } from './generated/openapi';
import { normalizePageResponseMeta, type PageResponseLike } from '../utils/pageResponsePagination';
import { publicGet } from './publicClient';

type PostSummaryWire = components['schemas']['PostSummaryRes'];
type PostPageResponse = PageResponseLike & { content?: PostSummaryWire[] };

const transformPostPage = (data: PostPageResponse): PageResponse<CheerPost> => {
  const content = Array.isArray(data.content) ? data.content : [];
  const pageMeta = normalizePageResponseMeta(data, content.length);

  return {
    content: content.map(normalizeCheerPost),
    last: pageMeta.last,
    totalPages: pageMeta.totalPages,
    totalElements: pageMeta.totalElements,
    size: pageMeta.size,
    number: pageMeta.number,
  };
};

export async function fetchUserPostsByHandle(handle: string, page = 0, size = 20): Promise<PageResponse<CheerPost>> {
  const routeHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  const response = await publicGet<PostPageResponse>(`/cheer/user/${encodeURIComponent(routeHandle)}/posts`, {
    params: { page, size },
  });
  return transformPostPage(response);
}
