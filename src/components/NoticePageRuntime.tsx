import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchNoticePosts } from '../api/noticePublic';
import type { CheerPost } from '../api/cheerApi';
import { isAdminRole, useAuthProfileSnapshot } from '../store/authStore';
import {
  NoticeChevronLeftIcon as ChevronLeftIcon,
  NoticeChevronRightIcon as ChevronRightIcon,
  NoticeHeartIcon as HeartIcon,
  NoticeMegaphoneIcon as MegaphoneIcon,
  NoticeMessageSquareIcon as MessageSquareIcon,
  NoticePenSquareIcon as PenSquareIcon,
  NoticeRefreshIcon as RefreshIcon,
} from './icons/NoticePageIcons';
import { Button } from './ui/button';

const ITEMS_PER_PAGE = 15;

export default function NoticePageRuntime() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const { userRole } = useAuthProfileSnapshot();
  const isAdmin = isAdminRole(userRole);

  const {
    data: noticeData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['noticePostsPage'],
    queryFn: () => fetchNoticePosts(0, 100),
    staleTime: 1000 * 60 * 5,
  });

  const posts = useMemo(() => {
    return (noticeData?.content ?? []).filter((post: CheerPost) => post.postType === 'NOTICE');
  }, [noticeData]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
  }, [posts, currentPage]);

  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);

  const handlePostClick = (postId: number) => {
    navigate(`/cheer/${postId}`);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MegaphoneIcon className="h-7 w-7 text-primary" />
            <h1 className="text-primary">공지사항</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-gray-300 dark:border-border dark:text-white dark:hover:bg-secondary"
              disabled={isLoading}
            >
              <RefreshIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate('/cheer/write')}
                className="bg-primary text-white"
              >
                <PenSquareIcon className="mr-2 h-4 w-4" />
                글쓰기
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-xl border border-border/80 p-4 dark:border-border dark:bg-card">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-secondary" />
                    <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-secondary" />
                    <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-white/10 dark:text-white">
            <MegaphoneIcon className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-white" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">등록된 공지사항이 없습니다.</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedPosts.map((post: CheerPost) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post.id)}
                className="cursor-pointer rounded-xl border border-border/80 bg-white p-4 transition-shadow hover:shadow-md dark:border-border dark:bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <MegaphoneIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-base text-zinc-900 dark:text-white">
                      {post.content?.split('\n')[0]?.slice(0, 60) || '공지사항'}
                    </h3>
                    <div className="flex items-center gap-3 text-body text-gray-500 dark:text-white">
                      <span>{post.author}</span>
                      <span>•</span>
                      <span>{post.timeAgo}</span>
                      <span className="hidden sm:inline">•</span>
                      <div className="hidden items-center gap-1 sm:flex">
                        <MessageSquareIcon className="h-4 w-4" />
                        <span>{post.commentCount}</span>
                      </div>
                      <div className="hidden items-center gap-1 sm:flex">
                        <HeartIcon className="h-4 w-4" />
                        <span>{post.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 px-0"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, index, array) => {
                  const isGap = index > 0 && page - array[index - 1] > 1;
                  const isActive = currentPage === page;
                  return (
                    <div key={page} className="flex items-center">
                      {isGap && <span className="mx-1 text-gray-400 dark:text-white">...</span>}
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={`w-9 px-0 ${isActive ? 'border-primary bg-primary font-bold text-white' : ''}`}
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-9 px-0"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
