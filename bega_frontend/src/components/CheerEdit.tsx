import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Bell, User } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { getPost, updatePost } from '../api/cheer';
import { PostDetail, UpdatePostRequest } from '../types/cheer';
import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { NavigateHandler } from '../types';

interface CheerEditProps {
  onNavigateToLogin: () => void;
  onNavigate: NavigateHandler;
}

export default function CheerEdit({ onNavigateToLogin, onNavigate }: CheerEditProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<PostDetail | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('게시글 ID가 유효하지 않습니다.');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const postData = await getPost(Number(id));
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
      } catch (err) {
        setError('게시글을 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubmit = async () => {
    if (!id || !title || !content) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedPost: UpdatePostRequest = { title, content };
      await updatePost(Number(id), updatedPost);
      // onNavigate('cheerDetail', id); // 기존 onNavigate 사용
      navigate(`/posts/${id}`); // react-router-dom의 navigate 사용
    } catch (err) {
      setError('게시글 수정에 실패했습니다.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
      if (id) {
        // onNavigate('cheerDetail', id);
        navigate(`/posts/${id}`);
      } else {
        // onNavigate('cheer');
        navigate('/posts');
      }
    }
  };
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">에러: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-3">
              <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
              <div>
                <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
                <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-8">
                <button onClick={() => navigate('/')} className="text-gray-700 hover:opacity-70">홈</button>
                <button onClick={() => navigate('/posts')} className="hover:opacity-70" style={{ color: '#2d5f4f', fontWeight: 700 }}>응원</button>
                <button onClick={() => navigate('/stadium')} className="text-gray-700 hover:opacity-70">구장</button>
                <button onClick={() => navigate('/prediction')} className="text-gray-700 hover:opacity-70">예측</button>
                <button onClick={() => navigate('/diary')} className="text-gray-700 hover:opacity-70">다이어리</button>
            </nav>
            <div className="flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 relative"><Bell className="w-5 h-5" /></button>
              <button onClick={() => navigate('/mypage')} className="text-gray-600 hover:text-gray-900"><User className="w-5 h-5" /></button>
              <Button onClick={() => navigate('/login')} className="rounded-full px-6" style={{ backgroundColor: '#2d5f4f' }}>로그인</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={handleCancel} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 style={{ color: '#2d5f4f' }}>응원글 수정</h2>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCancel} variant="outline" className="border-gray-300">취소</Button>
              <Button
                onClick={handleSubmit}
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
                disabled={!title || !content || isSubmitting}
              >
                {isSubmitting ? '수정 중...' : '수정 완료'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm" style={{ color: '#2d5f4f' }}>제목 *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm" style={{ color: '#2d5f4f' }}>내용 *</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="응원 메시지를 작성하세요"
              className="w-full min-h-[300px]"
            />
          </div>
          {error && <p className="text-sm text-red-500">에러: {error}</p>}
        </div>
      </div>
    </div>
  );
}
