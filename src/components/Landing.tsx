import { lazy, Suspense, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import begaCharacter from '../assets/landing/bega-character-192.webp';
import baseballLogo from '../assets/landing/bega-logo-192.webp';
import landingCriticalCss from './Landing.css?inline';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import { FirstLoadArrowRightIcon } from './icons/FirstLoadIcons';
import {
  BookOpenIcon,
  HomeIcon,
  LineChartIcon,
  MapPinIcon,
  MegaphoneIcon,
  UsersIcon,
} from './icons/PublicShellIcons';
import { Button } from './ui/button';
import ThemeToggleButton from './ThemeToggleButton';
import ViewportDeferred from './ViewportDeferred';
import {
  CTAGroup,
  Container,
  MockupFrame,
  Section,
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

const HERO_HIGHLIGHTS = [
  { Icon: HomeIcon, label: '경기일정' },
  { Icon: MegaphoneIcon, label: '응원석' },
  { Icon: MapPinIcon, label: '구장가이드' },
  { Icon: LineChartIcon, label: '전력분석' },
  { Icon: UsersIcon, label: '메이트' },
  { Icon: BookOpenIcon, label: '다이어리' },
] as const;

// Stagger helper for the hero entrance choreography (MOTION_INTENSITY tuned).
// Reduced-motion is handled in Landing.css, which zeroes `.landing-rise`.
const riseStyle = (delay: string): CSSProperties =>
  ({ '--rise-delay': delay } as unknown as CSSProperties);

const LazyLandingFeaturesRuntime = lazy(() => import('./LandingFeaturesRuntime'));

function LandingFeaturesFallback() {
  return (
    <Section id="features" className="bg-background" data-testid="landing-features-placeholder">
      <Container>
        <div className="mx-auto max-w-5xl" aria-hidden="true">
          <div className="mb-6 space-y-3 text-center">
            <div className="mx-auto h-5 w-20 rounded-full bg-primary/10" />
            <div className="mx-auto h-7 w-56 max-w-full rounded bg-muted" />
            <div className="mx-auto h-4 w-72 max-w-full rounded bg-muted/70" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                data-testid="landing-features-placeholder-card"
                className="h-20 rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:h-24 sm:p-4"
              >
                <div className="h-7 w-7 rounded-xl bg-primary/10 sm:h-8 sm:w-8" />
                <div className="mt-3 h-3 w-12 rounded bg-muted sm:mt-4 sm:h-4 sm:w-28" />
                <div className="mt-2 h-2 w-full rounded bg-muted/70 sm:h-3" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    requestLoadTrace('Landing mount');

    return () => {
      requestLoadTrace('Landing unmount');
    };
  }, []);

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
      <style>{landingCriticalCss}</style>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={baseballLogo} alt="BEGA" width={32} height={32} className="h-8 w-8" />
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
                className="px-3 text-body text-muted-foreground hover:bg-primary/5 hover:text-foreground sm:px-4"
              >
                로그인
              </Button>
              <Button
                size="touchLg"
                variant="brandOutline"
                onClick={() => navigate('/home')}
                data-testid="landing-header-cta"
                className="hidden px-4 sm:inline-flex sm:px-5"
              >
                앱 열기
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
          <Stack gap="sm" className="landing-hero-copy-stack items-center text-center lg:items-start lg:text-left">
            <span className="ds-kicker landing-rise" style={riseStyle('0s')}>
              KBO 야구 팬을 위한 올인원 플랫폼
            </span>

            <TextBlock
              measure="narrow"
              align="start"
              className="landing-rise items-center lg:items-start"
              style={riseStyle('0.06s')}
            >
              <h1 className="ds-hero-title max-w-md">
                야구를 더 <span className="text-primary">스마트</span>하게
              </h1>
              <p className="ds-section-copy">
                경기 일정, 응원, 구장 가이드, 예측, 메이트, 다이어리를 한 화면 흐름 안에
                정리해 KBO 팬의 하루를 더 가볍게 만듭니다.
              </p>
            </TextBlock>

            <CTAGroup align="start" className="landing-rise" style={riseStyle('0.12s')}>
              <Button
                size="touchLg"
                variant="brand"
                onClick={() => navigate('/home')}
                data-testid="landing-hero-cta-primary"
                data-cta-priority="primary"
                className="group w-full sm:w-auto"
              >
                지금 바로 시작하기
                <FirstLoadArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
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
                data-cta-priority="secondary"
                className="w-full sm:w-auto"
              >
                기능 둘러보기
              </Button>
            </CTAGroup>

            <ul
              className="landing-feature-peek landing-rise hidden justify-center sm:flex lg:justify-start"
              style={riseStyle('0.18s')}
              aria-hidden="true"
            >
              {HERO_HIGHLIGHTS.map(({ Icon, label }) => (
                <li key={label} className="landing-feature-peek-item">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </li>
              ))}
            </ul>
          </Stack>

          <MockupFrame
            className="landing-hero-preview landing-rise mx-auto w-full max-w-xl p-3 sm:p-5"
            style={riseStyle('0.2s')}
          >
            <div className="relative z-10">
              <div className="landing-device-shell">
                <div className="landing-device-notch" />

                <div className="landing-device-screen">
                  <div className="landing-device-screen-content absolute inset-0 flex flex-col justify-between p-4 text-center sm:p-5">
                    <div className="hidden items-center justify-between sm:flex">
                      <img
                        src={baseballLogo}
                        alt=""
                        aria-hidden="true"
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                      <span className="landing-device-pill">
                        <span className="landing-device-livedot" />
                        오늘의 라인업
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center gap-2">
                      <img
                        src={begaCharacter}
                        alt="BEGA Character"
                        className="h-14 w-14 object-contain sm:h-16 sm:w-16"
                        width={96}
                        height={96}
                        loading="eager"
                        decoding="async"
                        {...{ fetchpriority: 'high' }}
                      />
                      <div>
                        <h2 className="landing-wordmark text-2xl text-white sm:text-3xl">
                          BEGA
                        </h2>
                        <p className="landing-brand-caption mt-1 text-white/80 sm:text-body">
                          Baseball Guide
                        </p>
                      </div>
                    </div>

                    <div className="landing-device-dock hidden sm:flex" aria-hidden="true">
                      {HERO_HIGHLIGHTS.map(({ Icon, label }) => (
                        <span key={label} className="landing-device-dock-item">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-device-base" />
            </div>
          </MockupFrame>
        </Container>
      </Section>

      <ViewportDeferred
        fallback={<LandingFeaturesFallback />}
        rootMargin="240px 0px 240px 0px"
        containerTestId="landing-features-deferred"
      >
        <Suspense fallback={<LandingFeaturesFallback />}>
          <LazyLandingFeaturesRuntime />
        </Suspense>
      </ViewportDeferred>

      <section className="pb-16 pt-0 lg:pb-20" data-testid="landing-cta">
        <Container>
          <div className="landing-cta-panel px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
              <img
                src={baseballLogo}
                alt="BEGA Logo"
                width={96}
                height={96}
                className="h-20 w-20 sm:h-24 sm:w-24"
              />
              <span className="mt-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-body font-semibold text-white">
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
                <FirstLoadArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
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
                <img src={baseballLogo} alt="BEGA" width={32} height={32} className="h-8 w-8" />
                <div className="flex items-baseline gap-2">
                  <span className="landing-wordmark text-lg text-primary">BEGA</span>
                  <span className="landing-brand-caption text-muted-foreground">
                    Baseball Guide
                  </span>
                </div>
              </div>

              <p className="mt-4 text-body leading-6 text-muted-foreground">
                KBO 야구 팬들을 위한 일정, 응원, 구장 정보, 예측, 메이트 기능을 한 곳에
                정리한 플랫폼입니다.
              </p>
              <p className="mt-4 text-body font-semibold text-muted-foreground/80">
                © 2025 BEGA. All rights reserved.
              </p>
            </div>

            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-body font-bold text-foreground">{section.title}</h3>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <button
                        type="button"
                        onClick={() => handleFooterLinkClick(link.href)}
                        className="inline-flex min-h-11 min-w-11 items-center bg-transparent py-2 text-left text-body leading-6 text-muted-foreground transition-colors hover:text-foreground"
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
