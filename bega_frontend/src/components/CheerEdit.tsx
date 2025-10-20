import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Bell, User } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';

interface CheerEditProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: 'home' | 'login' | 'signup' | 'stadium' | 'diary' | 'prediction' | 'cheer' | 'cheerWrite' | 'cheerDetail' | 'cheerEdit' | 'mypage') => void;
}

export default function CheerEdit({ onNavigateToLogin, onNavigate }: CheerEditProps) {
  const [myTeam] = useState('LG'); // 마이페이지에서 설정한 팀
  
  // TODO: 실제로는 기존 게시글 데이터를 불러와서 초기값 설정
  const [title, setTitle] = useState('오늘 역전승 가자!');
  const [content, setContent] = useState(`오늘 경기 정말 중요합니다!
    
작년에도 이맘때 힘들었는데, 올해는 꼭 이겨야 해요. 우리 선수들 모두 파이팅!

특히 선발 투수가 초반부터 안정감 있게 던져줬으면 좋겠습니다. 타선도 득점권에서 집중력 발휘해서 득점 많이 올려주세요!

오늘도 직관 갑니다. 현장에서 열심히 응원하겠습니다! 같이 응원하실 분들 모두 화이팅!!! 🔥⚾`);
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages([...images, ...newImages]);
    }
  };

  const handleSubmit = () => {
    // TODO: 게시글 수정 로직
    console.log('게시글 수정:', { myTeam, title, content, images });
    onNavigate('cheerDetail');
  };

  const handleCancel = () => {
    if (confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
      onNavigate('cheerDetail');
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
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 style={{ color: '#2d5f4f' }}>응원글 수정</h2>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-gray-300"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
                disabled={!title || !content}
              >
                수정 완료
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
