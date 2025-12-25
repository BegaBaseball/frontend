import begaCharacter from '/src/assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import baseballLogo from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLandingScroll } from '../hooks/useLandingScroll';
import { LANDING_FEATURES } from '../constants/landing';
import FeatureCard from './FeatureCard';
import LaptopMockup from './LaptopMockup';

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const navigate = useNavigate();
  
  const {
    scrollProgress,
    featureRefs,
    laptopRef,
    featuresContainerRef
  } = useLandingScroll();

  const handleFeatureToggle = (index: number) => {
    setActiveFeature(index);
    setExpandedFeature(expandedFeature === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 transition-all duration-300"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2">
              <img src={baseballLogo} alt="BEGA" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-lg sm:text-xl font-black text-[#2d5f4f]">BEGA</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-gray-600 text-sm sm:text-base px-2 sm:px-4"
              >
                로그인
              </Button>
              <Button 
                onClick={() => navigate('/home')}
                className="bg-[#2d5f4f] text-white rounded-full px-4 sm:px-6 text-sm sm:text-base"
              >
                시작하기
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 sm:pt-20">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdfa]" 
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-4 sm:mb-8">
              <img src={baseballLogo} alt="BEGA Logo" className="w-10 h-10 sm:w-16 sm:h-16" />
              <span className="text-2xl sm:text-3xl font-black text-[#2d5f4f]">BEGA</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-[#1a1a1a] leading-tight mb-4 sm:mb-6">
              야구를 더<br />
              <span className="text-[#2d5f4f]">스마트</span>하게
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-10 leading-relaxed">
              KBO 야구 팬들을 위한 올인원 플랫폼<br className="hidden sm:block" />
              BEGA와 함께 모든 순간을 특별하게
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button 
                onClick={() => navigate('/home')}
                className="group bg-[#2d5f4f] text-white py-6 px-8 rounded-full text-lg w-full sm:w-auto"
              >
                지금 바로 시작하기
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
                variant="outline"
                className="border-2 border-[#2d5f4f] text-[#2d5f4f] bg-transparent py-6 px-8 rounded-full text-lg w-full sm:w-auto hover:bg-[#2d5f4f]/10"
              >
                더 알아보기
              </Button>
            </div>
          </div>

          {/* Hero Laptop Mockup */}
          <div className="relative mt-8 lg:mt-0 px-4 sm:px-0">
            <div className="absolute top-8 right-[-1rem] w-full h-full rounded-3xl bg-[#d1fae5] -z-10 hidden sm:block" />
            
            <div className="relative z-10">
              <div className="relative p-2 sm:p-3 bg-gray-800 rounded-t-xl sm:rounded-t-2xl shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-32 h-4 sm:h-6 bg-gray-800 rounded-b-lg z-10" />
                
                <div className="relative overflow-hidden bg-black rounded-lg aspect-[16/10]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#2d5f4f] to-[#3d7f5f]">
                    <img src={begaCharacter} alt="BEGA Character" className="w-16 h-16 sm:w-24 sm:h-24 object-contain" />
                    <div className="text-center">
                      <h1 className="text-white text-2xl sm:text-4xl font-black tracking-wider mb-1">
                        BEGA
                      </h1>
                      <p className="text-white/90 font-medium tracking-widest text-xs sm:text-base">
                        BASEBALL GUIDE
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative h-2 sm:h-3 bg-gradient-to-b from-gray-300 to-gray-400 rounded-b-xl sm:rounded-b-2xl shadow-md" />
              
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-[80%] h-4 bg-gray-900/20 blur-xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="text-center mb-12 sm:mb-24">
            <div className="inline-block px-4 py-2 mb-4 sm:mb-6 bg-[#ecfdf5] rounded-full">
              <span className="text-sm font-semibold text-[#2d5f4f]">주요 기능</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#1a1a1a] mb-4 sm:mb-6 leading-tight">
              BEGA에서 사용 가능한<br className="sm:hidden" /> 기능들
            </h2>
            <p className="text-lg sm:text-xl text-gray-500">
              야구 팬들을 위한 모든 기능이 한곳에
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start" ref={featuresContainerRef}>
            {/* Feature Cards */}
            <div className="space-y-6 sm:space-y-8">
              {LANDING_FEATURES.map((feature, index) => (
                <FeatureCard
                  key={index}
                  feature={feature}
                  index={index}
                  isActive={activeFeature === index}
                  isExpanded={expandedFeature === index}
                  onToggle={() => handleFeatureToggle(index)}
                  featureRef={(el) => (featureRefs.current[index] = el)}
                />
              ))}
            </div>

            {/* Laptop Mockup - Desktop Only */}
            <div className="hidden lg:block sticky top-32">
              <LaptopMockup
                activeFeature={activeFeature}
                features={LANDING_FEATURES}
                scrollProgress={scrollProgress}
                laptopRef={laptopRef}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 bg-gradient-to-br from-[#059669] via-[#0d9488] to-[#047857]">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 sm:mb-10">
            <img src={baseballLogo} alt="BEGA Character" className="w-20 h-20 sm:w-28 sm:h-28 mx-auto" />
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 sm:mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-white/90 text-lg sm:text-xl mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
            BEGA와 함께 KBO 야구의 모든 순간을 더욱 특별하게 만들어보세요
          </p>
          
          <Button 
            onClick={() => navigate('/home')}
            className="group bg-white text-[#2d5f4f] py-4 px-8 sm:py-5 sm:px-10 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all"
          >
            무료로 시작하기
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <img src={baseballLogo} alt="BEGA" className="w-7 h-7" />
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-[#2d5f4f]">BEGA</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">BASEBALL GUIDE</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed max-w-xs">
                KBO 야구 팬들을 위한 올인원 플랫폼
              </p>
              <div className="text-[10px] text-gray-400">
                © 2025 BEGA. All rights reserved.
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">제품</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">기능</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">가격</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">회사</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">채용</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-4">지원</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">고객센터</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">개인정보처리방침</a></li>
              </ul>
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