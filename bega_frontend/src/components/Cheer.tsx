/**
 * 야구 팬 응원 게시판 컴포넌트
 * 
 * 작업 내용:
 * 1. 기존 하드코딩된 데이터를 실제 백엔드 API와 연동
 * 2. 개발용 인증 시스템 통합 (DevAuthPanel)
 * 3. 로딩/에러 상태 처리 추가
 * 4. 팀별 필터링 기능 실제 API 호출로 변경
 * 5. 실시간 데이터 업데이트 구조 구현
 * 
 * 주요 변경사항:
 * - API 호출: getPosts() 함수로 실제 데이터 로드
 * - 상태 관리: loading, error 상태 추가
 * - 인증: DevAuthPanel로 개발용 로그인 기능
 * - 데이터 변환: PostSummary → Post 인터페이스 변환
 * - 팀 필터링: activeTab에 따른 API 호출 변경
 */

import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState, useEffect } from 'react';
import { MessageSquare, Heart, Flame, PenSquare, Bell, User, Eye, Megaphone } from 'lucide-react';
import { Button } from './ui/button';
import ChatBot from './ChatBot';
import DevAuthPanel from './DevAuthPanel'; // 개발용 인증 패널 추가
import { getPosts } from '../api/cheer'; // 백엔드 API 연동
import { PostSummary } from '../types/cheer'; // 타입 안전성을 위한 인터페이스
import { getDevUser } from '../utils/devAuth'; // 개발용 사용자 정보 가져오기
import { NavigateHandler } from '../types';

interface CheerProps {
  onNavigateToLogin: () => void;
  onNavigate: NavigateHandler;
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
  // 상태 관리: 기존 하드코딩 대신 실제 API 데이터 관리
  const [activeTab, setActiveTab] = useState<'all' | 'myTeam'>('all');
  const [posts, setPosts] = useState<PostSummary[]>([]); // 백엔드에서 받은 실제 게시글 데이터
  const [loading, setLoading] = useState(true); // API 호출 중 로딩 상태
  const [loadingMore, setLoadingMore] = useState(false); // 더보기 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태 관리
  const [currentPage, setCurrentPage] = useState(0); // 현재 페이지 번호
  const [hasNextPage, setHasNextPage] = useState(true); // 다음 페이지 존재 여부
  
  // 개발용 인증: localStorage에서 현재 사용자 정보 가져오기
  const currentUser = getDevUser();
  const myTeam = currentUser?.team || 'LG'; // 사용자의 응원팀 정보

  // API 데이터 로드: 탭 변경시마다 새로운 데이터 요청
  useEffect(() => {
    setCurrentPage(0);
    setHasNextPage(true);
    loadPosts(true); // 탭 변경시 첫 페이지부터 다시 로드
  }, [activeTab]); // activeTab이 변경될 때마다 재호출 (전체 ↔ 마이팀)

  /**
   * 백엔드 API 호출 함수
   * - 전체 탭: 모든 팀의 게시글 가져오기
   * - 마이팀 탭: 현재 사용자 팀의 게시글만 가져오기
   */
  const loadPosts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      // 팀 필터링: 마이팀 탭이면 팀ID 전달, 전체 탭이면 undefined
      const teamId = activeTab === 'myTeam' ? myTeam : undefined;
      const pageToLoad = reset ? 0 : currentPage + 1;
      
      const response = await getPosts(teamId, pageToLoad, 10); // 페이지당 10개씩
      
      if (reset) {
        setPosts(response.content || []); // 첫 페이지 또는 탭 변경시 새로 설정
      } else {
        setPosts(prev => [...prev, ...(response.content || [])]); // 더보기시 기존 데이터에 추가
      }
      
      // 다음 페이지 존재 여부 설정
      setHasNextPage(!response.last);
      setCurrentPage(pageToLoad);
      
    } catch (err) {
      console.error('Failed to load posts:', err);
      // 더 구체적인 에러 메시지 표시
      if (err instanceof Error && err.message.includes('HTTP')) {
        setError(`서버 연결 실패: ${err.message}`);
      } else {
        setError('게시글을 불러오는데 실패했습니다.');
      }
      if (reset) {
        setPosts([]); // 에러 시 빈 배열로 설정
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  /**
   * 더보기 버튼 클릭 핸들러
   */
  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
      loadPosts(false);
    }
  };

  /**
   * 데이터 변환 함수: 백엔드 데이터를 UI에 맞게 변환
   * PostSummary (백엔드) → Post (프론트엔드) 인터페이스 변환
   * - 시간 계산: createdAt을 "몇분 전" 형태로 변환
   * - 팀 색상: teamId를 기반으로 색상 매핑
   * - HOT 배지: 좋아요 수 기준으로 인기글 표시
   */
  const formatPost = (post: PostSummary): Post => {
    // 시간 차이 계산 (상대시간 표시)
    const now = new Date();
    const createdAt = new Date(post.createdAt);
    const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    
    let timeAgo = '';
    if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes}분 전`;
    } else if (diffInMinutes < 1440) {
      timeAgo = `${Math.floor(diffInMinutes / 60)}시간 전`;
    } else {
      timeAgo = `${Math.floor(diffInMinutes / 1440)}일 전`;
    }

    return {
      id: post.id,
      team: post.teamId,
      teamColor: teamColors[post.teamId] || '#666666', // 팀별 고유 색상 적용
      title: post.title,
      author: post.author,
      timeAgo,
      comments: post.comments,
      likes: post.likes,
      views: post.views || 0,
      isHot: post.isHot, // 백엔드에서 계산된 HOT 여부 사용
      isNotice: post.postType === 'NOTICE', // 공지사항 여부
    };
  };

  // 데이터 처리: API 데이터를 UI용 형태로 변환
  const displayedPosts = posts.map(formatPost);
  const hotPosts = displayedPosts.filter(post => post.isHot); // HOT 게시글만 필터링

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
        
        {/* 개발용 인증 패널: 개발 단계에서 사용자 로그인 시뮬레이션 */}
        <DevAuthPanel />
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
                    onClick={() => onNavigate('cheerDetail', post.id.toString())}
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

        {/* 로딩 및 에러 상태 처리: 사용자 경험 개선을 위한 상태별 UI */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">게시글을 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태: 네트워크 오류나 서버 문제 시 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={loadPosts} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 빈 상태: 게시글이 없을 때 안내 메시지 */}
        {!loading && !error && displayedPosts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">게시글이 없습니다.</p>
            {activeTab === 'myTeam' && (
              <p className="text-sm text-gray-500 mt-2">
                {myTeam}팀 게시글이 없습니다. 첫 번째 글을 작성해보세요!
              </p>
            )}
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && displayedPosts.length > 0 && (
          <div className="space-y-4">
            {displayedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onNavigate('cheerDetail', post.id.toString())}
              className="border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  {/* Team Badge, Notice Badge and Hot Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: post.teamColor }}
                    >
                      {post.team}
                    </span>
                    {post.isNotice && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-600 text-white flex items-center gap-1">
                        <Megaphone className="w-3 h-3" />
                        공지
                      </span>
                    )}
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
                      <Eye className="w-4 h-4" />
                      <span>{post.views || 0}</span>
                    </div>
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
        )}

        {/* Load More Button */}
        {!loading && !error && hasNextPage && displayedPosts.length > 0 && (
          <div className="text-center mt-8">
            <Button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3 text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              {loadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  불러오는 중...
                </div>
              ) : (
                '더보기'
              )}
            </Button>
          </div>
        )}

        {/* No More Posts Message */}
        {!loading && !error && !hasNextPage && displayedPosts.length > 0 && (
          <div className="text-center mt-8 text-gray-500">
            모든 게시글을 불러왔습니다.
          </div>
        )}
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
