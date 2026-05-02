import { lazy, Suspense } from 'react';

import { SpinnerIcon } from '../icons/PublicShellIcons';

const ChatBotSessionStateRuntime = lazy(() => import('./ChatBotSessionStateRuntime'));

export interface ChatBotSessionRuntimeProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

export default function ChatBotSessionRuntime({
  isOpen,
  onRequestClose,
}: ChatBotSessionRuntimeProps) {
  const chatBotSessionFallback = (
    <div className="flex h-full items-center justify-center text-[16px] text-muted-foreground">
      <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
      세션 패널을 불러오는 중입니다.
    </div>
  );

  return (
    <Suspense fallback={chatBotSessionFallback}>
      <ChatBotSessionStateRuntime
        isOpen={isOpen}
        onRequestClose={onRequestClose}
      />
    </Suspense>
  );
}
