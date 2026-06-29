import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';

const AuthenticatedLayoutToaster = lazy(() => import('./AuthenticatedLayoutToaster'));
const AuthenticatedNotificationSocketBridge = lazy(() => import('./AuthenticatedNotificationSocketBridge'));
const ChatBot = lazy(() => import('./ChatBot'));
const ChatBotFloatingButton = lazy(() => import('./ChatBotFloatingButton'));

type AuthenticatedLayoutChromeProps = {
  enableAuthenticatedServices?: boolean;
};

export default function AuthenticatedLayoutChrome({
  enableAuthenticatedServices = true,
}: AuthenticatedLayoutChromeProps) {
  const [isChatBotRequested, setIsChatBotRequested] = useState(false);
  const location = useLocation();
  const shouldMountToaster = enableAuthenticatedServices || isChatBotRequested;
  const isMateBottomActionRoute = /^\/mate(?:\/create|\/[^/]+(?:\/(apply|manage|checkin|chat))?)$/.test(location.pathname);
  const mobileBottomNavOffsetClass =
    'bottom-[var(--mobile-content-safe-bottom)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';
  const chatBotOffsetClass = isMateBottomActionRoute
    ? 'bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
    : mobileBottomNavOffsetClass;

  return (
    <>
      {shouldMountToaster || enableAuthenticatedServices ? (
        <Suspense fallback={null}>
          {shouldMountToaster ? <AuthenticatedLayoutToaster /> : null}
          {enableAuthenticatedServices ? <AuthenticatedNotificationSocketBridge /> : null}
        </Suspense>
      ) : null}
      {isChatBotRequested ? (
        <Suspense fallback={null}>
          <ChatBot
            autoOpen
            onClosed={() => setIsChatBotRequested(false)}
          />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <ChatBotFloatingButton
            testId="chatbot-request-launcher"
            onClick={() => setIsChatBotRequested(true)}
            compactOnMobile
            className={`right-[calc(1rem+env(safe-area-inset-right))]
                        sm:right-[calc(1.125rem+env(safe-area-inset-right))]
                        lg:right-[calc(1.5rem+env(safe-area-inset-right))]
                        ${chatBotOffsetClass}`}
          />
        </Suspense>
      )}
    </>
  );
}
