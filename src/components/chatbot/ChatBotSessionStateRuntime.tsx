import chatBotIcon from '../../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import {
  X,
  Star,
  History,
  MessageSquareText,
  Loader2,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import { useChatBot } from '../../hooks/useChatBot';
import type { ChatFavoriteItem } from '../../types/chatbot';
import type { ChatBotSessionRuntimeProps } from './ChatBotSessionRuntime';

const ChatBotConversationRuntime = lazy(() => import('./ChatBotConversationRuntime'));
const ChatBotHistoryTab = lazy(() => import('./ChatBotHistoryTab'));
const ChatBotFavoritesTab = lazy(() => import('./ChatBotFavoritesTab'));

export default function ChatBotSessionStateRuntime({
  isOpen,
  onRequestClose,
}: ChatBotSessionRuntimeProps) {
  const {
    sessions,
    currentSessionId,
    currentSessionTitle,
    messages,
    favorites,
    inputMessage,
    setInputMessage,
    isTyping,
    isProcessing,
    rateLimitActive,
    rateLimitCountdown,
    rateLimitStage,
    pendingMessage,
    isLoadingSessions,
    isLoadingMessages,
    isLoadingFavorites,
    messagesEndRef,
    messagesContainerRef,
    handleSendMessage,
    handleRetrySend,
    handleRestorePendingMessage,
    handleCancelStream,
    handleCreateNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleToggleFavorite,
    handleUseFavoritePrompt,
  } = useChatBot(true);

  const [activeTab, setActiveTab] = useState<'conversation' | 'history' | 'favorites'>('conversation');

  const handleClose = () => {
    if (isProcessing) {
      handleCancelStream();
    }
    onRequestClose();
  };

  const handleOpenSession = async (sessionId: number) => {
    await handleSelectSession(sessionId);
    setActiveTab('conversation');
  };

  const handleFavoritePromptClick = (favorite: ChatFavoriteItem) => {
    handleUseFavoritePrompt(favorite);
    setActiveTab('conversation');
  };

  const handleFavoriteSessionClick = async (favorite: ChatFavoriteItem) => {
    await handleOpenSession(favorite.sessionId);
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API not available
    }
  };

  const chatbotTabFallback = (
    <div className="flex h-full items-center justify-center text-[16px] text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      탭을 불러오는 중입니다.
    </div>
  );

  return (
    <>
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
              <h3 className="text-white font-bold text-[16px] md:text-[17px] m-0">야구 가이드 BEGA</h3>
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[16px] font-semibold text-white">
                Beta
              </span>
            </div>
            <p
              data-testid="chatbot-session-title"
              className="text-white/80 text-[16px] md:text-[16px] m-0 truncate max-w-[220px] font-semibold"
            >
              {currentSessionTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:outline-none focus:ring-0"
          aria-label="챗봇 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex h-full flex-col gap-0">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div className="flex w-full rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-white/10 dark:bg-white/5">
            {[
              { value: 'conversation', label: '대화', icon: MessageSquareText, testId: 'chatbot-tab-conversation' },
              { value: 'history', label: '히스토리', icon: History, testId: 'chatbot-tab-history' },
              { value: 'favorites', label: '즐겨찾기', icon: Star, testId: 'chatbot-tab-favorites' },
            ].map(({ value, label, icon: Icon, testId }) => {
              const isActive = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-testid={testId}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value as typeof activeTab)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[16px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white'
                      : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'conversation' && (
          <Suspense fallback={chatbotTabFallback}>
            <ChatBotConversationRuntime
              isPanelOpen={isOpen}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              isTyping={isTyping}
              isProcessing={isProcessing}
              rateLimitActive={rateLimitActive}
              rateLimitCountdown={rateLimitCountdown}
              rateLimitStage={rateLimitStage}
              pendingMessage={pendingMessage}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              handleSendMessage={handleSendMessage}
              handleRetrySend={handleRetrySend}
              handleRestorePendingMessage={handleRestorePendingMessage}
              handleCancelStream={handleCancelStream}
              handleToggleFavorite={handleToggleFavorite}
              onRequestClose={handleClose}
            />
          </Suspense>
        )}

        {activeTab === 'history' && (
          <div className="min-h-0 flex-1 p-4">
            <Suspense fallback={chatbotTabFallback}>
              <ChatBotHistoryTab
                currentSessionId={currentSessionId}
                sessions={sessions}
                isLoadingSessions={isLoadingSessions}
                onCreateNewSession={async () => {
                  const sessionId = await handleCreateNewSession();
                  if (sessionId) {
                    setActiveTab('conversation');
                  }
                }}
                onOpenSession={handleOpenSession}
                onDeleteSession={handleDeleteSession}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="min-h-0 flex-1 p-4">
            <Suspense fallback={chatbotTabFallback}>
              <ChatBotFavoritesTab
                favorites={favorites}
                isLoadingFavorites={isLoadingFavorites}
                onCopyMessage={handleCopyMessage}
                onReaskFavorite={handleFavoritePromptClick}
                onOpenFavoriteSession={handleFavoriteSessionClick}
              />
            </Suspense>
          </div>
        )}
      </div>
    </>
  );
}
