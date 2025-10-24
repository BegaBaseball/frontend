/**
 * 게시글 작성 페이지 컴포넌트
 * 
 * 작업 내용:
 * 1. 기존 하드코딩된 팀 정보를 개발용 인증에서 가져오도록 변경
 * 2. 실제 백엔드 API 호출로 게시글 작성 기능 구현
 * 3. 로딩 상태 및 에러 처리 추가
 * 4. 개발용 인증 패널 통합
 * 5. 작성 완료 후 게시판으로 자동 이동
 * 
 * 주요 변경사항:
 * - 팀 정보: getDevUser()에서 현재 사용자 팀 가져오기
 * - API 호출: createPost() 함수로 실제 게시글 생성
 * - 상태 관리: loading, error 상태 추가
 * - 유효성 검사: 로그인 및 필수 입력 확인
 */

import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Bell, User } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import DevAuthPanel from './DevAuthPanel';
import { createPost } from '../api/cheer';
import { getDevUser } from '../utils/devAuth';
import { NavigateHandler } from '../types';

interface CheerWriteProps {
  onNavigateToLogin: () => void;
  onNavigate: NavigateHandler;
}

export default function CheerWrite({ onNavigateToLogin, onNavigate }: CheerWriteProps) {
  // 상태 관리: 폼 데이터 및 API 호출 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // 게시글 작성 중 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태
  
  // 개발용 인증: 현재 사용자 정보 가져오기
  const currentUser = getDevUser();
  const myTeam = currentUser?.team || null; // 사용자의 응원팀

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages([...images, ...newImages]);
    }
  };

  /**
   * 게시글 작성 처리 함수
   * - 로그인 상태 및 필수 입력 확인
   * - 백엔드 API 호출로 실제 게시글 생성
   * - 성공 시 게시판으로 이동, 실패 시 에러 메시지 표시
   */
  const handleSubmit = async () => {
    // 유효성 검사: 로그인 상태 확인
    if (!currentUser || !myTeam) {
      setError('로그인이 필요합니다. 개발용 인증 패널에서 로그인해주세요.');
      return;
    }

    // 유효성 검사: 필수 입력 확인
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 백엔드 API 호출: 게시글 생성
      // Note: 현재는 이미지 미리보기 URL을 그대로 전송 (개발용)
      // 실제 운영환경에서는 이미지 파일을 서버에 업로드하고 URL을 받아야 함
      await createPost({
        teamId: myTeam,
        title: title.trim(),
        content: content.trim(),
        images: images.length > 0 ? images.map(img => 
          img.startsWith('blob:') ? `placeholder-image-${Date.now()}-${Math.random()}.jpg` : img
        ) : undefined,
      });

      // 성공 시 게시판으로 이동
      onNavigate('cheer');
    } catch (err) {
      console.error('Failed to create post:', err);
      // 더 상세한 에러 정보 표시
      if (err instanceof Error) {
        setError(`게시글 작성 실패: ${err.message}`);
      } else {
        setError('게시글 작성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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

      {/* Page Header */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('cheer')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 style={{ color: '#2d5f4f' }}>응원글 작성</h2>
            </div>
            <Button
              onClick={handleSubmit}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
              disabled={loading || !title.trim() || !content.trim() || !currentUser || !myTeam}
            >
              {loading ? '작성 중...' : '등록'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 개발용 인증 패널 */}
        <DevAuthPanel />

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* 팀 정보 표시 */}
        {currentUser && myTeam && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <span className="font-semibold">{myTeam}</span> 팀 게시판에 글을 작성합니다.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm" style={{ color: '#2d5f4f' }}>
              제목 *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="block text-sm" style={{ color: '#2d5f4f' }}>
              내용 *
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="응원 메시지를 작성하세요"
              className="w-full min-h-[300px]"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm" style={{ color: '#2d5f4f' }}>
              이미지
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">클릭하여 이미지 업로드</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setImages(images.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
