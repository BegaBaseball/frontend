import { useCallback, useEffect, useId, useState } from 'react';

import { Button } from './ui/button';
import {
  CloseIcon,
  HomeIcon,
  LineChartIcon,
  MegaphoneIcon,
  UsersIcon,
} from './icons/PublicShellIcons';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useUIStore } from '../store/uiStore';

const ENTRY_ACTIONS = [
  {
    title: '오늘 경기',
    description: '일정, 순위, 다음 행동을 한 화면에서 봅니다.',
    icon: 'home',
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200',
  },
  {
    title: '전력분석실',
    description: '경기별 승부 예측으로 바로 이어집니다.',
    icon: 'prediction',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200',
  },
  {
    title: '응원과 같이가요',
    description: '팬 글과 직관 모임은 필요할 때 이어갑니다.',
    icon: 'community',
    tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200',
  },
] as const;

const renderActionIcon = (icon: typeof ENTRY_ACTIONS[number]['icon']) => {
  if (icon === 'home') {
    return <HomeIcon className="h-5 w-5" />;
  }

  if (icon === 'prediction') {
    return <LineChartIcon className="h-5 w-5" />;
  }

  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <MegaphoneIcon className="absolute h-4 w-4 -translate-x-1" />
      <UsersIcon className="absolute h-4 w-4 translate-x-1 translate-y-1" />
    </span>
  );
};

export default function WelcomeGuide() {
  const showWelcome = useUIStore((state) => state.showWelcome);
  const setShowWelcome = useUIStore((state) => state.setShowWelcome);
  const [isReady, setIsReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dontShowAgain = localStorage.getItem('bega_dont_show_guide');
    const hasVisited = localStorage.getItem('bega_has_visited');

    if (dontShowAgain || hasVisited) {
      setShowWelcome(false);
      return;
    }

    setIsReady(true);
  }, [setShowWelcome]);

  const handleClose = useCallback(() => {
    localStorage.setItem('bega_has_visited', 'true');
    setIsReady(false);
    setShowWelcome(false);
  }, [setShowWelcome]);

  const handleDontShowAgain = useCallback(() => {
    localStorage.setItem('bega_has_visited', 'true');
    localStorage.setItem('bega_dont_show_guide', 'true');
    setIsReady(false);
    setShowWelcome(false);
  }, [setShowWelcome]);

  if (!showWelcome || !isReady) {
    return null;
  }

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid="home-onboarding-inline"
      data-variant="dismissible-banner"
      className="mb-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
    >
      <div className="flex items-start gap-3 border-b border-border/70 px-3 py-3 sm:px-4">
        {imageError ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-black text-primary">
            B
          </div>
        ) : (
          <img
            src={baseballLogo}
            alt="BEGA 로고"
            className="h-10 w-10 shrink-0"
            onError={() => setImageError(true)}
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-black leading-tight text-slate-950 dark:text-white">
            BEGA 시작하기
          </h2>
          <p id={descriptionId} className="mt-1 text-sm font-semibold leading-5 text-slate-600 dark:text-white">
            오늘 할 행동만 먼저 보여드립니다.
          </p>
        </div>
        <Button
          variant="ghost"
          size="iconTouch"
          onClick={handleClose}
          className="-mr-2 -mt-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="가이드 닫기"
          data-testid="home-onboarding-close"
        >
          <CloseIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid gap-2 px-3 py-3 md:grid-cols-3 md:px-4">
        {ENTRY_ACTIONS.map((action) => (
          <div
            key={action.title}
            className="flex min-h-[52px] items-center gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${action.tone}`}>
              {renderActionIcon(action.icon)}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-black leading-5 text-slate-950 dark:text-white">
                {action.title}
              </p>
              <p className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-600 dark:text-white">
                {action.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/70 bg-muted/60 px-3 py-2.5">
        <Button
          variant="ghost"
          size="touch"
          onClick={handleDontShowAgain}
          className="rounded-md text-slate-600 hover:bg-white hover:text-slate-900 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
          data-testid="home-onboarding-dismiss"
        >
          다시 보지 않기
        </Button>
        <Button
          size="touch"
          onClick={handleClose}
          className="rounded-md"
          data-testid="home-onboarding-start-cta"
        >
          바로 시작
        </Button>
      </div>
    </section>
  );
}
