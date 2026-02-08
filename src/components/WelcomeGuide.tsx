import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Users,
  Megaphone,
  LineChart
} from 'lucide-react';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { useUIStore } from '../store/uiStore';

// Types
interface SlideBase {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

interface IntroSlide extends SlideBase {
  isIntro: true;
  features?: never;
}

interface FeatureSlide extends SlideBase {
  isIntro?: false;
  features: readonly string[];
}

type Slide = IntroSlide | FeatureSlide;

// Slide data moved outside component to prevent recreation on every render
const SLIDES_DATA: readonly Slide[] = [
  {
    title: 'BEGA에 오신 것을 환영합니다!',
    subtitle: 'BASEBALL GUIDE',
    description: 'KBO 야구 팬들을 위한 올인원 플랫폼, BEGA와 함께 모든 순간을 특별하게',
    icon: 'baseball',
    color: '#2d5f4f',
    isIntro: true
  },
  {
    title: 'KBO 경기일정 및 홈',
    subtitle: '실시간 경기 정보',
    description: '실시간 경기 정보, 스토브리그 소식을 확인하세요',
    icon: 'home',
    color: '#2d5f4f',
    features: [
      '홈 화면에서 오늘의 경기 일정 확인',
      'KBO LIVE로 실시간 경기 현황 체크',
      '팀별 랭킹과 티켓 예매 정보 한눈에'
    ]
  },
  {
    title: '응원석',
    subtitle: '팬들과 함께하는 공간',
    description: '마이팀 설정으로 필터링하여 우리 팀 소식만 모아보세요',
    icon: 'megaphone',
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
    icon: 'map',
    color: '#f59e0b',
    features: [
      '구장 선택 후 카테고리별 정보 확인',
      '맛집, 배달존, 편의점, 주차장 정보 제공',
      '구장 방문 전 필수 정보 미리 체크'
    ]
  },
  {
    title: '전력분석실',
    subtitle: '나만의 예측으로 즐기기',
    description: '전력 분석과 승부 예측으로 경기를 더 재미있게 즐기세요',
    icon: 'linechart',
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
    icon: 'users',
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
    icon: 'book',
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
    icon: 'message',
    color: '#10b981',
    features: [
      '24시간 답변 가능',
      '야구 규칙과 용어 설명',
      'KBO 선수 및 팀 정보 제공'
    ]
  }
] as const;

// Icon component to prevent recreation
const SlideIcon = ({ iconType, color, isIntro }: { iconType: string; color: string; isIntro?: boolean }) => {
  const iconClass = isIntro ? "w-20 h-20 sm:w-32 sm:h-32" : "w-12 h-12 sm:w-16 sm:h-16";

  const icons = {
    baseball: <img src={baseballLogo} alt="BEGA 로고" className={iconClass} />,
    home: <Home className={iconClass} />,
    megaphone: <Megaphone className={iconClass} />,
    map: <MapPin className={iconClass} />,
    trending: <TrendingUp className={iconClass} />,
    users: <Users className={iconClass} />,
    book: <BookOpen className={iconClass} />,
    message: <MessageCircle className={iconClass} />,
    linechart: <LineChart className={iconClass} />
  };

  return (
    <div
      className="mb-4 sm:mb-6 rounded-2xl p-4 sm:p-6 inline-flex"
      style={{
        backgroundColor: isIntro ? 'transparent' : `${color}15`,
        color: color
      }}
    >
      {icons[iconType as keyof typeof icons]}
    </div>
  );
};

export default function WelcomeGuide() {
  const { showWelcome, setShowWelcome } = useUIStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // localStorage에서 "다시 보지 않기" 설정 확인
    const dontShowAgain = localStorage.getItem('bega_dont_show_guide');
    const hasVisited = localStorage.getItem('bega_has_visited');

    // "다시 보지 않기"를 선택했거나 이미 방문했으면 닫기
    if (dontShowAgain || hasVisited) {
      setShowWelcome(false);
    }
  }, [setShowWelcome]);

  // Keyboard navigation
  useEffect(() => {
    if (!showWelcome) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, currentSlide]);

  const handleClose = useCallback(() => {
    localStorage.setItem('bega_has_visited', 'true');
    setShowWelcome(false);
    setCurrentSlide(0); // Reset slide when closing
  }, [setShowWelcome]);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
    setShowWelcome(false);
    setCurrentSlide(0);
  }, [setShowWelcome]);

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES_DATA.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleClose();
    }
  }, [currentSlide, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const currentSlideData = useMemo(() => SLIDES_DATA[currentSlide], [currentSlide]);

  const headerStyle = useMemo(() => ({
    backgroundColor: currentSlideData.color
  }), [currentSlideData.color]);

  const buttonStyle = useMemo(() => ({
    backgroundColor: currentSlideData.color
  }), [currentSlideData.color]);

  return (
    <Dialog open={showWelcome} onOpenChange={(isOpen: boolean) => !isOpen && handleClose()}>
      <DialogContent
        className="max-w-3xl w-[95vw] sm:w-[90vw] md:w-full max-h-[90vh] p-0 overflow-hidden border-0 bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl"
        hideCloseButton
      >
        <DialogTitle className="sr-only">
          {currentSlideData.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {currentSlideData.description}
        </DialogDescription>

        <div className="relative">
          {/* Header */}
          <div
            className="relative overflow-hidden px-4 sm:px-8 py-4 sm:py-6"
            style={headerStyle}
          >
            <img
              src={grassDecor}
              alt=""
              role="presentation"
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-full h-12 sm:h-16 object-cover object-top opacity-20"
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                {imageError ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">⚾</span>
                  </div>
                ) : (
                  <img
                    src={baseballLogo}
                    alt="BEGA 로고"
                    className="w-8 h-8 sm:w-10 sm:h-10"
                    onError={() => setImageError(true)}
                  />
                )}
                <div>
                  <h3 className="text-white tracking-wider text-sm sm:text-base" style={{ fontWeight: 900 }}>
                    BEGA
                  </h3>
                  <p className="text-white/80 text-[10px] sm:text-xs">BASEBALL GUIDE</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white/80 hover:text-white hover:bg-white/10 transition-colors h-8 w-8 sm:h-9 sm:w-9"
                aria-label="가이드 닫기"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 min-h-[300px] sm:min-h-[400px] md:min-h-[500px] max-h-[calc(90vh-180px)] overflow-y-auto flex flex-col items-center justify-center text-center">
            {/* Icon */}
            <SlideIcon
              iconType={currentSlideData.icon}
              color={currentSlideData.color}
              isIntro={currentSlideData.isIntro}
            />

            {/* Title */}
            <div className="mb-2 sm:mb-3 md:mb-4">
              {!currentSlideData.isIntro && (
                <Badge
                  className="mb-2 sm:mb-3 text-white text-[10px] sm:text-xs md:text-sm"
                  style={{ backgroundColor: currentSlideData.color }}
                >
                  {currentSlideData.subtitle}
                </Badge>
              )}
              <h2
                className="text-xl sm:text-2xl md:text-3xl mb-1.5 sm:mb-2 px-2 dark:text-white"
                style={{
                  fontWeight: 900,
                  color: currentSlideData.isIntro ? currentSlideData.color : undefined
                }}
              >
                {currentSlideData.title}
              </h2>
              {currentSlideData.isIntro && (
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-lg" style={{ fontWeight: 600 }}>
                  {currentSlideData.subtitle}
                </p>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8 max-w-md leading-relaxed px-2 sm:px-4">
              {currentSlideData.description}
            </p>

            {/* Features */}
            {currentSlideData.features && (
              <div className="grid grid-cols-1 gap-1.5 sm:gap-2 md:gap-3 w-full max-w-md mb-4 sm:mb-6 md:mb-8 px-2">
                {currentSlideData.features.map((feature: string, index: number) => (
                  <Card
                    key={index}
                    className="px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-l-4 text-left bg-white dark:bg-gray-800"
                    style={{ borderLeftColor: currentSlideData.color }}
                  >
                    <span className="text-[11px] sm:text-xs md:text-sm text-gray-700 dark:text-gray-200 leading-relaxed" style={{ fontWeight: 600 }}>
                      {feature}
                    </span>
                  </Card>
                ))}
              </div>
            )}

            {/* Welcome Message for First Slide */}
            {currentSlideData.isIntro && (
              <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-md px-2">
                <Card
                  className="p-3 sm:p-4 md:p-6 border-2 dark:bg-[#1a2e28]"
                  style={{ borderColor: '#2d5f4f', backgroundColor: undefined }}
                >
                  <div className="text-left mb-2 sm:mb-3 md:mb-4 bg-[#f0f9f6] dark:bg-transparent rounded-lg p-2 sm:p-0">
                    <h4 className="mb-1 text-xs sm:text-sm md:text-base" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                      7가지 핵심 기능
                    </h4>
                    <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      홈, 응원, 구장, 예측, 메이트, 마이페이지, 챗봇
                    </p>
                  </div>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 text-left leading-relaxed">
                    야구 팬을 위한 모든 것이 담긴 BEGA에서<br />
                    더욱 즐거운 야구 라이프를 시작하세요! ⚾
                  </p>
                </Card>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Progress Dots */}
              <div className="flex gap-0.5 sm:gap-1">
                {SLIDES_DATA.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className="p-1.5 sm:p-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full"
                    aria-label={`슬라이드 ${index + 1}로 이동`}
                    aria-current={currentSlide === index}
                  >
                    <span
                      className="block rounded-full transition-all"
                      style={{
                        width: currentSlide === index ? '20px' : '8px',
                        height: '8px',
                        backgroundColor: currentSlide === index ? currentSlideData.color : '#d1d5db',
                        boxShadow: currentSlide === index ? `0 0 0 2px ${currentSlideData.color}20` : 'none'
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-1.5 sm:gap-2">
                {currentSlide > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="gap-1 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 px-2.5 sm:px-4 min-w-[44px] dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-label="이전 슬라이드"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">이전</span>
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="gap-1 sm:gap-2 text-white text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 min-w-[60px] sm:min-w-[80px]"
                  style={buttonStyle}
                  aria-label={currentSlide < SLIDES_DATA.length - 1 ? "다음 슬라이드" : "가이드 시작하기"}
                >
                  {currentSlide < SLIDES_DATA.length - 1 ? (
                    <>
                      다음
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  ) : (
                    '시작하기'
                  )}
                </Button>
              </div>
            </div>

            {/* Skip and Don't Show Again Buttons */}
            {currentSlide < SLIDES_DATA.length - 1 && (
              <div className="text-center mt-2.5 sm:mt-4 flex items-center justify-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 h-auto p-1.5 min-h-[44px] min-w-[44px]"
                >
                  건너뛰기
                </Button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDontShowAgain}
                  className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 h-auto p-1.5 min-h-[44px]"
                >
                  다시 보지 않기
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
