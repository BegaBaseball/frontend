import { MessageSquare, Heart, Flame, PenSquare } from 'lucide-react';
import { Button } from './ui/button';
import ChatBot from './ChatBot';
import Navbar from './Navbar';
import TeamLogo from './TeamLogo';
import { useCheerStore } from '../store/cheerStore';
import { useNavigationStore } from '../store/navigationStore';
import { useAuthStore } from '../store/authStore';

export default function Cheer() {
  const { activeTab, posts, setActiveTab, setSelectedPost } = useCheerStore();
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const myTeam = useAuthStore((state) => state.user?.favoriteTeam) || 'LG';

  const displayedPosts = activeTab === 'all' 
    ? posts 
    : posts.filter(post => post.team === myTeam);

  // HOT 게시글 필터링: 전체 탭이면 모든 HOT, 마이팀 탭이면 해당 팀 HOT만
  const hotPosts = activeTab === 'all' 
    ? posts.filter(post => post.isHot)
    : posts.filter(post => post.isHot && post.team === myTeam);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar 
        currentPage="cheer" 
      />

      {/* Page Title and Write Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-7 h-7" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>응원게시판</h1>
          </div>
          <Button
            onClick={() => setCurrentView('cheerWrite')}
            className="text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <PenSquare className="w-4 h-4 mr-2" />
            글쓰기
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className="px-6 py-2 rounded-full transition-all"
            style={{
              backgroundColor: activeTab === 'all' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'all' ? 'white' : '#6b7280',
            }}
          >
            전체
          </button>
          <button
            onClick={() => setActiveTab('myTeam')}
            className="px-6 py-2 rounded-full transition-all"
            style={{
              backgroundColor: activeTab === 'myTeam' ? '#2d5f4f' : '#f3f4f6',
              color: activeTab === 'myTeam' ? 'white' : '#6b7280',
            }}
          >
            마이팀
          </button>
        </div>

        {/* Grid Layout: Posts List + HOT Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left - Posts List */}
          <div className="lg:col-span-2">
            <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
              {activeTab === 'all' ? '전체 게시물' : '마이팀 게시물'}
            </h2>

            <div className="space-y-4">
              {displayedPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    setSelectedPost(post);
                    setCurrentView('cheerDetail');
                  }}
                  className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                >
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-200" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {/* Team Logo and Hot Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200">
                          <TeamLogo team={post.team} size={28} />
                        </div>
                        {post.isHot && (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            HOT
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="mb-2">{post.title}</h3>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{post.author}</span>
                        <span>•</span>
                        <span>{post.timeAgo}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - HOT Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 flex items-center gap-2 text-red-500">
              <Flame className="w-5 h-5" />
              {activeTab === 'all' ? 'HOT 게시물' : '마이팀 HOT 게시물'}
            </h2>
            <div 
              className="rounded-2xl p-4 border-2 sticky top-24 bg-gradient-to-br from-red-50 to-orange-50 border-red-200"
            >
              {hotPosts.length > 0 ? (
                <div className="space-y-3">
                  {hotPosts.map((post) => (
                    <div
                      key={`hot-${post.id}`}
                      onClick={() => {
                        setSelectedPost(post);
                        setCurrentView('cheerDetail');
                      }}
                      className="bg-white rounded-xl p-3 hover:shadow-md transition-shadow cursor-pointer border border-red-100"
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Team Logo and Hot Badge */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200">
                              <TeamLogo team={post.team} size={24} />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              HOT
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm mb-1.5 line-clamp-2">{post.title}</h4>

                          {/* Meta Info */}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate max-w-[80px]">{post.author}</span>
                            <span>•</span>
                            <span>{post.timeAgo}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{post.comments}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{post.likes}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Flame className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {activeTab === 'myTeam' ? '마이팀 HOT 게시물이 없습니다' : 'HOT 게시물이 없습니다'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
