import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageSquare, Heart, Flame, PenSquare, RotateCw, Info, 
  ChevronLeft, ChevronRight, Megaphone 
} from 'lucide-react';
import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import { listPosts } from '../api/cheer';
import { useCheerStore, Post } from '../store/cheerStore';
import { useAuthStore } from '../store/authStore';
import { Link, useNavigate } from 'react-router-dom';

type TabType = 'all' | 'notice' | 'myTeam';
const ITEMS_PER_PAGE = 10;

export default function Cheer() {
  const {
    activeTab,
    posts,
    setActiveTab,
    setPosts,
    setSelectedPostId,
  } = useCheerStore();
  const navigate = useNavigate();
  const favoriteTeam = useAuthStore((state) => state.user?.favoriteTeam ?? null);

  const [currentPage, setCurrentPage] = useState(1);

  const teamFilter = useMemo(() => {
    if (activeTab !== 'myTeam') return undefined;
    if (!favoriteTeam || favoriteTeam === '없음') return undefined;
    return favoriteTeam;
  }, [activeTab, favoriteTeam]);

  // 메인 게시글 fetching
  const {
    data: cheerData,
    isLoading: isCheerLoading,
    isError: isCheerError,
    refetch: refetchCheer,
  } = useQuery({
    queryKey: ['cheerPosts', activeTab, teamFilter ?? 'all'],
    queryFn: () => {
      if (activeTab === 'notice') {
        return listPosts(undefined, 0, 100, 'NOTICE');
      }
      return listPosts(teamFilter, 0, 100, 'NORMAL');
    },
    enabled: !(activeTab === 'myTeam' && (!favoriteTeam || favoriteTeam === '없음')),
  });

  // 사이드바 공지사항 fetching
  const { data: noticeData, isLoading: isNoticeLoading } = useQuery({
    queryKey: ['sidebarNoticePosts'],
    queryFn: () => listPosts(undefined, 0, 5, 'NOTICE'),
    staleTime: 1000 * 60 * 1,
    enabled: activeTab !== 'notice',
  });

  useEffect(() => {
    if (cheerData?.content) {
      if (activeTab === 'notice') {
        setPosts(cheerData.content);
      } else {
        setPosts(cheerData.content.filter(p => p.postType !== 'NOTICE'));
      }
    } else if (activeTab === 'myTeam' && (!favoriteTeam || favoriteTeam === '없음')) { // ✅ 수정 3
      setPosts([]);
    }
    setCurrentPage(1);
  }, [cheerData, setPosts, activeTab, favoriteTeam]);

  const isLoading = isCheerLoading;

  const displayedPosts = useMemo(() => {
    if (activeTab === 'notice') {
      return posts;
    }
    if (activeTab === 'all' || !favoriteTeam || favoriteTeam === '없음') {
      return posts.filter(p => p.postType !== 'NOTICE');
    }
    return posts.filter((post) => {
      if (post.teamId) {
        return post.teamId === favoriteTeam && post.postType !== 'NOTICE';
      }
      return post.team === favoriteTeam && post.postType !== 'NOTICE';
    });
  }, [activeTab, posts, favoriteTeam]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedPosts.slice(startIndex, endIndex);
  }, [displayedPosts, currentPage]);

  const totalPages = Math.ceil(displayedPosts.length / ITEMS_PER_PAGE);

  const hotPosts = useMemo(() => {
    const sourcePosts = cheerData?.content ?? [];
    if (activeTab === 'all' || !favoriteTeam || favoriteTeam === '없음') {
      return sourcePosts.filter((post) => post.isHot);
    }
    return sourcePosts.filter((post) => {
      const matchesTeam = post.teamId ? post.teamId === favoriteTeam : post.team === favoriteTeam;
      return post.isHot && matchesTeam;
    });
  }, [activeTab, cheerData, favoriteTeam]);

  const handlePostClick = (postId: number) => {
    setSelectedPostId(postId);
    navigate(`/cheer/detail/${postId}`);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#2d5f4f' }} />
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#2d5f4f' }}>응원게시판</h1>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
            <Button
              onClick={() => refetchCheer()}
              variant="outline"
              className="flex-1 sm:flex-none border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              disabled={isLoading}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button
              onClick={() => navigate('/cheer/write')}
              className="flex-1 sm:flex-none text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <PenSquare className="mr-2 h-4 w-4" />
              글쓰기
            </Button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => handleTabChange('all')}
            className={`whitespace-nowrap rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base transition-all ${
              activeTab === 'all'
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            style={activeTab === 'all' ? { backgroundColor: '#2d5f4f' } : undefined}
          >
            전체
          </button>

          <button
            onClick={() => handleTabChange('myTeam')}
            className={`whitespace-nowrap rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base transition-all ${
              activeTab === 'myTeam'
                ? 'text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            style={activeTab === 'myTeam' ? { backgroundColor: '#2d5f4f' } : undefined}
          >
            마이팀
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            
            {isCheerError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
              </div>
            )}

            {activeTab === 'myTeam' && (!favoriteTeam || favoriteTeam === '없음') && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  응원구단을 설정하지 않으셨습니다. 마이팀 게시물은 <Link to="/mypage" className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-300">마이페이지</Link>에서 팀을 선택한 후 확인할 수 있어요.
                </div>
              </div>
            )}

            {isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-600" />
                        <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {paginatedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-8 py-4 sm:py-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4 sm:gap-8">

                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                        <TeamLogo team={post.team} size={30} className="sm:w-9 sm:h-9" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">

                      <div className="flex-1 min-w-0 pr-0 sm:pr-8">
                        <div className="flex items-center gap-2">
                          {post.isHot && (
                            <span className="flex-shrink-0 flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-none text-white">
                              <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" fill="currentColor" />
                              <span className="pb-[1px]">HOT</span>
                            </span>
                          )}
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                            {post.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">

                        <span className="font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm text-right max-w-[120px] truncate">
                          {post.author}
                        </span>

                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-[10px] sm:text-xs">{post.timeAgo}</span>
                          <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>

                          <div className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{post.comments}</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                            <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{post.likes}</span>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              ))}

              {!isLoading && !isCheerError && displayedPosts.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  게시글이 없습니다.
                </div>
              )}
            </div>

            {!isLoading && !isCheerError && displayedPosts.length > 0 && (
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
                   .filter(page => {
                      return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                   })
                   .map((page, index, array) => {
                      const isGap = index > 0 && page - array[index - 1] > 1;
                      const isActive = currentPage === page;

                      return (
                        <div key={page} className="flex items-center">
                          {isGap && <span className="mx-1 text-gray-400 dark:text-gray-600">...</span>}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`w-9 px-0 ${
                              isActive
                                ? 'font-bold hover:opacity-90'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            style={isActive ? {
                              backgroundColor: '#2d5f4f',
                              color: '#ffffff',
                              borderColor: '#2d5f4f'
                            } : undefined}
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
          
          <aside className="space-y-6">

            <div
              className="rounded-2xl p-4 border-2 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800"
            >
              <h2 className="mb-4 flex items-center gap-2 text-red-500 dark:text-red-400 font-bold">
                <Flame className="w-5 h-5" />
                {activeTab === 'all' ? 'HOT 게시물' : '마이팀 HOT'}
              </h2>
              <div className="space-y-3">
                {hotPosts.slice(0, 5).map((post) => (
                  <div
                    key={`hot-${post.id}`}
                    onClick={() => navigate(`/cheer/detail/${post.id}`)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer border border-red-100 dark:border-red-900"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{post.team}</span>
                      <span>{post.timeAgo}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{post.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes}
                      </span>
                    </div>
                  </div>
                ))}
                 {hotPosts.length === 0 && (
                  <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                    HOT 게시물이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {activeTab !== 'notice' && (
              <div
                className="rounded-2xl p-4 border-2 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 border-blue-200 dark:border-blue-800 sticky top-24"
              >
              <Link to="/notice">
                <h2 className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                  <Megaphone className="w-5 h-5" />
                  공지사항
                </h2>
              </Link>
              <div className="space-y-3">
                {(noticeData?.content ?? [])
                  .filter((post) => post.postType === 'NOTICE')
                  .slice(0, 5)
                  .map((post) => (
                  <div
                    key={`notice-${post.id}`}
                    onClick={() => navigate(`/cheer/detail/${post.id}`)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer border border-blue-100 dark:border-blue-900"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Notice</span>
                      <span>{post.timeAgo}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{post.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes}
                      </span>
                    </div>
                  </div>
                ))}

                {!isNoticeLoading && (
                   (!noticeData || noticeData.content.filter(p => p.postType === 'NOTICE').length === 0)
                ) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">
                      등록된 공지사항이 없습니다.
                    </p>
                  </div>
                )}
              </div>
              </div>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
}