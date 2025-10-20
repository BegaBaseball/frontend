import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { ArrowLeft, Heart, MessageSquare, Share2, MoreVertical, Send, Bell, User, Bookmark, TrendingUp, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';

interface CheerDetailProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: 'home' | 'login' | 'signup' | 'stadium' | 'diary' | 'prediction' | 'cheer' | 'cheerWrite' | 'cheerDetail' | 'cheerEdit' | 'mypage') => void;
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

export default function CheerDetail({ onNavigateToLogin, onNavigate }: CheerDetailProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(156);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comment, setComment] = useState('');
  const [isMyPost] = useState(true); // TODO: 실제로는 현재 로그인한 유저와 작성자를 비교
  const [comments, setComments] = useState([
    {
      id: 1,
      author: '야구매니아',
      content: '오늘 꼭 이겨야 합니다!',
      timeAgo: '10분 전',
      likes: 5
    },
    {
      id: 2,
      author: 'LG팬',
      content: '선발 투수가 중요할 것 같아요',
      timeAgo: '25분 전',
      likes: 3
    },
    {
      id: 3,
      author: '야구조아',
      content: '응원합니다! 화이팅!',
      timeAgo: '30분 전',
      likes: 8
    }
  ]);

  // Mock post data
  const post = {
    team: 'LG',
    teamColor: teamColors['LG'],
    title: '오늘 역전승 가자!',
    author: '야구팬123',
    timeAgo: '30분 전',
    views: 1234,
    content: `오늘 경기 정말 중요합니다!
    
작년에도 이맘때 힘들었는데, 올해는 꼭 이겨야 해요. 우리 선수들 모두 파이팅!

특히 선발 투수가 초반부터 안정감 있게 던져줬으면 좋겠습니다. 타선도 득점권에서 집중력 발휘해서 득점 많이 올려주세요!

오늘도 직관 갑니다. 현장에서 열심히 응원하겠습니다! 같이 응원하실 분들 모두 화이팅!!! 🔥⚾`,
    images: []
  };

  // Mock related posts
  const relatedPosts = [
    { id: 1, title: '오늘 경기 라인업 예상', author: '야구덕후', views: 523, comments: 12, team: 'LG' },
    { id: 2, title: '선수들 컨디션 좋아 보여요', author: '응원단장', views: 432, comments: 8, team: 'LG' },
    { id: 3, title: '내일 날씨 어떨까요?', author: '날씨요정', views: 287, comments: 15, team: 'LG' },
    { id: 4, title: '직관 후기 - 분위기 최고', author: '현장파', views: 891, comments: 23, team: 'LG' },
  ];

  const hotPosts = [
    { id: 1, title: '이번 시즌 MVP 예상', views: 3421, comments: 156 },
    { id: 2, title: '팀 순위 변동 분석', views: 2834, comments: 98 },
    { id: 3, title: '역대급 경기였습니다', views: 2156, comments: 187 },
  ];

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    
    const newComment = {
      id: comments.length + 1,
      author: '현재사용자',
      content: comment,
      timeAgo: '방금',
      likes: 0
    };
    
    setComments([newComment, ...comments]);
    setComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Sub Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => onNavigate('cheer')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>응원게시판으로 돌아가기</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Main Post */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Card */}
            <Card className="bg-white p-8 rounded-xl shadow-sm">
              {/* Author Info */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900">{post.author}</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs text-white"
                        style={{ backgroundColor: post.teamColor }}
                      >
                        {post.team}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{post.timeAgo}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMyPost && (
                    <Button
                      onClick={() => onNavigate('cheerEdit')}
                      className="text-white px-4"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      수정
                    </Button>
                  )}
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="mb-6 text-gray-900">{post.title}</h1>

              {/* Content */}
              <div className="text-gray-700 whitespace-pre-wrap mb-8 leading-relaxed">
                {post.content}
              </div>

              {/* Images */}
              {post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {post.images.map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <Heart 
                      className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    <span className="font-medium">{likeCount}</span>
                  </button>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="w-6 h-6" />
                    <span className="font-medium">{comments.length}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="flex items-center gap-2 text-gray-600 hover:text-yellow-500 transition-colors"
                >
                  <Bookmark 
                    className={`w-6 h-6 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`}
                  />
                </button>
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="mb-6 flex items-center gap-2" style={{ color: '#2d5f4f' }}>
                <MessageSquare className="w-6 h-6" />
                댓글 <span className="ml-1">{comments.length}</span>
              </h3>

              {/* Comment Input */}
              <div className="mb-8 pb-8 border-b">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0" />
                  <div className="flex-1">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="댓글을 남겨보세요..."
                      className="w-full min-h-[100px] mb-3 resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleCommentSubmit}
                        className="text-white px-6"
                        style={{ backgroundColor: '#2d5f4f' }}
                        disabled={!comment.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        댓글 작성
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment, index) => (
                  <div key={comment.id} className={`flex gap-4 ${index !== comments.length - 1 ? 'pb-6 border-b' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{comment.author}</span>
                        <span className="text-sm text-gray-500">{comment.timeAgo}</span>
                      </div>
                      <p className="text-gray-700 mb-3 leading-relaxed">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
                          <Heart className="w-4 h-4" />
                          <span>{comment.likes}</span>
                        </button>
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          답글 달기
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right - Sidebar */}
          <div className="space-y-6">
            {/* Related Posts */}
            <Card className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="mb-4 pb-3 border-b flex items-center gap-2" style={{ color: '#2d5f4f' }}>
                <TrendingUp className="w-5 h-5" />
                같은 팀 게시글
              </h4>
              <div className="space-y-3">
                {relatedPosts.map((relatedPost) => (
                  <button
                    key={relatedPost.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm text-gray-900 mb-2 line-clamp-2">
                      {relatedPost.title}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{relatedPost.author}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{relatedPost.views}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{relatedPost.comments}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Hot Posts */}
            <Card className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="mb-4 pb-3 border-b flex items-center gap-2 text-red-600">
                <TrendingUp className="w-5 h-5" />
                HOT 게시글
              </h4>
              <div className="space-y-3">
                {hotPosts.map((hotPost, index) => (
                  <button
                    key={hotPost.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-red-600 font-semibold text-sm">{index + 1}</span>
                      <div className="text-sm text-gray-900 line-clamp-2 flex-1">
                        {hotPost.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 ml-5">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{hotPost.views.toLocaleString()}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{hotPost.comments}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
