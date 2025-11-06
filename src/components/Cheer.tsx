import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Heart, Flame, PenSquare, RotateCw, Info } from 'lucide-react';
import { Button } from './ui/button';
import ChatBot from './ChatBot';
import Navbar from './Navbar';
import TeamLogo from './TeamLogo';
import { listPosts } from '../api/cheer';
import { useCheerStore } from '../store/cheerStore';
import { useNavigationStore } from '../store/navigationStore';
import { useAuthStore } from '../store/authStore';

type TabType = 'all' | 'myTeam';

export default function Cheer() {
  const {
    activeTab,
    posts,
    setActiveTab,
    setPosts,
    setSelectedPostId,
  } = useCheerStore();
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const favoriteTeam = useAuthStore((state) => state.user?.favoriteTeam ?? null);

  const teamFilter = activeTab === 'myTeam' ? favoriteTeam ?? undefined : undefined;

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['cheerPosts', activeTab, teamFilter ?? 'all'],
    queryFn: () => listPosts(teamFilter),
    enabled: !(activeTab === 'myTeam' && !favoriteTeam),
  });

  useEffect(() => {
    if (data?.content) {
      setPosts(data.content);
    } else if (activeTab === 'myTeam' && !favoriteTeam) {
      setPosts([]);
    }
  }, [data, setPosts, activeTab, favoriteTeam]);

  const displayedPosts = useMemo(() => {
    if (activeTab === 'all' || !favoriteTeam) {
      return posts;
    }
    return posts.filter((post) => {
      if (post.teamId) {
        return post.teamId === favoriteTeam;
      }
      return post.team === favoriteTeam;
    });
  }, [activeTab, posts, favoriteTeam]);

  const hotPosts = useMemo(() => {
    if (activeTab === 'all' || !favoriteTeam) {
      return posts.filter((post) => post.isHot);
    }
    return posts.filter((post) => {
      const matchesTeam = post.teamId ? post.teamId === favoriteTeam : post.team === favoriteTeam;
      return post.isHot && matchesTeam;
    });
  }, [activeTab, posts, favoriteTeam]);

  const handlePostClick = (postId: number) => {
    setSelectedPostId(postId);
    setCurrentView('cheerDetail', { postId });
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="cheer" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-7 w-7" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>응원게시판</h1>
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
            <Button
              onClick={() => setCurrentView('cheerWrite')}
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
          <div className="lg:col-span-2">
            <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
              {activeTab === 'all' ? '전체 게시물' : '마이팀 게시물'}
            </h2>

            {isError && (
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

            <div className="space-y-4">
              {displayedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="cursor-pointer rounded-xl border bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                        <TeamLogo team={post.team} size={40} />
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-base">{post.title}</h3>
                        {post.isHot && (
                          <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                            <Flame className="h-3 w-3" />
                            HOT
                          </span>
                        )}
                      </div>

                      <div className="mb-2 text-sm text-gray-500">{post.author}</div>

                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{post.timeAgo}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!isLoading && !isError && displayedPosts.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-gray-500">
                  게시글이 없습니다.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div 
              className="rounded-2xl p-4 border-2 sticky top-24 bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
            >
              <h2 className="mb-4 flex items-center gap-2 text-red-500">
                <Flame className="w-5 h-5" />
                {activeTab === 'all' ? 'HOT 게시물' : '마이팀 HOT 게시물'}
              </h2>
              <div className="space-y-3">
                {hotPosts.slice(0, 5).map((post) => (
                  <div
                    key={`hot-${post.id}`}
                    onClick={() => handlePostClick(post.id)}
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
                  <div className="text-center py-8 text-gray-500">
                    <Flame className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">
                      {activeTab === 'myTeam' ? '마이팀 HOT 게시물이 없습니다' : 'HOT 게시물이 없습니다'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <ChatBot />
          </aside>
        </div>
      </div>
    </div>
  );
}

