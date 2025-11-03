import { useState } from 'react';
import { ArrowLeft, Mail, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useNavigationStore } from '../store/navigationStore';
import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';

export default function PasswordReset() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    // 여기에 실제 비밀번호 재설정 로직 추가
    setIsSubmitted(true);
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

      {/* Reset Card */}
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

            {/* Right - Reset Form */}
            <div className="p-12 bg-white">
              <button 
                onClick={() => setCurrentView('login')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>로그인으로 돌아가기</span>
              </button>

              {!isSubmitted ? (
                <>
                  <h2 className="text-center mb-4">비밀번호 재설정</h2>
                  <p className="text-center text-gray-600 mb-8">
                    가입하신 이메일 주소를 입력해주세요.<br />
                    비밀번호 재설정 링크를 보내드립니다.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f]"
                        style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                        placeholder="이메일을 입력하세요"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full text-white py-6 rounded-full hover:opacity-90"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      재설정 링크 보내기
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
                  <h2 className="mb-4">이메일을 확인해주세요</h2>
                  <p className="text-gray-600 mb-8">
                    <span style={{ color: '#2d5f4f' }}>{email}</span> 로<br />
                    비밀번호 재설정 링크를 보냈습니다.<br />
                    이메일을 확인하고 링크를 클릭해주세요.
                  </p>
                  
                  {/* Demo purpose: 링크 시뮬레이션 버튼 */}
                  <Button 
                    onClick={() => setCurrentView('passwordResetConfirm')}
                    className="w-full text-white py-6 rounded-full hover:opacity-90 mb-3"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    링크 확인하기 (테스트)
                  </Button>
                  
                  <Button 
                    onClick={() => setCurrentView('login')}
                    className="w-full py-6 rounded-full hover:bg-gray-50 border-2"
                    style={{ borderColor: '#2d5f4f', color: '#2d5f4f', backgroundColor: 'white' }}
                  >
                    로그인으로 돌아가기
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
