import begaCharacter from '/src/assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import baseballLogo from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import homeScreenshot from '/src/assets/home.png';
import predictionScreenshot from '/src/assets/prediction.png';
import diaryScreenshot from '/src/assets/diary.png';
import screenshot2 from '/src/assets/cheer.png';
import screenshot3 from '/src/assets/stadium.png';
import mateScreenshot1 from '/src/assets/mate.png';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Users, MapPin, TrendingUp, MessageCircle, BookOpen, Home, CheckCircle2, Sparkles, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServiceInfo() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Home,
      title: 'KBO 경기일정 및 홈',
      description: '실시간 KBO 경기 정보와 팀 랭킹을 한눈에',
      image: homeScreenshot,
      details: [
        '오늘의 경기 일정을 실시간으로 확인',
        'KBO LIVE로 현재 진행 중인 경기 현황 체크',
        '팀별 순위와 경기 결과 한눈에 보기',
        '티켓 예매 정보 및 스토브리그 소식',
        '홈 화면에서 모든 정보를 빠르게 접근'
      ],
      color: '#3b82f6'
    },
    {
      icon: MessageCircle,
      title: '응원게시판',
      description: '마이팀 팬들과 함께 열정적으로 소통',
      image: screenshot2,
      details: [
        '마이팀 설정으로 우리 팀 게시글만 필터링',
        '경기 전 응원 메시지 작성',
        '경기 후 승리의 기쁨 또는 아쉬움 공유',
        '다른 팬들과 실시간 소통',
        '응원 문화를 함께 만들어가는 공간'
      ],
      color: '#8b5cf6'
    },
    {
      icon: MapPin,
      title: '구장 가이드',
      description: '야구장 방문 전 필수 정보를 미리 확인',
      image: screenshot3,
      details: [
        '구장 내부 맛집 정보 (위치, 메뉴, 가격)',
        '배달존 위치 및 이용 방법',
        '구장 근처 편의점 위치',
        '주차장 정보 및 대중교통 안내',
        '좌석별 추천 정보'
      ],
      color: '#f97316'
    },
    {
      icon: TrendingUp,
      title: '승리요정',
      description: '시즌 순위부터 경기 승부까지 예측하는 재미',
      image: predictionScreenshot,
      details: [
        '스토브리그 시즌: 올 시즌 팀 순위 예측',
        '시즌 중: 오늘의 경기 승부 예측',
        '예측 결과 저장 및 기록 관리',
        '친구들과 예측 결과 공유하고 비교',
        '시즌 종료 후 예측 정확도 확인'
      ],
      color: '#22c55e'
    },
    {
      icon: Users,
      title: '같이가요',
      description: '함께 직관할 메이트를 찾고 안전하게 거래',
      image: mateScreenshot1,
      details: [
        '직관 메이트 파티 생성 및 참여',
        '호스트: 신청자 관리 → 승인/거절 → 채팅방 개설',
        '게스트: 파티 신청 → 승인 대기 → 채팅 참여',
        '보증금 시스템으로 노쇼 방지',
        '경기 당일 체크인으로 보증금 자동 환불',
        '경기 3일 전 자정 자동 정산 (수수료 10%)'
      ],
      color: '#ec4899'
    },
    {
      icon: BookOpen,
      title: '다이어리',
      description: '나만의 야구 관람 일정과 추억을 기록',
      image: diaryScreenshot,
      details: [
        '직관 일정 및 경기 후기 작성',
        '경기 사진과 메모 저장',
        '관람한 경기 기록 누적',
        '개인화된 야구 캘린더',
        '추억을 되돌아보는 타임라인'
      ],
      color: '#6366f1'
    }
  ];

  const benefits = [
    {
      icon: Sparkles,
      title: '올인원 플랫폼',
      description: '야구 팬에게 필요한 모든 기능을 하나의 앱에서'
    },
    {
      icon: Shield,
      title: '안전한 거래',
      description: '보증금 시스템으로 안심하고 메이트 매칭'
    },
    {
      icon: Zap,
      title: '실시간 정보',
      description: 'KBO 경기 일정과 결과를 실시간으로 업데이트'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #f3f4f6'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                style={{ color: '#4b5563' }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                돌아가기
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <img src={baseballLogo} alt="BEGA" className="w-8 h-8" />
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2d5f4f' }}>BEGA</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => navigate('/login')}
                variant="ghost"
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
      <section className="relative py-24 overflow-hidden">
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff, #f0fdfa)' 
          }} 
        />
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div 
              className="inline-flex items-center gap-3 px-4 py-2 mb-8"
              style={{ 
                backgroundColor: 'white',
                borderRadius: '9999px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <img src={baseballLogo} alt="BEGA" className="w-6 h-6" />
              <span style={{ fontSize: '0.875rem', color: '#2d5f4f', fontWeight: 700 }}>
                BASEBALL GUIDE
              </span>
            </div>
            
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 900, lineHeight: '1.1', marginBottom: '1.5rem' }}>
              <span style={{ color: '#2d5f4f' }}>BEGA</span>와 함께하는<br />
              완벽한 야구 라이프
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '3rem', lineHeight: '1.75' }}>
              경기 일정부터 직관 메이트 매칭까지,<br />
              KBO 야구 팬들을 위한 6가지 핵심 기능을 제공합니다
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                onClick={() => navigate('/signup')}
                style={{ 
                  backgroundColor: '#2d5f4f', 
                  color: 'white',
                  padding: '1.5rem 2rem',
                  borderRadius: '9999px',
                  fontSize: '1.125rem'
                }}
              >
                무료로 시작하기
              </Button>
              <Button 
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
                기능 둘러보기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={index} 
                  className="p-8 transition-shadow"
                  style={{ 
                    backgroundColor: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div 
                    className="w-12 h-12 flex items-center justify-center mb-4"
                    style={{ 
                      borderRadius: '0.75rem',
                      background: 'linear-gradient(135deg, #2d5f4f 0%, #3d7f5f 100%)'
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: 'white' }} />
                  </div>
                  <h3 style={{ marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.125rem' }}>
                    {benefit.title}
                  </h3>
                  <p style={{ color: '#6b7280' }}>
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Detail Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>
              6가지 핵심 기능
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              BEGA가 제공하는 모든 기능을 자세히 알아보세요
            </p>
          </div>

          <div className="space-y-32">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div key={index} className={`grid lg:grid-cols-2 gap-16 items-center`}>
                  {/* Content */}
                  <div className={`${!isEven ? 'lg:order-2' : ''}`}>
                    <div 
                      className="inline-flex items-center gap-3 px-4 py-2 mb-6"
                      style={{ 
                        borderRadius: '9999px',
                        backgroundColor: feature.color,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: 'white' }} />
                      <span style={{ fontSize: '0.875rem', color: 'white', fontWeight: 700 }}>
                        기능 {index + 1}
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem' }}>
                      {feature.title}
                    </h3>
                    
                    <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '2rem' }}>
                      {feature.description}
                    </p>

                    <div className="space-y-4">
                      {feature.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-start gap-3">
                          <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#2d5f4f' }} />
                          <span style={{ color: '#374151' }}>
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image */}
                  <div className={`${!isEven ? 'lg:order-1' : ''}`}>
                    <div className="relative">
                      <div 
                        className="relative overflow-hidden"
                        style={{ 
                          backgroundColor: 'white',
                          borderRadius: '1rem',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          border: '1px solid #f3f4f6'
                        }}
                      >
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      
                      {/* Decorative gradient */}
                      <div 
                        className="absolute -z-10"
                        style={{
                          bottom: '-1.5rem',
                          [isEven ? 'right' : 'left']: '-1.5rem',
                          width: '100%',
                          height: '100%',
                          borderRadius: '1.5rem',
                          backgroundColor: feature.color,
                          opacity: 0.2
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Payment System Section */}
      <section className="py-24" style={{ background: 'linear-gradient(to bottom right, #f9fafb, #ffffff)' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div 
              className="inline-block px-4 py-2 mb-6"
              style={{ 
                backgroundColor: '#fdf2f8',
                borderRadius: '9999px'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#ec4899', fontWeight: 600 }}>안전한 거래 시스템</span>
            </div>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem' }}>
              메이트 결제 시스템
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
              보증금과 티켓값을 분리하여 안전하게 거래하세요
            </p>
          </div>

          <div 
            className="p-8 lg:p-12"
            style={{ 
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="space-y-8">
              {/* 결제 플로우 */}
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  결제 프로세스
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: '사용자 결제', desc: '티켓값 + 보증금을 BEGA 플랫폼에 결제' },
                    { step: '2', title: '호스트 승인', desc: '호스트가 신청자를 검토하고 승인/거절' },
                    { step: '3', title: 'BEGA 보관', desc: '승인 후 결제 금액을 BEGA가 안전하게 보관' },
                    { step: '4', title: '경기 3일 전 정산', desc: '자정에 티켓값을 호스트에게 정산 (수수료 10% 차감)' },
                    { step: '5', title: '체크인 후 보증금 환불', desc: '경기 당일 체크인 완료 시 보증금 자동 환불' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div 
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
                        style={{ 
                          borderRadius: '9999px',
                          backgroundColor: '#ec4899',
                          color: 'white',
                          fontWeight: 700
                        }}
                      >
                        {item.step}
                      </div>
                      <div style={{ paddingTop: '0.25rem' }}>
                        <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                          {item.title}
                        </h4>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 보증금 시스템 */}
              <div style={{ paddingTop: '2rem', borderTop: '1px solid #f3f4f6' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  보증금 시스템
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div 
                    className="p-6"
                    style={{ 
                      backgroundColor: '#ecfdf5',
                      borderRadius: '0.75rem'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#059669' }} />
                      <h4 style={{ fontWeight: 700, color: '#059669' }}>
                        노쇼 방지
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                      보증금을 통해 무단 불참을 방지하고 신뢰할 수 있는 매칭을 보장합니다
                    </p>
                  </div>
                  <div 
                    className="p-6"
                    style={{ 
                      backgroundColor: '#eff6ff',
                      borderRadius: '0.75rem'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5" style={{ color: '#2563eb' }} />
                      <h4 style={{ fontWeight: 700, color: '#2563eb' }}>
                        자동 환불
                      </h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                      경기 당일 체크인만 하면 보증금이 자동으로 환불됩니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-24 relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)'
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
          <img src={begaCharacter} alt="BEGA Character" className="w-32 h-32 mx-auto mb-8" />
          
          <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', fontWeight: 900 }}>
            지금 바로 시작하세요
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '42rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.75' }}>
            BEGA와 함께 KBO 야구의 모든 순간을 더욱 특별하게 만들어보세요
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={() => navigate('/signup')}
              className="group"
              style={{ 
                backgroundColor: 'white',
                color: '#2d5f4f',
                padding: '1.75rem 3rem',
                borderRadius: '9999px',
                fontSize: '1.25rem',
                fontWeight: 700,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              무료로 시작하기
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              style={{ 
                borderColor: 'white',
                color: 'white',
                borderWidth: '2px',
                padding: '1.75rem 3rem',
                borderRadius: '9999px',
                fontSize: '1.25rem',
                backgroundColor: 'transparent'
              }}
            >
              메인으로 돌아가기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6', padding: '4rem 0' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src={baseballLogo} alt="BEGA" className="w-8 h-8" />
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2d5f4f' }}>BEGA</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.75' }}>
                KBO 야구 팬들을 위한 올인원 플랫폼
              </p>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                © 2025 BEGA. All rights reserved.
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>제품</h4>
              <ul className="space-y-3" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <li><a href="#" className="hover:text-gray-900 transition-colors">기능</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">가격</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>회사</h4>
              <ul className="space-y-3" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <li><a href="#" className="hover:text-gray-900 transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">채용</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 700, color: '#1a1a1a' }}>지원</h4>
              <ul className="space-y-3" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <li><a href="#" className="hover:text-gray-900 transition-colors">고객센터</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}