import { lazy, Suspense, useState } from 'react';
import { BotMessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { Toaster } from './ui/sonner';

const ChatBot = lazy(() => import('./ChatBot'));

export default function AuthenticatedLayoutChrome() {
  const [isChatBotRequested, setIsChatBotRequested] = useState(false);
  const location = useLocation();
  const isMateBottomActionRoute = /^\/mate(?:\/create|\/[^/]+(?:\/(apply|manage|checkin|chat))?)$/.test(location.pathname);
  const chatBotOffsetClass = isMateBottomActionRoute
    ? 'bottom-[calc(8rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]';

  useNotificationSocket(true);

  return (
    <>
      <Toaster />
      {isChatBotRequested ? (
        <Suspense fallback={null}>
          <ChatBot
            autoOpen
            onClosed={() => setIsChatBotRequested(false)}
          />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setIsChatBotRequested(true)}
          className={`fixed z-[9999] h-14 w-14
                     sm:h-16 sm:w-16 sm:min-h-[64px] sm:min-w-[64px]
                     md:h-18 md:w-18
                     rounded-full bg-primary text-white shadow-lg
                     p-0.5
                     border-none
                     inline-flex items-center justify-center overflow-hidden transition-all duration-200
                     focus:outline-none focus-visible:outline-none focus:ring-0
                     active:bg-primary active:text-white
                     touch-action-manipulation
                     right-[calc(1rem+env(safe-area-inset-right))]
                     md:right-[calc(1.25rem+env(safe-area-inset-right))]
                     ${chatBotOffsetClass}`}
          aria-label="챗봇 열기"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="h-14 w-14 rounded-full bg-primary grid place-items-center">
            <BotMessageSquare
              className="pointer-events-none h-7 w-7 text-white"
              aria-hidden="true"
            />
          </span>
        </button>
      )}
    </>
  );
}
