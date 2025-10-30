import { useState } from 'react';
import { Camera, Save, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ChatBot from './ChatBot';
import TeamRecommendationTest from './TeamRecommendationTest';
import TeamLogo from './TeamLogo';
import Navbar from './Navbar';

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

const teamFullNames: { [key: string]: string } = {
  '없음': '없음',
  'LG': 'LG 트윈스',
  '두산': '두산 베어스',
  'SSG': 'SSG 랜더스',
  'KT': 'KT 위즈',
  '키움': '키움 히어로즈',
  'NC': 'NC 다이노스',
  '삼성': '삼성 라이온즈',
  '롯데': '롯데 자이언츠',
  '기아': 'KIA 타이거즈',
  '한화': '한화 이글스',
};

export default function MyPage() {
  const [profileImage, setProfileImage] = useState<string>('');
  const [name, setName] = useState('홍길동');
  const [email, setEmail] = useState('user@example.com');
  const [favoriteTeam, setFavoriteTeam] = useState('LG');
  const [nickname, setNickname] = useState('야구팬123');
  const [showTeamTest, setShowTeamTest] = useState(false);

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
      {/* Navbar */}
      <Navbar 
        currentPage="mypage" 
      />

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
                        {team !== '없음' && (
                          <div className="w-6 h-6">
                            <TeamLogo team={team} size="sm" />
                          </div>
                        )}
                        {team === '없음' && (
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: teamColors[team] }}
                          />
                        )}
                        {teamFullNames[team]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500">
                  응원구단은 응원게시판에서 사용됩니다
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setShowTeamTest(true)}
                  className="text-sm flex items-center h-auto py-1 px-2 hover:bg-green-50"
                  style={{ color: '#2d5f4f' }}
                >
                  구단 테스트 해보기
                </Button>
              </div>
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
                {favoriteTeam !== '없음' && (
                  <div className="w-6 h-6">
                    <TeamLogo team={favoriteTeam} size="sm" />
                  </div>
                )}
                {favoriteTeam === '없음' && (
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: teamColors[favoriteTeam] }}
                  />
                )}
                <span className="text-gray-900">{teamFullNames[favoriteTeam]}</span>
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

      {/* Team Recommendation Test */}
      <TeamRecommendationTest
        isOpen={showTeamTest}
        onClose={() => setShowTeamTest(false)}
        onSelectTeam={(team) => {
          setFavoriteTeam(team);
          setShowTeamTest(false);
        }}
      />
    </div>
  );
}
