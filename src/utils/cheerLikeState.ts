import type { InfiniteData } from '@tanstack/react-query';

import type { CheerPost, PageResponse } from '../api/cheerApi';

type CheerContentPage = {
  content: CheerPost[];
};

export type CheerInfiniteData = InfiniteData<PageResponse<CheerPost>>;

export const resolveCheerLikeActionPostId = (post: CheerPost): number =>
  post.originalPost?.id ?? post.repostOfId ?? post.id;

export const resolveCheerLikeDisplayCount = (post: CheerPost): number =>
  post.originalPost?.id
    ? (post.originalPost.likeCount ?? post.likeCount ?? 0)
    : (post.likeCount ?? 0);

export const isEmbeddedCheerLikeTargetMatch = (post: CheerPost, targetPostId: number): boolean =>
  post.originalPost?.id === targetPostId || post.repostOfId === targetPostId;

export const isCheerLikeTargetMatch = (post: CheerPost, targetPostId: number): boolean =>
  post.id === targetPostId || isEmbeddedCheerLikeTargetMatch(post, targetPostId);

export const applyCheerLikeState = (
  post: CheerPost,
  targetPostId: number,
  liked: boolean,
  likeCount: number,
): CheerPost => {
  if (post.id === targetPostId) {
    return {
      ...post,
      likeCount,
      liked,
    };
  }

  if (!isEmbeddedCheerLikeTargetMatch(post, targetPostId)) {
    return post;
  }

  return {
    ...post,
    likeCount,
    liked,
    originalPost: post.originalPost
      ? {
          ...post.originalPost,
          likeCount,
        }
      : post.originalPost,
  };
};

export const buildOptimisticCheerLikeState = (
  post: CheerPost,
  targetPostId: number,
): CheerPost => {
  const nextLiked = !Boolean(post.liked);
  const currentLikeCount = resolveCheerLikeDisplayCount(post);
  const nextLikeCount = Math.max(0, currentLikeCount + (nextLiked ? 1 : -1));

  return applyCheerLikeState(post, targetPostId, nextLiked, nextLikeCount);
};

export const applyCheerLikeStateToContentPage = <T extends CheerContentPage>(
  data: T | undefined,
  targetPostId: number,
  liked: boolean,
  likeCount: number,
): T | undefined => {
  if (!data?.content) {
    return data;
  }

  return {
    ...data,
    content: data.content.map((post) =>
      isCheerLikeTargetMatch(post, targetPostId)
        ? applyCheerLikeState(post, targetPostId, liked, likeCount)
        : post,
    ),
  };
};

export const buildOptimisticCheerLikeStateInContentPage = <T extends CheerContentPage>(
  data: T | undefined,
  targetPostId: number,
): T | undefined => {
  if (!data?.content) {
    return data;
  }

  return {
    ...data,
    content: data.content.map((post) =>
      isCheerLikeTargetMatch(post, targetPostId)
        ? buildOptimisticCheerLikeState(post, targetPostId)
        : post,
    ),
  };
};

export const applyCheerLikeStateToInfiniteData = (
  data: CheerInfiniteData | undefined,
  targetPostId: number,
  liked: boolean,
  likeCount: number,
): CheerInfiniteData | undefined => {
  if (!data?.pages) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) =>
      applyCheerLikeStateToContentPage(page, targetPostId, liked, likeCount) ?? page,
    ),
  };
};

export const buildOptimisticCheerLikeStateInInfiniteData = (
  data: CheerInfiniteData | undefined,
  targetPostId: number,
): CheerInfiniteData | undefined => {
  if (!data?.pages) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) =>
      buildOptimisticCheerLikeStateInContentPage(page, targetPostId) ?? page,
    ),
  };
};
