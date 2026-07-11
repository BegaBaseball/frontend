import { lazy, Suspense, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import homeScreenshot from '../assets/landing-showcase-home.webp';
import mateScreenshot from '../assets/landing-showcase-mate.webp';
import predictionScreenshot from '../assets/landing-showcase-prediction.webp';
import baseballLogo from '../assets/landing/bega-logo-192.webp';
import landingCriticalCss from './Landing.css?inline';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import { LandingArrowRightIcon } from './icons/LandingIcons';
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
      { label: '앱 열기', href: '/home' },
      { label: '구장 가이드', href: '/stadium' },
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

// Stagger helper for the hero entrance choreography (MOTION_INTENSITY tuned).
// Reduced-motion is handled in Landing.css, which zeroes `.landing-rise`.
const riseStyle = (delay: string): CSSProperties =>
  ({ '--rise-delay': delay } as unknown as CSSProperties);

const capabilitySkeletonImageStyle: CSSProperties = {
  background: 'hsl(var(--muted) / 0.28)',
};

const capabilitySkeletonTitleStyle: CSSProperties = {
  height: '0.875rem',
  width: '7.5rem',
  borderRadius: '999px',
  background: 'hsl(var(--muted) / 0.62)',
};

const capabilitySkeletonCopyStyle: CSSProperties = {
  ...capabilitySkeletonTitleStyle,
  width: 'min(100%, 14rem)',
  marginTop: '0.75rem',
  opacity: 0.72,
};

const LazyLandingCapabilityShowcase = lazy(() => import('./LandingCapabilityShowcase'));
const LazyLandingFeaturesRuntime = lazy(() => import('./LandingFeaturesRuntime'));

function LandingCapabilityFallback() {
  return (
    <Container>
      <div className="landing-capability-layout">
        <div className="landing-capability-copy">
          <h2 className="landing-capability-title">
            경기 전, 현장, 경기 후를 나눠 보여줍니다
          </h2>
          <p>
            예정 경기 확인부터 예측, 동행, 구장 동선, 응원, 다이어리까지 실제 화면으로 이어집니다.
          </p>
        </div>

        <div className="landing-capability-grid" data-testid="landing-capability-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <article
              key={index}
              className={`landing-capability-tile landing-capability-tile-${index + 1}`}
            >
              <div className="landing-capability-image" style={capabilitySkeletonImageStyle} />
              <div className="landing-capability-tile-copy">
                <div style={capabilitySkeletonTitleStyle} />
                <div style={capabilitySkeletonCopyStyle} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Container>
  );
}

function LandingFeaturesFallback() {
  return (
    <Section
      id="features"
      className="bg-background"
      data-testid="landing-features-placeholder"
      style={{ paddingBlock: 'var(--space-24)' }}
    >
      <Container>
        <div className="mx-auto max-w-5xl" aria-hidden="true">
          <div className="mb-8 space-y-3">
            <div className="h-7 w-56 max-w-full rounded bg-muted" />
            <div className="h-4 w-72 max-w-full rounded bg-muted/70" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                data-testid="landing-features-placeholder-card"
                className={`rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:p-4 ${
                  index === 0 ? 'col-span-2 h-24 sm:h-32' : 'h-20 sm:h-24'
                }`}
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
    <div className="landing-page-shell min-h-screen bg-background text-foreground" data-testid="landing-page">
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
            <span className="landing-hero-context landing-rise" style={riseStyle('0s')}>
              BEGA Baseball Guide
            </span>

            <TextBlock
              measure="narrow"
              align="start"
              className="landing-rise items-center lg:items-start"
              style={riseStyle('0.06s')}
            >
              <h1 className="ds-hero-title max-w-md">
                경기 전부터 기록까지 한 번에
              </h1>
              <p className="ds-section-copy">
                오늘 경기, 예측, 동행, 구장 정보, 응원과 직관 기록을 한 화면 흐름으로 이어봅니다.
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
                앱 열기
                <LandingArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
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
                기능 흐름 보기
              </Button>
            </CTAGroup>
          </Stack>

          <MockupFrame
            className="landing-hero-preview landing-rise mx-auto w-full max-w-3xl p-2 sm:p-3"
            style={riseStyle('0.18s')}
          >
            <figure className="landing-product-showcase" aria-label="BEGA 주요 화면 미리보기">
              <div className="landing-product-main">
                <img
                  src={homeScreenshot}
                  alt="BEGA 홈에서 오늘의 경기와 주요 정보를 확인하는 화면"
                  className="landing-product-main-image"
                  width={1440}
                  height={900}
                  loading="eager"
                  decoding="async"
                  {...{ fetchpriority: 'high' }}
                />
              </div>
              <div className="landing-product-side" aria-hidden="true">
                <div className="landing-product-side-item">
                  <img
                    src={predictionScreenshot}
                    alt=""
                    className="landing-product-side-image"
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    {...{ fetchpriority: 'low' }}
                  />
                  <span>전력분석실</span>
                </div>
                <div className="landing-product-side-item">
                  <img
                    src={mateScreenshot}
                    alt=""
                    className="landing-product-side-image"
                    width={1440}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    {...{ fetchpriority: 'low' }}
                  />
                  <span>같이가요</span>
                </div>
              </div>
              <figcaption className="landing-product-caption">
                오늘 경기에서 전력분석실, 같이가요까지 이어지는 실제 사용 흐름입니다.
              </figcaption>
            </figure>
          </MockupFrame>
        </Container>
      </Section>

      <section className="landing-capability-section" data-testid="landing-capability-showcase">
        <ViewportDeferred
          fallback={<LandingCapabilityFallback />}
          rootMargin="0px 0px 160px 0px"
          containerTestId="landing-capability-deferred"
        >
          <Suspense fallback={<LandingCapabilityFallback />}>
            <LazyLandingCapabilityShowcase />
          </Suspense>
        </ViewportDeferred>
      </section>

      <ViewportDeferred
        fallback={<LandingFeaturesFallback />}
        rootMargin="240px 0px 240px 0px"
        containerTestId="landing-features-deferred"
      >
        <Suspense fallback={<LandingFeaturesFallback />}>
          <LazyLandingFeaturesRuntime />
        </Suspense>
      </ViewportDeferred>

      <section className="py-20 lg:py-28" data-testid="landing-cta">
        <Container>
          <div className="landing-cta-panel px-6 py-10 sm:px-10 sm:py-12">
            <div className="landing-cta-layout">
              <div>
                <h2 className="landing-cta-title">
                  오늘의 야구 루틴을 BEGA에서 이어가세요
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  경기 전 준비부터 현장 정보, 팬 소통, 직관 기록까지 한 흐름으로 정리됩니다.
                </p>
              </div>

              <Button
                size="touchLg"
                variant="brand"
                onClick={() => navigate('/home')}
                data-testid="landing-cta-button"
                className="group w-full sm:w-auto"
              >
                앱 열기
                <LandingArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
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
                KBO 팬이 경기 전 준비, 현장 정보, 응원, 직관 기록을 한 흐름에서 확인하는
                플랫폼입니다.
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
