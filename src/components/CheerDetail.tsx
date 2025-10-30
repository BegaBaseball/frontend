import { useState } from 'react';
import { ArrowLeft, Heart, MessageSquare, Share2, MoreVertical, Send, Bookmark, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import Navbar from './Navbar';
import { Card } from './ui/card';
import { useNavigationStore } from '../store/navigationStore';
import { useCheerStore } from '../store/cheerStore';

export default function CheerDetail() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedPost, toggleLike } = useCheerStore();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comment, setComment] = useState('');
  const [isMyPost] = useState(true);
  const [isLiked, setIsLiked] = useState(selectedPost?.likedByUser || false);
  const [likeCount, setLikeCount] = useState(selectedPost?.likes || 0);
  const [comments, setComments] = useState(
    selectedPost?.commentList || [
      {
        id: 1,
        author: '야구매니아',
        content: '오늘 꼭 이겨야 합니다!',
        timeAgo: '10분 전',
      },
    ]
  );

  const post = selectedPost ? {
    ...selectedPost,
    views: 1234,
    content: selectedPost.content || '오늘 경기 정말 중요합니다!',
    images: selectedPost.images || [],
  } : {
    id: 1,
    team: 'LG',
    teamColor: '#C30452',
    title: '오늘 역전승 가자!',
    author: '야구팬123',
    timeAgo: '30분 전',
    comments: 0,
    likes: 156,
    isHot: true,
    content: '오늘 경기 정말 중요합니다!',
    views: 1234,
    images: [],
  };



  const handleLike = () => {
    if (post.id) {
      toggleLike(post.id);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    }
  };

  const handleCommentSubmit = () => {
    if (!comment.trim() || !post.id) return;
    
    const newComment = {
      id: comments.length + 1,
      author: '현재사용자',
      content: comment,
      timeAgo: '방금',
    };
    
    setComments([newComment, ...comments]);
    setComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar 
        currentPage="cheer" 
      />

      {/* Sub Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => setCurrentView('cheer')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>응원게시판으로 돌아가기</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
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
                      onClick={() => setCurrentView('cheerEdit')}
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
              {post.images && post.images.length > 0 && (
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
      </div>
    </div>
  );
}
