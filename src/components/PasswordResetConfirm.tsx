import { useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigationStore } from '../store/navigationStore';
import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';

export default function PasswordResetConfirm() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 유효성 검사
    if (newPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    console.log('Password reset confirmed');
    // 여기에 실제 비밀번호 재설정 로직 추가
    setIsCompleted(true);
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

      {/* Grass decorations at bottom */}
      <img 
        src={grassDecor} 
        alt="" 
        className="fixed bottom-0 left-0 w-full h-32 object-cover object-top z-10 pointer-events-none"
      />

      {/* Reset Confirm Card */}
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

            {/* Right - New Password Form */}
            <div className="p-12 bg-white">
              {!isCompleted ? (
                <>
                  <button 
                    onClick={() => setCurrentView('login')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>로그인으로 돌아가기</span>
                  </button>

                  <h2 className="text-center mb-4">새 비밀번호 설정</h2>
                  <p className="text-center text-gray-600 mb-8">
                    새로운 비밀번호를 입력해주세요.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="flex items-center gap-2 text-gray-700">
                        <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                        새 비밀번호
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10"
                          style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                          placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-gray-700">
                        <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                        비밀번호 확인
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10"
                          style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                          placeholder="비밀번호를 다시 입력하세요"
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

                    {error && (
                      <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                      <p className="mb-2">비밀번호 조건:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                          최소 8자 이상
                        </li>
                        <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                          비밀번호 일치
                        </li>
                      </ul>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full text-white py-6 rounded-full hover:opacity-90"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      비밀번호 변경
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="mb-4">비밀번호 변경 완료</h2>
                  <p className="text-gray-600 mb-8">
                    비밀번호가 성공적으로 변경되었습니다.<br />
                    새로운 비밀번호로 로그인해주세요.
                  </p>
                  <Button 
                    onClick={() => setCurrentView('login')}
                    className="w-full text-white py-6 rounded-full hover:opacity-90"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    로그인하기
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
