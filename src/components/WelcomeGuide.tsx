import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!showWelcome || !isReady) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isReady, showWelcome]);

  useEffect(() => {
    if (!showWelcome || !isReady) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isReady, showWelcome]);

  if (!showWelcome || !isReady || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-slate-950/45"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6" onClick={handleClose}>
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-testid="home-onboarding-compact"
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-[420px] overflow-hidden rounded-lg bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] ring-1 ring-black/10 dark:bg-background dark:ring-white/10"
        >
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/10">
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
              <p id={descriptionId} className="mt-1 text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
                오늘 할 행동만 먼저 보여드립니다.
              </p>
            </div>
            <Button
              variant="ghost"
              size="iconTouch"
              onClick={handleClose}
              className="-mr-2 -mt-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="가이드 닫기"
              data-testid="home-onboarding-close"
            >
              <CloseIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3 px-4 py-4">
            {ENTRY_ACTIONS.map((action) => (
              <div
                key={action.title}
                className="flex min-h-[64px] items-center gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${action.tone}`}>
                  {renderActionIcon(action.icon)}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-black leading-5 text-slate-950 dark:text-white">
                    {action.title}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-card">
            <Button
              variant="ghost"
              size="touch"
              onClick={handleDontShowAgain}
              className="rounded-md text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
