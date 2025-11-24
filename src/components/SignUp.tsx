import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TeamRecommendationTest from './TeamRecommendationTest';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { TEAM_LIST, getFullTeamName, TEAM_DATA } from '../constants/teams';
import AuthLayout from './auth/AuthLayout';

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTeamTest, setShowTeamTest] = useState(false);

  const {
    formData,
    fieldErrors,
    isLoading,
    error,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  } = useSignUpForm();

  return (
    <AuthLayout>
      <h2 className="text-center mb-8">SIGN UP</h2>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* 서버 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* 닉네임 */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4" style={{ color: '#2d5f4f' }} />
            닉네임
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
            onValueChange={(value) => handleFieldChange('favoriteTeam', value)}
            disabled={isLoading}
          >
            <SelectTrigger className={`bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] ${fieldErrors.favoriteTeam ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="팀을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_LIST.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {fieldErrors.favoriteTeam && (
            <p className="text-sm text-red-500">* {fieldErrors.favoriteTeam}</p>
          )}
          
          {/* "없음" 선택 시 경고 메시지 */}
          {formData.favoriteTeam === '없음' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ 응원구단을 선택하지 않으면 <strong>응원게시판을 이용할 수 없습니다.</strong><br />
                <span className="text-xs">나중에 마이페이지 &gt; 내 정보 수정에서 변경 가능합니다.</span>
              </p>
            </div>
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
    </AuthLayout>
  );
}