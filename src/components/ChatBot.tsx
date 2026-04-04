import { lazy, Suspense } from 'react';

const ChatBotRuntime = lazy(() => import('./ChatBotRuntime'));

interface ChatBotProps {
  autoOpen?: boolean;
  onClosed?: () => void;
}

export default function ChatBot({ autoOpen = false, onClosed }: ChatBotProps) {
  return (
    <Suspense fallback={null}>
      <ChatBotRuntime autoOpen={autoOpen} onClosed={onClosed} />
    </Suspense>
  );
}
