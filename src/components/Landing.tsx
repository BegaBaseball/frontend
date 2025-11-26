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
                onClick={() => navigate('/home')}
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
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff, #f0fdfa)' 
          }} 
        />

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
                onClick={() => navigate('/home')}
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
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
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

          {/* Hero Laptop Mockup */}
          <div style={{ position: 'relative' }}>
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
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div 
                className="relative p-3"
                style={{ 
                  backgroundColor: '#1f2937', 
                  borderRadius: '1rem 1rem 0 0',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
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
                
                <div 
                  className="relative overflow-hidden" 
                  style={{ 
                    backgroundColor: '#000', 
                    borderRadius: '0.5rem',
                    aspectRatio: '16/10'
                  }}
                >
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
              
              <div 
                className="relative"
                style={{ 
                  height: '0.5rem',
                  background: 'linear-gradient(to bottom, #d1d5db, #9ca3af)',
                  borderRadius: '0 0 1rem 1rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              
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
      <section id="features" className="py-32" style={{ backgroundColor: '#ffffff', paddingTop: '8rem', paddingBottom: '8rem'}}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Title */}
          <div className="text-center mb-24" style={{ marginBottom: '6rem' }}>
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

          {/* Features Grid */}
          <div className="grid lg:grid-cols-2 gap-16 items-start" ref={featuresContainerRef}>
            {/* Feature Cards */}
            <div className="space-y-8">
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

            {/* Laptop Mockup */}
            <LaptopMockup
              activeFeature={activeFeature}
              features={LANDING_FEATURES}
              scrollProgress={scrollProgress}
              laptopRef={laptopRef}
            />
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
            <img src={baseballLogo} alt="BEGA Character" style={{ width: '7rem', height: '7rem', margin: '0 auto' }} />
          </div>
          
          <h2 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '3rem', fontWeight: 900 }}>
            지금 바로 시작하세요
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.125rem', marginBottom: '2.5rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.75', whiteSpace: 'nowrap' }}>
            BEGA와 함께 KBO 야구의 모든 순간을 더욱 특별하게 만들어보세요
          </p>
          
          <Button 
            onClick={() => navigate('/home')}
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
      <footer style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6', padding: '4rem 0' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-24">
            <div>
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