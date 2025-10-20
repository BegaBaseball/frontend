import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState } from 'react';
import { Bell, User, Camera, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ChatBot from './ChatBot';

interface MyPageProps {
  onNavigateToLogin: () => void;
  onNavigate: (view: 'home' | 'login' | 'signup' | 'stadium' | 'diary' | 'prediction' | 'cheer' | 'cheerWrite' | 'cheerDetail' | 'mypage') => void;
}

const teamColors: { [key: string]: string } = {
  '없음': '#9ca3af',
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

export default function MyPage({ onNavigateToLogin, onNavigate }: MyPageProps) {
  const [profileImage, setProfileImage] = useState<string>('');
  const [name, setName] = useState('홍길동');
  const [email, setEmail] = useState('user@example.com');
  const [favoriteTeam, setFavoriteTeam] = useState('LG');
  const [nickname, setNickname] = useState('야구팬123');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    }
  };

  const handleSave = () => {
    // TODO: 프로필 저장 로직
    console.log('프로필 저장:', { name, email, favoriteTeam, nickname, profileImage });
    alert('프로필이 저장되었습니다!');
  };

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
                className="text-gray-700 hover:opacity-70"
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
                className="hover:text-gray-900"
                style={{ color: '#2d5f4f' }}
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

      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 style={{ color: '#2d5f4f' }}>마이페이지</h1>
          <p className="text-gray-600 mt-2">회원 정보를 수정하고 응원구단을 설정하세요</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
          {/* Profile Image */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
                style={{ borderColor: '#2d5f4f' }}
              >
                <Camera className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h2 style={{ color: '#2d5f4f' }}>{name}</h2>
              <p className="text-gray-600 mt-1">{email}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">
                이름 *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                placeholder="이름을 입력하세요"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-gray-700">
                닉네임 *
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full"
                placeholder="닉네임을 입력하세요"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                이메일 *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="이메일을 입력하세요"
              />
            </div>

            {/* Favorite Team */}
            <div className="space-y-2">
              <Label htmlFor="team" className="text-gray-700">
                응원구단 *
              </Label>
              <Select value={favoriteTeam} onValueChange={setFavoriteTeam}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="응원하는 팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(teamColors).map(team => (
                    <SelectItem key={team} value={team}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: teamColors[team] }}
                        />
                        {team}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                응원구단은 응원게시판에서 사용됩니다
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              className="w-full text-white py-6 rounded-full flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <Save className="w-5 h-5" />
              저장하기
            </Button>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2"
          style={{ borderColor: '#2d5f4f' }}
        >
          <h3 className="mb-4" style={{ color: '#2d5f4f' }}>회원 정보</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>가입일</span>
              <span className="text-gray-900">2024년 10월 01일</span>
            </div>
            <div className="flex items-center justify-between">
              <span>응원구단</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: teamColors[favoriteTeam] }}
                />
                <span className="text-gray-900">{favoriteTeam}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>작성한 게시글</span>
              <span className="text-gray-900">12개</span>
            </div>
            <div className="flex items-center justify-between">
              <span>다이어리</span>
              <span className="text-gray-900">8개</span>
            </div>
          </div>
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}
