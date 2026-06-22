import chatBotIcon from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './ChatBot.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CloseIcon, SpinnerIcon } from './icons/PublicShellIcons';
import { useIsMobile } from '../hooks/use-mobile';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import ChatBotFloatingButton from './ChatBotFloatingButton';

const ChatBotAuthenticatedPanel = lazy(() => import('./ChatBotAuthenticatedPanel'));

interface ChatBotProps {
  autoOpen?: boolean;
  onClosed?: () => void;
}

export default function ChatBotRuntime({ autoOpen = false, onClosed }: ChatBotProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicHomeRoute = /^\/home\/?$/.test(location.pathname);
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [hasMountedAuthenticatedPanel, setHasMountedAuthenticatedPanel] = useState(autoOpen && !isPublicHomeRoute);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      if (!isPublicHomeRoute) {
        setHasMountedAuthenticatedPanel(true);
      }
    }
  }, [autoOpen, isPublicHomeRoute]);

  useEffect(() => {
    if (isOpen && !isPublicHomeRoute) {
      setHasMountedAuthenticatedPanel(true);
    }
  }, [isOpen, isPublicHomeRoute]);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleClose = () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClosed?.();
    }, 300);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const handleNavigateToLogin = () => {
    const loginPath = buildLoginPath(getCurrentRelativeUrl());
    handleClose();
    window.setTimeout(() => {
      navigate(loginPath);
    }, 300);
  };

  const isMateBottomActionRoute = /^\/mate(?:\/create|\/[^/]+(?:\/(apply|manage|checkin|chat))?)$/.test(location.pathname);
  const launcherOffsetClass = isMateBottomActionRoute
    ? 'bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
    : 'bottom-[var(--mobile-content-safe-bottom)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';

  const panelClassName = `
    ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}
    fixed z-[9999] flex flex-col overflow-hidden
    bg-white dark:bg-black border border-gray-200 dark:border-white/10
    ${isMobile
      ? 'inset-0 rounded-none max-h-[100dvh] max-w-full'
      : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] sm:right-[calc(1.125rem+env(safe-area-inset-right))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] lg:right-[calc(1.5rem+env(safe-area-inset-right))] w-[min(400px,calc(100vw-2rem))] sm:w-[min(420px,calc(100vw-2.25rem))] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
    }
  `;

  const authenticatedPanelFallback = (
    <div data-testid="chatbot-panel" className={panelClassName}>
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-primary">
        <div className="flex items-center gap-3">
          <span className="h-14 w-14 rounded-full bg-primary grid place-items-center p-0.5">
            <img
              src={chatBotIcon}
              alt="BEGA"
              className="pointer-events-none block h-13 w-13 rounded-full object-contain object-center"
              loading="eager"
              aria-hidden="true"
              decoding="async"
            />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-[16px] md:text-[16px] m-0">야구 가이드 BEGA</h3>
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[16px] font-semibold text-white">
                Beta
              </span>
            </div>
            <p className="text-white/80 text-[16px] m-0 truncate max-w-[220px]">대화 준비 중</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:outline-none focus:ring-0"
          aria-label="챗봇 닫기"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center text-[16px] text-muted-foreground">
        <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
        챗봇을 준비하는 중입니다.
      </div>
    </div>
  );

  return (
    <div className="fixed z-[9999]">
      {isPublicHomeRoute && isOpen && (
        <div data-testid="chatbot-panel" className={panelClassName}>
          <div className="p-3 md:p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-primary">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-full bg-primary grid place-items-center p-0.5">
                <img
                  src={chatBotIcon}
                  alt="BEGA"
                  className="pointer-events-none block h-13 w-13 rounded-full object-contain object-center"
                  loading="eager"
                  aria-hidden="true"
                  decoding="async"
                />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-[16px] md:text-[16px] m-0">야구 가이드 BEGA</h3>
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[16px] font-semibold text-white">
                    Beta
                  </span>
                </div>
                <p
                  data-testid="chatbot-session-title"
                  className="text-white/80 text-[16px] m-0 truncate max-w-[220px]"
                >
                  야구 정보 안내
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="챗봇 닫기"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 rounded-2xl bg-gray-100 dark:bg-card/50 border border-gray-300 dark:border-white/10">
                  <h3 className="text-gray-900 dark:text-white font-bold mb-2">로그인이 필요합니다</h3>
                  <p className="text-gray-600 dark:text-white text-[16px] font-semibold mb-4">야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.</p>
                  <button
                    type="button"
                    onClick={handleNavigateToLogin}
                    className="inline-block py-2.5 px-6 rounded-xl text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 no-underline font-semibold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                  >
                    로그인하러 가기
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-black/20">
              <button
                type="button"
                data-testid="chatbot-login-cta-footer"
                onClick={handleNavigateToLogin}
                className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#3d7f6f]"
              >
                로그인 후 질문하기
              </button>
              <p className="mt-2 text-center text-[16px] text-muted-foreground">
                경기 정보, 규정, 선수 기록 질문을 로그인 후 바로 이어서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasMountedAuthenticatedPanel && (
        <Suspense fallback={isOpen || isClosing ? authenticatedPanelFallback : null}>
          <ChatBotAuthenticatedPanel
            isOpen={isOpen}
            isClosing={isClosing}
            isMobile={isMobile}
            onRequestClose={handleClose}
          />
        </Suspense>
      )}

      {!isOpen && !autoOpen && (
        <ChatBotFloatingButton
          testId="chatbot-launcher"
          onClick={() => setIsOpen(true)}
          compactOnMobile
          className={`${launcherOffsetClass} right-[calc(1rem+env(safe-area-inset-right))]
                     sm:right-[calc(1.125rem+env(safe-area-inset-right))]
                     lg:right-[calc(1.5rem+env(safe-area-inset-right))]`}
        />
      )}
    </div>
  );
}
