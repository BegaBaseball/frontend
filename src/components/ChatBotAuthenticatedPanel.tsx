import { lazy, Suspense } from 'react';

import { SpinnerIcon } from './icons/PublicShellIcons';

const ChatBotSessionRuntime = lazy(() => import('./chatbot/ChatBotSessionRuntime'));

interface ChatBotAuthenticatedPanelProps {
  isOpen: boolean;
  isClosing: boolean;
  isMobile: boolean;
  onRequestClose: () => void;
}

export default function ChatBotAuthenticatedPanel({
  isOpen,
  isClosing,
  isMobile,
  onRequestClose,
}: ChatBotAuthenticatedPanelProps) {
  const authenticatedPanelFallback = (
    <div className="flex h-full items-center justify-center text-[16px] text-muted-foreground">
      <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
      챗봇 패널을 불러오는 중입니다.
    </div>
  );

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      data-testid="chatbot-panel"
      className={`
        ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}
        fixed z-[9999] flex flex-col overflow-hidden
        bg-white dark:bg-black border border-gray-200 dark:border-white/10
        ${isMobile
          ? 'inset-0 rounded-none max-h-[100dvh] max-w-full'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] sm:right-[calc(1.125rem+env(safe-area-inset-right))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] lg:right-[calc(1.5rem+env(safe-area-inset-right))] w-[min(400px,calc(100vw-2rem))] sm:w-[min(420px,calc(100vw-2.25rem))] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
        }
      `}
    >
      <Suspense fallback={authenticatedPanelFallback}>
        <ChatBotSessionRuntime
          isOpen={isOpen}
          onRequestClose={onRequestClose}
        />
      </Suspense>
    </div>
  );
}
