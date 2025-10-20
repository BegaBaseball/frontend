import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface SignUpProps {
  onBackToLogin: () => void;
}

export default function SignUp({ onBackToLogin }: SignUpProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    favoriteTeam: ''
  });

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign up attempt:', formData);
  };

  const teams = [
    '없음',
    'LG 트윈스',
    'KT 위즈',
    'SSG 랜더스',
    '두산 베어스',
    '키움 히어로즈',
    '한화 이글스',
    '롯데 자이언츠',
    '삼성 라이온즈',
    'NC 다이노스',
    '기아 타이거즈'
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative shapes - Fixed positioning */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top right green shape */}
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
        
        {/* Top left green shape */}
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
        
        {/* Bottom left green shape */}
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
        
        {/* Bottom right green shape */}
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

      {/* Grass decorations at bottom */}
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
              {/* Grass decoration at bottom of left panel */}
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

              <form onSubmit={handleSignUp} className="space-y-5">
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f]"
                    style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                    placeholder="홍길동"
                    required
                  />
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f]"
                    style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                    placeholder="example@email.com"
                    required
                  />
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
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10"
                      style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                      placeholder="8자 이상 입력"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10"
                      style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                      placeholder="비밀번호 재입력"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 응원팀 선택 */}
                <div className="space-y-2">
                  <Label htmlFor="favoriteTeam" className="text-gray-700">
                    응원팀 선택
                  </Label>
                  <Select 
                    value={formData.favoriteTeam} 
                    onValueChange={(value) => setFormData({ ...formData, favoriteTeam: value })}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f]">
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
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-white py-6 rounded-full hover:opacity-90"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  회원가입
                </Button>

                <p className="text-center text-sm text-gray-600">
                  이미 계정이 있으신가요?{' '}
                  <button 
                    type="button"
                    onClick={onBackToLogin}
                    className="hover:underline" 
                    style={{ color: '#2d5f4f' }}
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
