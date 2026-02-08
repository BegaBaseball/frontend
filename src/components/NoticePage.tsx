import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, MessageSquare, Heart, ChevronLeft, ChevronRight, RotateCw, PenSquare } from 'lucide-react';
import { Button } from './ui/button';
import { fetchPosts, CheerPost } from '../api/cheerApi';
import { useCheerStore } from '../store/cheerStore';
import { useNavigate } from 'react-router-dom';
import TeamLogo from './TeamLogo';
import { useAuthStore } from '../store/authStore';

const ITEMS_PER_PAGE = 15;

export default function NoticePage() {
  const navigate = useNavigate();
  // const { setSelectedPostId } = useCheerStore();
  const [currentPage, setCurrentPage] = useState(1);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const {
    data: noticeData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['noticePostsPage'],
    queryFn: () => fetchPosts({ postType: 'NOTICE', page: 0, size: 100 }), // Fetch all notices
    staleTime: 1000 * 60 * 5, // 5분
  });

  const posts = useMemo(() => {
    // API에서 공지사항만 가져오지만, 프론트엔드에서도 한 번 더 필터링
    return (noticeData?.content ?? []).filter((post: CheerPost) => post.postType === 'NOTICE');
  }, [noticeData]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
  }, [posts, currentPage]);

  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);

  const handlePostClick = (postId: number) => {
    // setSelectedPostId(postId); // Removed from store, just navigate
    // useCheerStore.getState().fetchPostDetail(postId);
    navigate(`/cheer/${postId}`);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-7 w-7" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>공지사항</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-gray-300"
              disabled={isLoading}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate('/cheer/write')}
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <PenSquare className="mr-2 h-4 w-4" />
                글쓰기
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-xl border bg-white p-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                    <div className="h-3 w-1/3 rounded bg-gray-100" />
                    <div className="h-3 w-2/3 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
            공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center text-gray-500">
            <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold">등록된 공지사항이 없습니다.</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedPosts.map((post: CheerPost) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post.id)}
                className="cursor-pointer rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Megaphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-base">{post.content?.split('\n')[0]?.slice(0, 60) || '공지사항'}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{post.author}</span>
                      <span>•</span>
                      <span>{post.timeAgo}</span>
                      <span className="hidden sm:inline">•</span>
                      <div className="hidden items-center gap-1 sm:flex">
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments}</span>
                      </div>
                      <div className="hidden items-center gap-1 sm:flex">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes}</span>
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
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                })
                .map((page, index, array) => {
                  const isGap = index > 0 && page - array[index - 1] > 1;
                  const isActive = currentPage === page;
                  return (
                    <div key={page} className="flex items-center">
                      {isGap && <span className="mx-1 text-gray-400">...</span>}
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={`w-9 px-0 ${isActive ? 'font-bold' : ''}`}
                        style={isActive ? { backgroundColor: '#2d5f4f', color: 'white', borderColor: '#2d5f4f' } : undefined}
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
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
