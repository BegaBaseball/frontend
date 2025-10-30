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
  ChevronLeft
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
      description: 'KBO 야구를 더욱 즐겁게 즐기는 방법, BEGA와 함께하세요',
      icon: <img src={baseballLogo} alt="BEGA" className="w-32 h-32" />,
      color: '#2d5f4f',
      isIntro: true
    },
    {
      title: '홈',
      subtitle: '실시간 KBO 정보',
      description: '오늘의 경기 일정, 실시간 스코어, 팀 순위를 한눈에 확인하세요. 시즌과 비시즌에 맞춘 다양한 정보를 제공합니다.',
      icon: <Home className="w-16 h-16" />,
      color: '#2d5f4f',
      features: ['실시간 경기 정보', '팀 순위 현황', '스토브리그 소식']
    },
    {
      title: '응원게시판',
      subtitle: '팬들과 함께하는 공간',
      description: '우리 팀을 응원하고, 다른 팬들과 소통하며 야구의 즐거움을 나누세요.',
      icon: <Heart className="w-16 h-16" />,
      color: '#ef4444',
      features: ['팀별 응원 게시판', '자유로운 소통', '좋아요 & 댓글']
    },
    {
      title: '구장 가이드',
      subtitle: '야구장 완전 정복',
      description: '전국 10개 구장의 좌석 정보, 맛집, 주차 정보까지 직관 준비의 모든 것을 알려드립니다.',
      icon: <MapPin className="w-16 h-16" />,
      color: '#f59e0b',
      features: ['좌석별 시야 정보', '구장 주변 맛집', '교통 & 주차 안내']
    },
    {
      title: '승부예측',
      subtitle: '나만의 예측으로 즐기기',
      description: '오늘의 경기 결과를 예측하고, 다른 팬들과 예측 결과를 공유해보세요.',
      icon: <TrendingUp className="w-16 h-16" />,
      color: '#8b5cf6',
      features: ['경기 결과 예측', '예측 통계 확인', '랭킹 시스템']
    },
    {
      title: '직관 다이어리',
      subtitle: '소중한 야구 추억 기록',
      description: '직관 경험을 사진과 함께 기록하고, 나만의 야구 다이어리를 만들어보세요.',
      icon: <BookOpen className="w-16 h-16" />,
      color: '#06b6d4',
      features: ['경기 관람 기록', '사진 첨부 가능', '감정 & 메모']
    },
    {
      title: 'AI 챗봇',
      subtitle: '야구가 궁금할 땐?',
      description: 'KBO 규칙, 선수 정보, 팀 전략까지! AI 챗봇이 친절하게 답변해드립니다.',
      icon: <MessageCircle className="w-16 h-16" />,
      color: '#10b981',
      features: ['24시간 답변', '야구 규칙 설명', '실시간 정보 제공']
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-0" hideCloseButton>
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
                      6가지 핵심 기능
                    </h4>
                    <p className="text-sm text-gray-600">
                      홈, 응원, 구장, 예측, 다이어리, 챗봇
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
