import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';  
import TeamRecommendationTest from './TeamRecommendationTest';

const TEAM_DATA: { [key: string]: { name: string, fullName: string } } = {
  '없음': { name: '없음', fullName: '없음' },
  'LG': { name: 'LG', fullName: 'LG 트윈스' },
  'OB': { name: '두산', fullName: '두산 베어스' },
  'SK': { name: 'SSG', fullName: 'SSG 랜더스' },
  'KT': { name: 'KT', fullName: 'KT 위즈' },
  'WO': { name: '키움', fullName: '키움 히어로즈' },
  'NC': { name: 'NC', fullName: 'NC 다이노스' },
  'SS': { name: '삼성', fullName: '삼성 라이온즈' },
  'LT': { name: '롯데', fullName: '롯데 자이언츠' },
  'HT': { name: '기아', fullName: '기아 타이거즈' },
  'HH': { name: '한화', fullName: '한화 이글스' },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export default function SignUp() {  
  const navigate = useNavigate();  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    favoriteTeam: ''
  });
  
  // 🔥 각 필드별 에러 메시지
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    favoriteTeam: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 필드별 유효성 검사
  const validateField = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          return '이름을 입력해주세요';
        }
        return '';
      
      case 'email':
        if (!value.trim()) {
          return '이메일을 입력해주세요';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return '올바른 이메일 형식이 아닙니다';
        }
        return '';
      
      case 'password':
        if (!value) {
          return '비밀번호를 입력해주세요';
        }
        if (value.length < 8) {
          return '비밀번호는 8자 이상이어야 합니다';
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(value)) {
          return '대문자, 소문자, 숫자, 특수문자를 각 1개 이상 포함해야 합니다';
        }
        return '';
      
      case 'confirmPassword':
        if (!value) {
          return '비밀번호 확인을 입력해주세요';
        }
        if (value !== formData.password) {
          return '비밀번호가 일치하지 않습니다';
        }
        return '';
      
      case 'favoriteTeam':
        if (!value) {
          return '응원팀을 선택해주세요';
        }
        return '';
      
      default:
        return '';
    }
  };

  // 🔥 필드 변경 시 실시간 검증
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData({ ...formData, [fieldName]: value });
    
    // 에러 메시지 업데이트 (입력 중일 때는 에러 표시 안 함)
    if (fieldErrors[fieldName as keyof typeof fieldErrors]) {
      setFieldErrors({ ...fieldErrors, [fieldName]: '' });
    }
  };

  // 🔥 포커스 벗어날 때 검증
  const handleFieldBlur = (fieldName: string) => {
    const value = formData[fieldName as keyof typeof formData];
    const errorMessage = validateField(fieldName, value);
    setFieldErrors({ ...fieldErrors, [fieldName]: errorMessage });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 🔥 모든 필드 검증
    const errors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword),
      favoriteTeam: validateField('favoriteTeam', formData.favoriteTeam),
    };
    
    setFieldErrors(errors);
    
    // 🔥 에러가 하나라도 있으면 제출 중단
    if (Object.values(errors).some(error => error !== '')) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name, 
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword, 
          favoriteTeam: formData.favoriteTeam === '없음' ? null : formData.favoriteTeam,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || (typeof errorData === 'string' ? errorData : `회원가입 실패: ${response.statusText}`);
        throw new Error(errorMessage);
      }

      alert('회원가입 성공! 로그인 화면으로 이동합니다.');
      navigate('/login');  
    } catch (err) {
      console.error('Sign up error:', err);
      setError((err as Error).message || '네트워크 오류로 회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const teams = [
    '없음',
    'LG 트윈스',
    '두산 베어스',
    'SSG 랜더스',
    'KT 위즈',
    '키움 히어로즈',
    'NC 다이노스',
    '삼성 라이온즈',
    '롯데 자이언츠',
    '기아 타이거즈',
    '한화 이글스'
  ];

  const getFullTeamName = (teamId: string): string => {
    return TEAM_DATA[teamId]?.fullName || teamId;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="fixed rounded-full opacity-90"
          style={{ 
            top: '-80px',
            right: '-160px',
            width: '600px',
            height: '400px',
            background: 'linear-gradient(135deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-15deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-80"
          style={{ 
            top: '-128px',
            left: '-240px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(45deg, #2d5f4f 0%, #4a9070 100%)',
            transform: 'rotate(25deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-85"
          style={{ 
            bottom: '-160px',
            left: '-160px',
            width: '550px',
            height: '450px',
            background: 'linear-gradient(90deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-20deg)'
          }}
        />
        <div 
          className="fixed rounded-full opacity-75"
          style={{ 
            bottom: '-128px',
            right: '-192px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(180deg, #3d7f5f 0%, #2d5f4f 100%)',
            transform: 'rotate(15deg)'
          }}
        />
      </div>

      {/* Grass decorations */}
      <img 
        src={grassDecor} 
        alt="" 
        className="fixed bottom-0 left-0 w-full h-32 object-cover object-top z-10 pointer-events-none"
      />

      {/* Sign Up Card */}
      <div className="w-full max-w-5xl relative z-20">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left - Character */}
            <div className="p-12 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
              <img 
                src={grassDecor} 
                alt="" 
                className="absolute bottom-0 left-0 w-full h-24 object-cover object-top opacity-40"
              />
              
              <div className="relative z-10 text-center">
                <img 
                  src={begaCharacter} 
                  alt="BEGA Character" 
                  className="w-72 h-auto mb-8 drop-shadow-2xl"
                />
                <h1 className="text-white mb-2 text-6xl tracking-wider" style={{ fontWeight: 900 }}>BEGA</h1>
                <p className="text-green-100 text-xl">BASEBALL GUIDE</p>
              </div>
            </div>

            {/* Right - Sign Up Form */}
            <div className="p-12 bg-white">
              <h2 className="text-center mb-8">SIGN UP</h2>

              <form onSubmit={handleSignUp} className="space-y-5" noValidate>
                {/* 🔥 서버 에러 메시지 */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 text-center">{error}</p>
                  </div>
                )}

                {/* 이름 */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    이름
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] ${fieldErrors.name ? 'border-red-500' : ''}`}
                    style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                    placeholder="홍길동"
                    disabled={isLoading}
                  />
                  {/* 🔥 에러 메시지 */}
                  {fieldErrors.name && (
                    <p className="text-sm text-red-500">* {fieldErrors.name}</p>
                  )}
                </div>

                {/* 이메일 */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] ${fieldErrors.email ? 'border-red-500' : ''}`}
                    style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                    placeholder="example@email.com"
                    disabled={isLoading}
                  />
                  {/* 🔥 에러 메시지 */}
                  {fieldErrors.email && (
                    <p className="text-sm text-red-500">* {fieldErrors.email}</p>
                  )}
                </div>

                {/* 비밀번호 */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-gray-700">
                    <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    비밀번호
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      onBlur={() => handleFieldBlur('password')}
                      className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                      style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                      placeholder="8자 이상 입력"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* 🔥 에러 메시지 */}
                  {fieldErrors.password ? (
                    <p className="text-sm text-red-500">* {fieldErrors.password}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      • 8자 이상<br />
                      • 대문자, 소문자, 숫자, 특수문자(@$!%*?&#) 각 1개 이상 포함
                    </p>
                  )}
                </div>

                {/* 비밀번호 확인 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-gray-700">
                    <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    비밀번호 확인
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                      onBlur={() => handleFieldBlur('confirmPassword')}
                      className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                      style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                      placeholder="비밀번호 재입력"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* 🔥 에러 메시지 */}
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-500">* {fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* 응원팀 선택 */}
                <div className="space-y-2">
                  <Label htmlFor="favoriteTeam" className="text-gray-700">
                    응원팀 선택
                  </Label>
                  <Select 
                    value={formData.favoriteTeam} 
                    onValueChange={(value) => {
                      handleFieldChange('favoriteTeam', value);
                      setFieldErrors({ ...fieldErrors, favoriteTeam: '' });
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] ${fieldErrors.favoriteTeam ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="팀을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* 🔥 에러 메시지 */}
                  {fieldErrors.favoriteTeam && (
                    <p className="text-sm text-red-500">* {fieldErrors.favoriteTeam}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">응원구단은 응원게시판에서 사용됩니다</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setShowTeamTest(true)} 
                      className="text-sm flex items-center h-auto py-1 px-2 hover:bg-green-50" 
                      style={{ color: '#2d5f4f' }}
                      disabled={isLoading}
                    >
                      구단 테스트 해보기
                    </Button>
                  </div>
                  <TeamRecommendationTest
                    isOpen={showTeamTest}
                    onClose={() => setShowTeamTest(false)}
                    onSelectTeam={(team) => {
                      const fullName = getFullTeamName(team);
                      handleFieldChange('favoriteTeam', fullName);
                      setShowTeamTest(false);
                      
                      const teamName = TEAM_DATA[team]?.name || team;
                      alert(`${teamName} 팀이 선택되었습니다!`);
                    }}
                  />
                  <label className="text-sm text-red-500">
                    응원구단은 한번 선택시 변경이 불가합니다.
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-white py-6 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2d5f4f' }}
                  disabled={isLoading}
                >
                  {isLoading ? '처리 중...' : '회원가입'}
                </Button>

                <p className="text-center text-sm text-gray-600">
                  이미 계정이 있으신가요?{' '}
                  <button 
                    type="button"
                    onClick={() => navigate('/login')}  
                    className="hover:underline disabled:opacity-50" 
                    style={{ color: '#2d5f4f' }}
                    disabled={isLoading}
                  >
                    로그인
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}