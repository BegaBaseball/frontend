import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { MessageSquare, Heart, Flame, PenSquare, Bell, User } from 'lucide-react';
import { Button } from './ui/button';
import ChatBot from './ChatBot';

interface CheerProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: 'home' | 'login' | 'signup' | 'stadium' | 'diary' | 'prediction' | 'cheer' | 'cheerWrite' | 'cheerDetail' | 'cheerEdit' | 'mypage') => void;
}

interface Post {
  id: number;
  team: string;
  teamColor: string;
  title: string;
  author: string;
  timeAgo: string;
  comments: number;
  likes: number;
  isHot: boolean;
  avatar?: string;
}

const teamColors: { [key: string]: string } = {
  'LG': '#C30452',
  '두산': '#131230',
  'SSG': '#CE0E2D',
  'KT': '#000000',
  '키움': '#570514',
  'NC': '#315288',
  '삼성': '#074CA1',
  '롯데': '#041E42',
  '기아': '#EA0029',
  '한화': '#FF6600',
};

export default function Cheer({ onNavigateToLogin, onNavigate }: CheerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'myTeam'>('all');
  const [myTeam] = useState('LG'); // 사용자의 마이팀 설정

  const allPosts: Post[] = [
    {
      id: 1,
      team: 'LG',
      teamColor: teamColors['LG'],
      title: '오늘 역전승 가자!',
      author: '야구팬123',
      timeAgo: '30분 전',
      comments: 24,
      likes: 156,
      isHot: true,
    },
    {
      id: 2,
      team: '두산',
      teamColor: teamColors['두산'],
      title: '양의지 홈런 기원',
      author: '베어스사랑',
      timeAgo: '30분 전',
      comments: 12,
      likes: 87,
      isHot: false,
    },
    {
      id: 3,
      team: 'SSG',
      teamColor: teamColors['SSG'],
      title: '랜더스 화이팅!',
      author: 'SSG팬',
      timeAgo: '1시간 전',
      comments: 45,
      likes: 203,
      isHot: true,
    },
    {
      id: 4,
      team: 'KT',
      teamColor: teamColors['KT'],
      title: '위즈 오늘도 승리하자',
      author: 'KT응원단',
      timeAgo: '2시간 전',
      comments: 18,
      likes: 92,
      isHot: false,
    },
    {
      id: 5,
      team: '키움',
      teamColor: teamColors['키움'],
      title: '히어로즈 파이팅!',
      author: '키움조아',
      timeAgo: '3시간 전',
      comments: 33,
      likes: 145,
      isHot: true,
    },
    {
      id: 6,
      team: 'NC',
      teamColor: teamColors['NC'],
      title: '다이노스 응원합니다',
      author: 'NC팬',
      timeAgo: '4시간 전',
      comments: 21,
      likes: 78,
      isHot: false,
    },
    {
      id: 7,
      team: '삼성',
      teamColor: teamColors['삼성'],
      title: '라이온즈 오늘도 화이팅',
      author: '삼성팬',
      timeAgo: '5시간 전',
      comments: 29,
      likes: 112,
      isHot: false,
    },
    {
      id: 8,
      team: '롯데',
      teamColor: teamColors['롯데'],
      title: '자이언츠 응원해요!',
      author: '롯데사랑',
      timeAgo: '6시간 전',
      comments: 15,
      likes: 65,
      isHot: false,
    },
  ];

  const displayedPosts = activeTab === 'all' 
    ? allPosts 
    : allPosts.filter(post => post.team === myTeam);

  const hotPosts = allPosts.filter(post => post.isHot);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
              <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
              <div>
                <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
                <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
              </div>
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onNavigate('home')} 
                className="text-gray-700 hover:opacity-70"
              >
                홈
              </button>
              <button 
                onClick={() => onNavigate('cheer')}
                className="hover:opacity-70"
                style={{ color: '#2d5f4f', fontWeight: 700 }}
              >
                응원
              </button>
              <button 
                onClick={() => onNavigate('stadium')} 
                className="text-gray-700 hover:opacity-70"
              >
                구장
              </button>
              <button 
                onClick={() => onNavigate('prediction')}
                className="text-gray-700 hover:opacity-70"
              >
                예측
              </button>
              <button 
                onClick={() => onNavigate('diary')}
                className="text-gray-700 hover:opacity-70"
              >
                다이어리
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => onNavigate('mypage')}
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5" />
              </button>
              <Button
                onClick={onNavigateToLogin}
                className="rounded-full px-6"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title and Write Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-7 h-7" style={{ color: '#2d5f4f' }} />
            <h1 style={{ color: '#2d5f4f' }}>응원게시판</h1>
          </div>
          <Button
            onClick={() => onNavigate('cheerWrite')}
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

        {/* HOT Posts Section */}
        {activeTab === 'all' && hotPosts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-6 h-6 text-red-500" />
              <h2 className="text-red-500">HOT 게시물</h2>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
              <div className="space-y-3">
                {hotPosts.map((post) => (
                  <div
                    key={`hot-${post.id}`}
                    onClick={() => onNavigate('cheerDetail')}
                    className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer border border-red-100"
                  >
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-200" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        {/* Team Badge and Hot Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs text-white"
                            style={{ backgroundColor: post.teamColor }}
                          >
                            {post.team}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            HOT
                          </span>
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
          </div>
        )}

        {/* All Posts Section */}
        <div className="mb-4">
          <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
            {activeTab === 'all' ? '전체 게시물' : '마이팀 게시물'}
          </h2>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {displayedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onNavigate('cheerDetail')}
              className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  {/* Team Badge and Hot Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: post.teamColor }}
                    >
                      {post.team}
                    </span>
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

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
