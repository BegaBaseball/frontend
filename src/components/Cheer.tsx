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
const ITEMS_PER_PAGE = 10; // 페이지당 게시글 수

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

  // 페이징을 위한 로컬 상태
  const [currentPage, setCurrentPage] = useState(1);

  const teamFilter = activeTab === 'myTeam' ? favoriteTeam ?? undefined : undefined;

  // 메인 게시글 fetching (일반 응원글 or 공지사항)
  const {
    data: cheerData,
    isLoading: isCheerLoading,
    isError: isCheerError,
    refetch: refetchCheer,
  } = useQuery({
    queryKey: ['cheerPosts', activeTab, teamFilter ?? 'all'],
    queryFn: () => {
      if (activeTab === 'notice') {
        return listPosts(undefined, 0, 100, 'NOTICE'); // 공지사항만
      }
      return listPosts(teamFilter, 0, 100, 'NORMAL'); // 일반 게시글만
    },
    enabled: !(activeTab === 'myTeam' && !favoriteTeam),
  });

  // 사이드바 공지사항 fetching
  const { data: noticeData, isLoading: isNoticeLoading } = useQuery({
    queryKey: ['sidebarNoticePosts'],
    queryFn: () => listPosts(undefined, 0, 5, 'NOTICE'),
    staleTime: 1000 * 60 * 1, // 1분으로 단축
    enabled: activeTab !== 'notice', // 공지사항 탭이 아닐 때만
  });

  useEffect(() => {
    if (cheerData?.content) {
      if (activeTab === 'notice') {
        setPosts(cheerData.content);
      } else {
        // 'all' 또는 'myTeam' 탭에서는 공지사항을 제외하고 필터링
        setPosts(cheerData.content.filter(p => p.postType !== 'NOTICE'));
      }
    } else if (activeTab === 'myTeam' && !favoriteTeam) {
      setPosts([]);
    }
    setCurrentPage(1);
  }, [cheerData, setPosts, activeTab, favoriteTeam]);

  const isLoading = isCheerLoading;

  // 1. 탭/팀 필터링된 전체 게시글
  const displayedPosts = useMemo(() => {
    if (activeTab === 'notice') {
      return posts;
    }
    if (activeTab === 'all' || !favoriteTeam) {
      return posts.filter(p => p.postType !== 'NOTICE');
    }
    return posts.filter((post) => {
      if (post.teamId) {
        return post.teamId === favoriteTeam && post.postType !== 'NOTICE';
      }
      return post.team === favoriteTeam && post.postType !== 'NOTICE';
    });
  }, [activeTab, posts, favoriteTeam]);

  // 2. 페이징 처리된 게시글 (현재 페이지에 보여줄 것만 자름)
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedPosts.slice(startIndex, endIndex);
  }, [displayedPosts, currentPage]);

  // 총 페이지 수 계산
  const totalPages = Math.ceil(displayedPosts.length / ITEMS_PER_PAGE);

  // 3. HOT 게시글 (이제 cheerData 기반으로)
  const hotPosts = useMemo(() => {
    const sourcePosts = cheerData?.content ?? [];
    if (activeTab === 'all' || !favoriteTeam) {
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
    setCurrentPage(1); // 탭 변경 시 1페이지로 이동
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 변경 시 상단으로 스크롤
  };

  return (
    <div className="min-h-screen bg-white">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-7 w-7" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>응원게시판</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetchCheer()}
              variant="outline"
              className="border-gray-300"
              disabled={isLoading}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button
              onClick={() => navigate('/cheer/write')}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <PenSquare className="mr-2 h-4 w-4" />
              글쓰기
            </Button>
          </div>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => handleTabChange('all')}
            className="rounded-full px-6 py-2 transition-all"
            style={{
              backgroundColor: activeTab === 'all' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'all' ? 'white' : '#6b7280',
            }}
          >
            전체
          </button>

          <button
            onClick={() => handleTabChange('myTeam')}
            className="rounded-full px-6 py-2 transition-all"
            style={{
              backgroundColor: activeTab === 'myTeam' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'myTeam' ? 'white' : '#6b7280',
            }}
          >
            마이팀
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* 메인 게시글 목록 영역 */}
          <div className="lg:col-span-2">
            
            {isCheerError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
              </div>
            )}

            {activeTab === 'myTeam' && !favoriteTeam && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  응원구단을 설정하지 않으셨습니다. 마이팀 게시물은 <span className="font-semibold">내 정보 &gt; 응원구단</span>에서 팀을 선택한 후 확인할 수 있어요.
                </div>
              </div>
            )}

            {isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-xl border bg-white p-4">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-1/2 rounded bg-gray-200" />
                        <div className="h-3 w-1/3 rounded bg-gray-100" />
                        <div className="h-3 w-2/3 rounded bg-gray-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 게시글 리스트 */}
            <div className="space-y-3">
              {paginatedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  // [수정 1] px-5 -> px-8 (32px) : 좌우 여백을 대폭 늘려 확실하게 안쪽으로 배치
                  // [수정 2] py-4 -> py-5 : 상하 여백도 살짝 늘려 답답함 해소
                  className="cursor-pointer rounded-xl border bg-white px-8 py-5 transition-shadow hover:shadow-md"
                >
                  {/* 전체 컨테이너 */}
                  {/* [수정 3] gap-4 -> gap-8 (32px) : 로고와 제목 사이를 시원하게 띄움 */}
                  <div className="flex items-center gap-8">
                    
                    {/* [좌측] 팀 로고 (항상 고정) */}
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                        <TeamLogo team={post.team} size={36} />
                      </div>
                    </div>

                    {/* [중앙 & 우측] 콘텐츠 영역 */}
                    {/* 강제 가로 배치 (flex-row) 유지 */}
                    <div className="flex-1 min-w-0 flex flex-row items-center justify-between">
                      
                      {/* [중앙] 제목 영역 (남는 공간 모두 차지 flex-1) */}
                      {/* [수정 4] pr-6 -> pr-8 : 제목과 우측 정보 사이 간격도 확보 */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2">
                          {post.isHot && (
                            <span className="flex-shrink-0 flex items-center gap-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                              <Flame className="h-3 w-3 flex-shrink-0" fill="currentColor" />
                              <span className="pb-[1px]">HOT</span>
                            </span>
                          )}
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {post.title}
                          </h3>
                        </div>
                      </div>

                      {/* [우측] 정보 영역 */}
                      {/* 강제 우측 정렬 유지 */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-gray-500">
                        
                        {/* 1번째 줄: 닉네임 */}
                        <span className="font-medium text-gray-700 text-sm text-right max-w-[120px] truncate">
                          {post.author}
                        </span>

                        {/* 2번째 줄: 시간 | 댓글 | 좋아요 */}
                        <div className="flex items-center gap-3">
                          <span>{post.timeAgo}</span>
                          <span className="text-gray-300">|</span>
                          
                          <div className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{post.comments}</span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-red-500 transition-colors">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{post.likes}</span>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              ))}

              {!isLoading && !isCheerError && displayedPosts.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-gray-500">
                  게시글이 없습니다.
                </div>
              )}
            </div>

            {/* --- Pagination Controls --- */}
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
                          {isGap && <span className="mx-1 text-gray-400">...</span>}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`w-9 px-0 ${
                              isActive 
                                ? 'font-bold hover:opacity-90' 
                                : 'text-gray-600 hover:bg-gray-100'
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
          
          {/* 사이드바 영역 */}
          <aside className="space-y-6">
            
            {/* HOT 게시물 */}
            <div 
              className="rounded-2xl p-4 border-2 bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
            >
              <h2 className="mb-4 flex items-center gap-2 text-red-500 font-bold">
                <Flame className="w-5 h-5" />
                {activeTab === 'all' ? 'HOT 게시물' : '마이팀 HOT'}
              </h2>
              <div className="space-y-3">
                {hotPosts.slice(0, 5).map((post) => (
                  <div
                    key={`hot-${post.id}`}
                    onClick={() => navigate(`/cheer/detail/${post.id}`)}
                    className="bg-white rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer border border-red-100"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{post.team}</span>
                      <span>{post.timeAgo}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">{post.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
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
                  <div className="text-center py-4 text-gray-400 text-sm">
                    HOT 게시물이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 공지사항 영역 - 공지사항 탭이 아닐 때만 표시 */}
            {activeTab !== 'notice' && (
              <div 
                className="rounded-2xl p-4 border-2 bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 sticky top-24"
              >
              <Link to="/notice">
                <h2 className="mb-4 flex items-center gap-2 text-blue-600 font-bold">
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
                    className="bg-white rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer border border-blue-100"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="text-blue-600 font-medium">Notice</span>
                      <span>{post.timeAgo}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">{post.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
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
                  <div className="text-center py-8 text-gray-500">
                    <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
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