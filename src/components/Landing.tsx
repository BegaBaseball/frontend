import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import begaCharacter from '../assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.webp';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './Landing.css';
import { LANDING_FEATURES } from '../constants/landing';
import { useLandingScroll } from '../hooks/useLandingScroll';
import { useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import FeatureCard from './FeatureCard';
import { ArrowRightIcon } from './icons/PublicShellIcons';
import LaptopMockup from './LaptopMockup';
import { OptimizedImage } from './common/OptimizedImage';
import { Button } from './ui/button';
import ThemeToggleButton from './ThemeToggleButton';
import {
  CTAGroup,
  Container,
  MockupFrame,
  Section,
  SectionHeader,
  Stack,
  TextBlock,
} from './ui/page-primitives';

const FOOTER_SECTIONS = [
  {
    title: '제품',
    links: [
      { label: '주요 기능', href: '#features' },
      { label: '홈', href: '/home' },
      { label: '구장 가이드', href: '/stadium' },
    ],
  },
  {
    title: '탐색',
    links: [
      { label: '응원석', href: '/cheer' },
      { label: '직관 메이트', href: '/mate' },
      { label: '전력분석실', href: '/prediction' },
    ],
  },
  {
    title: '지원',
    links: [
      { label: '공지사항', href: '/notice' },
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
] as const;

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();

  useEffect(() => {
    requestLoadTrace('Landing mount');

    return () => {
      requestLoadTrace('Landing unmount');
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/home', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;
    const syncReducedMotion = () => {
      if (mediaQuery.matches) {
        root.setAttribute('data-reduced-motion', 'true');
      } else {
        root.removeAttribute('data-reduced-motion');
      }
    };

    syncReducedMotion();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncReducedMotion);
      return () => {
        mediaQuery.removeEventListener('change', syncReducedMotion);
        root.removeAttribute('data-reduced-motion');
      };
    }

    mediaQuery.addListener(syncReducedMotion);
    return () => {
      mediaQuery.removeListener(syncReducedMotion);
      root.removeAttribute('data-reduced-motion');
    };
  }, []);

  const {
    scrollProgress,
    scrollDistance,
    featureRefs,
    laptopRef,
    featuresContainerRef,
  } = useLandingScroll();

  const handleFeatureToggle = (index: number) => {
    setActiveFeature(index);
    setExpandedFeature(expandedFeature === index ? null : index);
  };

  const handleFooterLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }

    if (href.startsWith('/')) {
      navigate(href);
      return;
    }

    window.location.href = href;
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="landing-page">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={baseballLogo} alt="BEGA" className="h-8 w-8" />
              <div className="flex items-baseline gap-2">
                <span className="landing-wordmark text-lg text-primary sm:text-xl">
                  BEGA
                </span>
                <span className="landing-brand-caption hidden text-muted-foreground sm:inline">
                  Baseball Guide
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <Button
                variant="ghost"
                onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                size="touch"
                data-testid="landing-header-login"
                className="px-3 text-[16px] text-muted-foreground hover:bg-primary/5 hover:text-foreground sm:px-4"
              >
                로그인
              </Button>
              <Button
                size="touchLg"
                variant="brand"
                onClick={() => navigate('/home')}
                data-testid="landing-header-cta"
                className="px-5 sm:px-6"
              >
                시작하기
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Section
        className="landing-hero-backdrop landing-hero-section relative overflow-hidden"
        data-testid="landing-hero"
      >
        <Container className="landing-hero-grid">
          <Stack gap="md" className="items-center text-center lg:items-start lg:text-left">
            <span className="ds-kicker">KBO 야구 팬을 위한 올인원 플랫폼</span>

            <div className="flex items-center gap-3">
              <img src={baseballLogo} alt="BEGA Logo" className="h-12 w-12 sm:h-14 sm:w-14" />
              <span className="landing-wordmark text-2xl text-primary sm:text-3xl">
                BEGA
              </span>
            </div>

            <TextBlock measure="narrow" align="start" className="items-center lg:items-start">
              <h1 className="ds-hero-title max-w-md">
                야구를 더 <span className="text-primary">스마트</span>하게
              </h1>
              <p className="ds-section-copy">
                경기 일정, 응원, 구장 가이드, 예측, 메이트, 다이어리를 한 화면 흐름 안에
                정리해 KBO 팬의 하루를 더 가볍게 만듭니다.
              </p>
            </TextBlock>

            <CTAGroup align="start">
              <Button
                size="touchLg"
                variant="brand"
                onClick={() => navigate('/home')}
                data-testid="landing-hero-cta-primary"
                className="group w-full sm:w-auto"
              >
                지금 바로 시작하기
                <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
              <Button
                size="touchLg"
                variant="brandOutline"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
                data-testid="landing-hero-cta-secondary"
                className="w-full sm:w-auto"
              >
                더 알아보기
              </Button>
            </CTAGroup>
          </Stack>

          <MockupFrame className="mx-auto w-full max-w-xl p-5 sm:p-6">
            <div className="relative z-10">
              <div className="landing-device-shell">
                <div className="landing-device-notch" />

                <div className="landing-device-screen">
                  <div className="landing-device-screen-content absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <OptimizedImage
                      src={begaCharacter}
                      alt="BEGA Character"
                      className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                      priority={true}
                    />
                    <div>
                      <h2 className="landing-wordmark text-3xl sm:text-4xl">
                        BEGA
                      </h2>
                      <p className="landing-brand-caption mt-2 sm:text-[16px]">
                        Baseball Guide
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-device-base" />
            </div>
          </MockupFrame>
        </Container>
      </Section>

      <Section id="features" className="bg-background" data-testid="landing-features">
        <Container>
          <SectionHeader
            eyebrow="주요 기능"
            title={
              <>
                비율과 간격을 정리해 한눈에 이해되는 야구 경험
              </>
            }
            description="모든 기능을 같은 리듬으로 배치해 무엇이 중요한지 빠르게 파악할 수 있도록 구성했습니다."
            measure="default"
            className="lg:mb-16"
          />

          <div
            className="landing-feature-layout"
            ref={featuresContainerRef}
            data-testid="landing-feature-layout"
          >
            <div className="space-y-6">
              {LANDING_FEATURES.map((feature, index) => (
                <FeatureCard
                  key={index}
                  feature={feature}
                  index={index}
                  isActive={activeFeature === index}
                  isExpanded={expandedFeature === index}
                  onToggle={() => handleFeatureToggle(index)}
                  featureRef={(el) => {
                    featureRefs.current[index] = el;
                  }}
                />
              ))}
            </div>

            <div className="hidden lg:block">
              <LaptopMockup
                activeFeature={activeFeature}
                features={LANDING_FEATURES}
                scrollProgress={scrollProgress}
                scrollDistance={scrollDistance}
                laptopRef={laptopRef}
              />
            </div>
          </div>
        </Container>
      </Section>

      <section className="pb-16 pt-0 lg:pb-20" data-testid="landing-cta">
        <Container>
          <div className="landing-cta-panel px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
              <img
                src={baseballLogo}
                alt="BEGA Character"
                className="h-20 w-20 sm:h-24 sm:w-24"
              />
              <span className="mt-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[16px] font-semibold text-white">
                지금 시작하기
              </span>
              <h2 className="landing-cta-title mt-6 text-white">
                BEGA와 함께 KBO 야구의 모든 순간을 더 편하게 즐기세요
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
                규칙적인 레이아웃과 명확한 정보 구조로, 오늘 필요한 경기 정보와 팬 경험을
                빠르게 이어서 확인할 수 있습니다.
              </p>

              <Button
                size="touchLg"
                variant="brandOutline"
                onClick={() => navigate('/home')}
                data-testid="landing-cta-button"
                className="group mt-8 border-white/15 bg-white text-primary hover:bg-white/90"
              >
                무료로 시작하기
                <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-border/70 bg-secondary/40 py-10">
        <Container>
          <div className="landing-footer-grid">
            <div className="max-w-sm">
              <div className="flex items-center gap-3">
                <img src={baseballLogo} alt="BEGA" className="h-8 w-8" />
                <div className="flex items-baseline gap-2">
                  <span className="landing-wordmark text-lg text-primary">BEGA</span>
                  <span className="landing-brand-caption text-muted-foreground">
                    Baseball Guide
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[16px] leading-6 text-muted-foreground">
                KBO 야구 팬들을 위한 일정, 응원, 구장 정보, 예측, 메이트 기능을 한 곳에
                정리한 플랫폼입니다.
              </p>
              <p className="mt-4 text-[16px] font-semibold text-muted-foreground/80">
                © 2025 BEGA. All rights reserved.
              </p>
            </div>

            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-[16px] font-bold text-foreground">{section.title}</h3>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => handleFooterLinkClick(link.href)}
                        className="bg-transparent p-0 text-left text-[16px] leading-6 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </footer>
    </div>
  );
}
