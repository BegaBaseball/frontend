import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Home, 
  Heart, 
  MapPin, 
  TrendingUp, 
  BookOpen, 
  MessageCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Users
} from 'lucide-react';
import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { useUIStore } from '../store/uiStore';

export default function WelcomeGuide() {
  const { showWelcome, setShowWelcome } = useUIStore();
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // localStorage에서 "다시 보지 않기" 설정 확인
    const dontShowAgain = localStorage.getItem('bega_dont_show_guide');
    const hasVisited = localStorage.getItem('bega_has_visited');
    
    // "다시 보지 않기"를 선택하지 않았고, 처음 방문이면 팝업 표시
    if (!dontShowAgain && !hasVisited && showWelcome) {
      setOpen(true);
    }
  }, [showWelcome]);

  const handleClose = () => {
    localStorage.setItem('bega_has_visited', 'true');
    setOpen(false);
    setShowWelcome(false);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
    setOpen(false);
    setShowWelcome(false);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slides = [
    {
      title: 'BEGA에 오신 것을 환영합니다!',
      subtitle: 'BASEBALL GUIDE',
      description: 'KBO 야구 팬들을 위한 올인원 플랫폼, BEGA와 함께 모든 순간을 특별하게',
      icon: <img src={baseballLogo} alt="BEGA" className="w-32 h-32" />,
      color: '#2d5f4f',
      isIntro: true
    },
    {
      title: 'KBO 경기일정 및 홈',
      subtitle: '실시간 경기 정보',
      description: '실시간 경기 정보, 스토브리그 소식을 확인하세요',
      icon: <Home className="w-16 h-16" />,
      color: '#2d5f4f',
      features: [
        '홈 화면에서 오늘의 경기 일정 확인',
        'KBO LIVE로 실시간 경기 현황 체크',
        '팀별 랭킹과 티켓 예매 정보 한눈에'
      ]
    },
    {
      title: '응원게시판',
      subtitle: '팬들과 함께하는 공간',
      description: '마이팀 설정으로 필터링하여 우리 팀 소식만 모아보세요',
      icon: <Heart className="w-16 h-16" />,
      color: '#ef4444',
      features: [
        '마이팀 설정 후 우리 팀 게시글만 필터링',
        '응원 글 작성 및 다른 팬들과 소통',
        '경기 후기와 응원 메시지 공유'
      ]
    },
    {
      title: '구장 가이드',
      subtitle: '야구장 완전 정복',
      description: '야구장 내부 맛집, 배달존 및 근처 편의점, 주차장 정보 제공',
      icon: <MapPin className="w-16 h-16" />,
      color: '#f59e0b',
      features: [
        '구장 선택 후 카테고리별 정보 확인',
        '맛집, 배달존, 편의점, 주차장 정보 제공',
        '구장 방문 전 필수 정보 미리 체크'
      ]
    },
    {
      title: '승리예측',
      subtitle: '나만의 예측으로 즐기기',
      description: '순위예측과 승부예측으로 경기를 더 재미있게 즐기세요',
      icon: <TrendingUp className="w-16 h-16" />,
      color: '#8b5cf6',
      features: [
        '스토브리그 시즌: 순위 예측 활성화',
        '시즌 중: 승부 예측 활성화',
        '친구들과 예측 결과 저장하고 공유하기'
      ]
    },
    {
      title: '같이가요',
      subtitle: '함께 야구 보러 가요',
      description: '직관메이트를 구하고 함께 야구를 즐기세요',
      icon: <Users className="w-16 h-16" />,
      color: '#ec4899',
      features: [
        '내가 호스트인 파티: 신청 관리 → 승인/거절 → 채팅방 소통',
        '참여 신청한 파티: 승인 대기 → 승인 후 채팅 가능',
        '경기 당일 체크인으로 보증금 환불 받기'
      ]
    },
    {
      title: '다이어리',
      subtitle: '나의 야구 라이프',
      description: '개인화된 페이지에서 나만의 야구 다이어리를 작성하세요',
      icon: <BookOpen className="w-16 h-16" />,
      color: '#06b6d4',
      features: [
        '직관 기록과 경기 후기 작성',
        '사진과 메모로 추억 저장',
        '나만의 야구 일정 관리'
      ]
    },
    {
      title: 'AI 챗봇',
      subtitle: '야구가 궁금할 땐?',
      description: 'KBO 규칙, 선수 정보, 팀 전략까지! 헤드셋을 쓴 야구공 캐릭터가 친절하게 답변해드립니다.',
      icon: <MessageCircle className="w-16 h-16" />,
      color: '#10b981',
      features: [
        '24시간 답변 가능',
        '야구 규칙과 용어 설명',
        'KBO 선수 및 팀 정보 제공'
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-white dark:bg-gray-900 sm:rounded-2xl" hideCloseButton>
        <DialogTitle className="sr-only">
          {slides[currentSlide].title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {slides[currentSlide].description}
        </DialogDescription>
        <div className="relative">
          {/* Header */}
          <div 
            className="relative overflow-hidden px-8 py-6"
            style={{ backgroundColor: slides[currentSlide].color }}
          >
            <img 
              src={grassDecor} 
              alt="" 
              className="absolute bottom-0 left-0 w-full h-16 object-cover object-top opacity-20"
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={baseballLogo} alt="BEGA" className="w-10 h-10" />
                <div>
                  <h3 className="text-white tracking-wider" style={{ fontWeight: 900 }}>BEGA</h3>
                  <p className="text-white/80 text-xs">BASEBALL GUIDE</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-12 min-h-[500px] flex flex-col items-center justify-center text-center">
            {/* Icon */}
            <div 
              className="mb-6 rounded-2xl p-6 inline-flex"
              style={{ 
                backgroundColor: slides[currentSlide].isIntro ? 'transparent' : `${slides[currentSlide].color}15`,
                color: slides[currentSlide].color 
              }}
            >
              {slides[currentSlide].icon}
            </div>

            {/* Title */}
            <div className="mb-4">
              {!slides[currentSlide].isIntro && (
                <Badge 
                  className="mb-3 text-white"
                  style={{ backgroundColor: slides[currentSlide].color }}
                >
                  {slides[currentSlide].subtitle}
                </Badge>
              )}
              <h2 
                className="text-3xl mb-2"
                style={{ 
                  fontWeight: 900,
                  color: slides[currentSlide].isIntro ? slides[currentSlide].color : '#1f2937'
                }}
              >
                {slides[currentSlide].title}
              </h2>
              {slides[currentSlide].isIntro && (
                <p className="text-gray-600 text-lg" style={{ fontWeight: 600 }}>
                  {slides[currentSlide].subtitle}
                </p>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
              {slides[currentSlide].description}
            </p>

            {/* Features */}
            {slides[currentSlide].features && (
              <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-8">
                {slides[currentSlide].features.map((feature, index) => (
                  <Card 
                    key={index} 
                    className="px-4 py-3 border-l-4"
                    style={{ borderLeftColor: slides[currentSlide].color }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ fontWeight: 600 }}>
                        {feature}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Welcome Message for First Slide */}
            {slides[currentSlide].isIntro && (
              <div className="space-y-4 max-w-md">
                <Card className="p-6 border-2" style={{ borderColor: '#2d5f4f', backgroundColor: '#f0f9f6' }}>
                  <div className="text-left mb-4">
                    <h4 className="mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                      7가지 핵심 기능
                    </h4>
                    <p className="text-sm text-gray-600">
                      홈, 응원, 구장, 예측, 메이트, 마이페이지, 챗봇
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 text-left leading-relaxed">
                    야구 팬을 위한 모든 것이 담긴 BEGA에서<br/>
                    더욱 즐거운 야구 라이프를 시작하세요! ⚾
                  </p>
                </Card>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-8 py-6 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              {/* Progress Dots */}
              <div className="flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className="transition-all rounded-full"
                    style={{
                      width: currentSlide === index ? '32px' : '8px',
                      height: '8px',
                      backgroundColor: currentSlide === index ? slides[currentSlide].color : '#d1d5db'
                    }}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-2">
                {currentSlide > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="gap-2 text-white"
                  style={{ backgroundColor: slides[currentSlide].color }}
                >
                  {currentSlide < slides.length - 1 ? (
                    <>
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    '시작하기'
                  )}
                </Button>
              </div>
            </div>

            {/* Skip and Don't Show Again Buttons */}
            {currentSlide < slides.length - 1 && (
              <div className="text-center mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={handleClose}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  건너뛰기
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDontShowAgain}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  다시 보지 않기
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
