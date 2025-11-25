import begaCharacter from '/src/assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import baseballLogo from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import homeScreenshot from '/src/assets/home.png';
import predictionScreenshot from '/src/assets/prediction.png';
import diaryScreenshot from '/src/assets/diary.png';
import screenshot2 from '/src/assets/cheer.png';
import screenshot3 from '/src/assets/stadium.png';
import mateScreenshot1 from '/src/assets/mate.png';
import { Button } from './ui/button';
import { ArrowRight, Users, MapPin, TrendingUp, MessageCircle, BookOpen, Home, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const navigate = useNavigate();

  const features = [
    {
      icon: Home,
      title: 'KBO 경기일정 및 홈',
      description: '실시간 경기 정보와 티켓 예매, 스토브리그 소식을 확인하세요',
      image: homeScreenshot,
      guide: [
        '홈 화면에서 오늘의 경기 일정 확인',
        'KBO LIVE로 실시간 경기 현황 체크',
        '팀별 랭킹과 티켓 예매 정보 한눈에'
      ]
    },
    {
      icon: MessageCircle,
      title: '응원게시판',
      description: '마이팀 설정으로 필터링하여 우리 팀 소식만 모아보세요',
      image: screenshot2,
      guide: [
        '마이팀 설정 후 우리 팀 게시글만 필터링',
        '응원 글 작성 및 다른 팬들과 소통',
        '경기 후기와 응원 메시지 공유'
      ]
    },
    {
      icon: MapPin,
      title: '구장 가이드',
      description: '야구장 내부 맛집, 배달존 및 근처 편의점, 주차장 정보 제공',
      image: screenshot3,
      guide: [
        '구장 선택 후 카테고리별 정보 확인',
        '맛집, 배달존, 편의점, 주차장 정보 제공',
        '구장 방문 전 필수 정보 미리 체크'
      ]
    },
    {
      icon: TrendingUp,
      title: '승리요정',
      description: '순위예측과 승부예측으로 경기를 더 재미있게 즐기세요',
      image: predictionScreenshot,
      guide: [
        '스토브리그 시즌: 순위 예측 활성화',
        '시즌 중: 승부 예측 활성화',
        '친구들과 예측 결과 저장하고 공유하기'
      ]
    },
    {
      icon: Users,
      title: '같이가요',
      description: '직관메이트를 구하고 함께 야구를 즐기세요',
      image: mateScreenshot1,
      guide: [
        '내가 호스트인 파티: 신청 관리 → 승인/거절 → 채팅방 소통',
        '참여 신청한 파티: 승인 대기 → 승인 후 채팅 가능',
        '경기 당일 체크인으로 보증금 환불 받기'
      ]
    },
    {
      icon: BookOpen,
      title: '다이어리',
      description: '개인화된 페이지에서 나만의 야구 다이어리를 작성하세요',
      image: diaryScreenshot,
      guide: [
        '직관 기록과 경기 후기 작성',
        '사진과 메모로 추억 저장',
        '나만의 야구 일정 관리'
      ]
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Fixed Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #f3f4f6'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src={baseballLogo} alt="BEGA" className="w-8 h-8" />
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2d5f4f' }}>BEGA</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost"
                onClick={() => navigate('/login')}
                style={{ color: '#4b5563' }}
              >
                로그인
              </Button>
              <Button 
                onClick={() => navigate('/signup')}
                style={{ 
                  backgroundColor: '#2d5f4f', 
                  color: 'white',
                  borderRadius: '9999px',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem'
                }}
              >
                시작하기
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Subtle gradient background */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff, #f0fdfa)' 
          }} 
        />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <img src={baseballLogo} alt="BEGA Logo" className="w-16 h-16" />
              <span style={{ fontSize: '1.875rem', fontWeight: 900, color: '#2d5f4f' }}>BEGA</span>
            </div>
            
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, color: '#1a1a1a', lineHeight: '1.1', marginBottom: '1.5rem' }}>
              야구를 더<br />
              <span style={{ color: '#2d5f4f' }}>스마트</span>하게
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: '#4b5563', marginBottom: '2.5rem', lineHeight: '1.75' }}>
              KBO 야구 팬들을 위한 올인원 플랫폼<br />
              BEGA와 함께 모든 순간을 특별하게
            </p>

            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={() => navigate('/signup')}
                className="group"
                style={{ 
                  backgroundColor: '#2d5f4f', 
                  color: 'white',
                  padding: '1.5rem 2rem',
                  borderRadius: '9999px',
                  fontSize: '1.125rem'
                }}
              >
                지금 바로 시작하기
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => navigate('/service-info')}
                variant="outline"
                style={{ 
                  borderColor: '#2d5f4f', 
                  color: '#2d5f4f',
                  borderWidth: '2px',
                  padding: '1.5rem 2rem',
                  borderRadius: '9999px',
                  fontSize: '1.125rem',
                  backgroundColor: 'transparent'
                }}
              >
                더 알아보기
              </Button>
            </div>
          </div>

          {/* Laptop Mockup with Animation */}
          <div style={{ position: 'relative' }}>
            {/* Background decorative box - 뒤에 깔리는 민트색 박스 (고정) */}
            <div 
              style={{ 
                position: 'absolute',
                top: '2rem',
                right: '-1rem',
                width: '100%',
                height: '100%',
                borderRadius: '1.5rem',
                backgroundColor: '#d1fae5',
                zIndex: 0
              }} 
            />
            
            {/* Laptop (고정) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Screen */}
              <div 
                className="relative p-3"
                style={{ 
                  backgroundColor: '#1f2937', 
                  borderRadius: '1rem 1rem 0 0',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
                {/* Notch */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{ 
                    width: '8rem', 
                    height: '1.5rem', 
                    backgroundColor: '#1f2937',
                    borderRadius: '0 0 1rem 1rem',
                    zIndex: 10
                  }}
                />
                
                {/* Screen bezel */}
                <div 
                  className="relative overflow-hidden" 
                  style={{ 
                    backgroundColor: '#000', 
                    borderRadius: '0.5rem',
                    aspectRatio: '16/10'
                  }}
                >
                  {/* Green background with logo and text centered */}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                    style={{ 
                      background: 'linear-gradient(135deg, #2d5f4f 0%, #3d7f5f 100%)'
                    }}
                  >
                    <img src={begaCharacter} alt="BEGA Character" className="w-24 h-24 object-contain" />
                    <div className="text-center">
                      <h1 style={{ color: 'white', fontSize: '2.25rem', fontWeight: 900, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                        BEGA
                      </h1>
                      <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, letterSpacing: '0.1em' }}>
                        BASEBALL GUIDE
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Keyboard base */}
              <div 
                className="relative"
                style={{ 
                  height: '0.5rem',
                  background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)',
                  borderRadius: '0 0 1rem 1rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              
              {/* Shadow under laptop */}
              <div 
                className="absolute left-1/2 -translate-x-1/2"
                style={{ 
                  bottom: '-1rem',
                  width: '80%',
                  height: '1rem',
                  backgroundColor: 'rgba(17, 24, 39, 0.2)',
                  filter: 'blur(12px)',
                  borderRadius: '9999px'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32" style={{ backgroundColor: '#ffffff' ,  paddingTop: '8rem', paddingBottom: '12rem'}}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <div 
              className="inline-block px-4 py-2 mb-6"
              style={{ 
                backgroundColor: '#ecfdf5', 
                borderRadius: '9999px' 
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#2d5f4f', fontWeight: 600 }}>주요 기능</span>
            </div>
            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: '#1a1a1a', marginBottom: '1.5rem' }}>
              BEGA에서 사용 가능한<br />기능들
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              야구 팬들을 위한 모든 기능이 한곳에
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-32 items-start">
            {/* Feature List - 스크롤됨 */}
            <div className="space-y-4" style={{ minHeight: '150vh' }}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeFeature === index;
                const isExpanded = expandedFeature === index;
                return (
                  <div key={index}>
                    <button
                      onClick={() => {
                        setActiveFeature(index);
                        setExpandedFeature(isExpanded ? null : index);
                      }}
                      className="w-full text-left p-6 transition-all duration-300"
                      style={{ 
                        borderRadius: '1rem',
                        backgroundColor: '#ffffff',
                        boxShadow: isActive ? '0 4px 20px -5px rgba(0, 0, 0, 0.1)' : 'none',
                        borderLeft: isActive ? '4px solid #10b981' : '4px solid transparent',
                        border: isActive ? undefined : '1px solid #f3f4f6'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="p-3 flex-shrink-0 transition-all duration-300"
                          style={{ 
                            borderRadius: '0.75rem',
                            background: isActive 
                              ? 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)' 
                              : '#e5e7eb'
                          }}
                        >
                          <Icon 
                            className="w-6 h-6" 
                            style={{ color: isActive ? 'white' : '#9ca3af' }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 
                              className="mb-2"
                              style={{ 
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: '#1a1a1a'
                              }}
                            >
                              {feature.title}
                            </h3>
                            <ChevronDown 
                              className="w-5 h-5 transition-transform duration-300"
                              style={{ 
                                color: '#9ca3af',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                              }}
                            />
                          </div>
                          <p style={{ 
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    {/* Expandable Guide */}
                    {isExpanded && (
                      <div 
                        className="mt-4 p-6 animate-fade-in"
                        style={{ 
                          backgroundColor: '#ffffff',
                          borderRadius: '0.75rem',
                          border: '1px solid #e5e7eb',
                          marginLeft: '0'
                        }}
                      >
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>
                          사용 가이드
                        </h4>
                        <ul className="space-y-4">
                          {feature.guide.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-3" style={{ fontSize: '0.875rem', color: '#374151' }}>
                              <span 
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center"
                                style={{ 
                                  borderRadius: '9999px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                {stepIndex + 1}
                              </span>
                              <span style={{ paddingTop: '0.125rem', lineHeight: '1.5' }}>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Browser Mockup - Feature Preview */}
            <div style={{ position: 'relative' }} className="lg:sticky lg:top-24">
              {/* Background decorative box - 뒤에 깔리는 민트색 박스 */}
              <div 
                style={{ 
                  position: 'absolute',
                  top: '2rem',
                  right: '-1rem',
                  width: '100%',
                  height: '100%',
                  borderRadius: '1.5rem',
                  backgroundColor: '#d1fae5',
                  zIndex: 0
                }} 
              />
              
              {/* Laptop */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Screen */}
                <div 
                  className="relative p-3"
                  style={{ 
                    backgroundColor: '#1f2937', 
                    borderRadius: '1rem 1rem 0 0',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {/* Notch */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2"
                    style={{ 
                      width: '8rem', 
                      height: '1.5rem', 
                      backgroundColor: '#1f2937',
                      borderRadius: '0 0 1rem 1rem',
                      zIndex: 10
                    }}
                  />
                  
                  {/* Screen bezel */}
                  <div 
                    className="relative overflow-hidden" 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '0.5rem',
                      aspectRatio: '16/10'
                    }}
                  >
                    <img
                      key={activeFeature}
                      src={features[activeFeature].image}
                      alt={features[activeFeature].title}
                      className="w-full h-full object-contain animate-fade-in"
                    />
                  </div>
                </div>
                
                {/* Keyboard base */}
                <div 
                  className="relative"
                  style={{ 
                    height: '0.5rem',
                    background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)',
                    borderRadius: '0 0 1rem 1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                
                {/* Shadow under laptop */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ 
                    bottom: '-1rem',
                    width: '80%',
                    height: '1rem',
                    backgroundColor: 'rgba(17, 24, 39, 0.2)',
                    filter: 'blur(12px)',
                    borderRadius: '9999px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)',
          paddingTop: '8rem',
          paddingBottom: '8rem'
        }}
      >
        <div className="absolute inset-0">
          <div 
            style={{ 
              position: 'absolute',
              top: 0,
              left: '25%',
              width: '24rem',
              height: '24rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              filter: 'blur(64px)'
            }} 
          />
          <div 
            style={{ 
              position: 'absolute',
              bottom: 0,
              right: '25%',
              width: '24rem',
              height: '24rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              filter: 'blur(64px)'
            }} 
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div style={{ marginBottom: '2.5rem' }}>
            <img src={begaCharacter} alt="BEGA Character" style={{ width: '7rem', height: '7rem', margin: '0 auto' }} />
          </div>
          
          <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '3rem', fontWeight: 900 }}>
            지금 바로 시작하세요
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.125rem', marginBottom: '2.5rem', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.75' }}>
            BEGA와 함께 KBO 야구의 모든 순간을 더욱 특별하게 만들어보세요
          </p>
          
          <Button 
            onClick={() => navigate('/signup')}
            className="group"
            style={{ 
              backgroundColor: 'white',
              color: '#2d5f4f',
              padding: '1rem 2.5rem',
              borderRadius: '9999px',
              fontSize: '1.125rem',
              fontWeight: 600,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            무료로 시작하기
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '3rem 0' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-start gap-8">
            {/* Logo Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={baseballLogo} alt="BEGA" className="w-8 h-8" />
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a1a1a' }}>BEGA</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                KBO 야구 팬들을 위한 올인원 플랫폼
              </p>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                © 2025 BEGA. All rights reserved.
              </div>
            </div>

            {/* Links */}
            <div className="flex gap-16">
              <div>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>제품</h4>
                <ul className="space-y-2" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">기능</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">가격</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">FAQ</a></li>
                </ul>
              </div>

              <div>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>회사</h4>
                <ul className="space-y-2" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">소개</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">블로그</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">채용</a></li>
                </ul>
              </div>

              <div>
                <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>지원</h4>
                <ul className="space-y-2" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">고객센터</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">이용약관</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">개인정보처리방침</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}