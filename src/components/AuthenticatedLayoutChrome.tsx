import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import ChatBotFloatingButton from './ChatBotFloatingButton';
import { Toaster } from './ui/sonner';

const ChatBot = lazy(() => import('./ChatBot'));

export default function AuthenticatedLayoutChrome() {
  const [isChatBotRequested, setIsChatBotRequested] = useState(false);
  const location = useLocation();
  const isMateBottomActionRoute = /^\/mate(?:\/create|\/[^/]+(?:\/(apply|manage|checkin|chat))?)$/.test(location.pathname);
  const mobileBottomNavOffsetClass =
    'bottom-[var(--mobile-content-safe-bottom)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';
  const chatBotOffsetClass = isMateBottomActionRoute
    ? 'bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
    : mobileBottomNavOffsetClass;

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
        <ChatBotFloatingButton
          testId="chatbot-request-launcher"
          onClick={() => setIsChatBotRequested(true)}
          compactOnMobile
          className={`right-[calc(1rem+env(safe-area-inset-right))]
                      sm:right-[calc(1.125rem+env(safe-area-inset-right))]
                      lg:right-[calc(1.5rem+env(safe-area-inset-right))]
                      ${chatBotOffsetClass}`}
        />
      )}
    </>
  );
}
