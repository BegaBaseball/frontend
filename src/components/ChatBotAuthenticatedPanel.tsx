import chatBotIcon from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import {
  X,
  Star,
  History,
  MessageSquareText,
  Loader2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useChatBot } from '../hooks/useChatBot';
import type { ChatFavoriteItem } from '../types/chatbot';

const ChatBotConversationPanel = lazy(() => import('./chatbot/ChatBotConversationPanel'));
const ChatBotHistoryTab = lazy(() => import('./chatbot/ChatBotHistoryTab'));
const ChatBotFavoritesTab = lazy(() => import('./chatbot/ChatBotFavoritesTab'));

type TypingPhase = 1 | 2 | 3;

type TypingHintGroup = {
  category: string;
  weight: number;
  texts: string[];
};

type SelectedTypingHint = {
  category: string;
  text: string;
};

interface ChatBotAuthenticatedPanelProps {
  isOpen: boolean;
  isClosing: boolean;
  isMobile: boolean;
  onRequestClose: () => void;
}

const TYPING_PHASE_HINTS: Record<TypingPhase, TypingHintGroup[]> = {
  1: [
    { category: '상황형', weight: 5, texts: ['야구 장면을 정렬하고 있어요. 잠깐만 응답 포인트를 맞추고 있어요.', '핵심 장면을 골라 흐름대로 정리 중이에요.', '요청하신 포인트를 다시 한 번 다듬고 있어요.'] },
    { category: '신뢰형', weight: 3, texts: ['데이터의 문맥을 정리해 정확한 답변으로 붙들어 넣고 있어요.', '근거 기반 순서로 답안을 정렬하고 있어요.'] },
    { category: '유머형', weight: 2, texts: ['잠시 타격 준비! 말이 완성될 위치를 잡고 있어요.', '타자처럼 타이밍 맞춰 문장을 준비 중이에요.'] },
  ],
  2: [
    { category: '상황형', weight: 4, texts: ['요청량이 조금 많아요. 더 정확한 답변으로 정리 중이에요.', '많은 구간을 한 번 더 정렬해 응답 품질을 맞추고 있어요.', '동시 처리량이 높아 확인 과정을 늘리고 있어요.'] },
    { category: '신뢰형', weight: 4, texts: ['실시간 기록을 재확인해 오차를 줄이고 있어요.', '출처와 수치를 다시 매칭해 정합성을 맞추고 있어요.'] },
    { category: '유머형', weight: 2, texts: ['투구가 조금 빡빡하네요. 추가 교차검증 중이에요.', '방금 전달한 장면을 한 번 더 리플레이하고 있어요.'] },
  ],
  3: [
    { category: '상황형', weight: 5, texts: ['요청이 누적되어 최종 정리 중이에요. 정확도를 최우선으로 처리하고 있어요.', '남은 집계 라인을 마무리해 최종 답변으로 결합 중이에요.', '응답 품질 검수를 마친 뒤 한 번에 전달 준비 중이에요.'] },
    { category: '신뢰형', weight: 4, texts: ['최종 교차체크를 진행하고 있습니다. 조금만 더 기다려 주세요.', '데이터 정합성 경로를 재확인해 마무리 중입니다.'] },
    { category: '유머형', weight: 1, texts: ['야구장 점검 중처럼 마지막 정렬 라운드를 돌고 있어요.'] },
  ],
};

const TYPING_HINT_REPEAT_HISTORY_COUNT = 2;
const TYPING_CHAR_INTERVAL_MS = 50;
const TYPING_RESTART_DELAY_MS = 700;
const TYPING_HINT_PHASE_2_DELAY_MS = 6000;
const TYPING_HINT_PHASE_3_DELAY_MS = 11000;
const TYPING_A11Y_TEXT_BY_PHASE: Record<TypingPhase, string> = {
  1: '챗봇이 답변을 준비하고 있습니다.',
  2: '요청량이 많아 응답 정확도 검토 중입니다.',
  3: '최종 정리를 마무리하고 있어요.',
};

const pickTypingHint = (phase: TypingPhase, recentHints: string[], previousCategory: string | null): SelectedTypingHint => {
  const phaseGroups = TYPING_PHASE_HINTS[phase] ?? TYPING_PHASE_HINTS[1];
  const weightedGroups = phaseGroups.map((group) => ({
    ...group,
    effectiveWeight: Math.max(group.weight - (group.category === previousCategory ? 1 : 0), 1),
  }));
  const totalWeight = weightedGroups.reduce((acc, group) => acc + group.effectiveWeight, 0);
  let seed = Math.random() * totalWeight;
  let selectedIndex = 0;

  for (const [index, group] of weightedGroups.entries()) {
    seed -= group.effectiveWeight;
    if (seed <= 0) {
      selectedIndex = index;
      break;
    }
  }

  const selectedGroup = phaseGroups[selectedIndex];
  const available = selectedGroup.texts.filter((text) => !recentHints.includes(text));
  if (available.length > 0) {
    return {
      category: selectedGroup.category,
      text: available[Math.floor(Math.random() * available.length)],
    };
  }

  const fallback = selectedGroup.texts[Math.floor(Math.random() * selectedGroup.texts.length)];
  return { category: selectedGroup.category, text: fallback };
};

export default function ChatBotAuthenticatedPanel({
  isOpen,
  isClosing,
  isMobile,
  onRequestClose,
}: ChatBotAuthenticatedPanelProps) {
  const navigate = useNavigate();
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<number>>(new Set());
  const [typingPhase, setTypingPhase] = useState<TypingPhase>(1);
  const [typingText, setTypingText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recentTypingHintsRef = useRef<string[]>([]);
  const previousTypingCategoryRef = useRef<string | null>(null);
  const isRateLimited = rateLimitActive && rateLimitCountdown > 0;
  const isSendDisabled = isRateLimited || (!isProcessing && !inputMessage.trim());

  useEffect(() => {
    if (!isOpen || isProcessing || !inputRef.current) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen, isProcessing]);

  useEffect(() => {
    if (!isTyping) {
      setTypingPhase(1);
      recentTypingHintsRef.current = [];
      previousTypingCategoryRef.current = null;
      setTypingText('');
      return;
    }

    setTypingPhase(1);
    const mediumDelayTimer = window.setTimeout(() => {
      setTypingPhase(2);
    }, TYPING_HINT_PHASE_2_DELAY_MS);
    const longDelayTimer = window.setTimeout(() => {
      setTypingPhase(3);
    }, TYPING_HINT_PHASE_3_DELAY_MS);

    return () => {
      window.clearTimeout(mediumDelayTimer);
      window.clearTimeout(longDelayTimer);
      setTypingPhase(1);
    };
  }, [isTyping]);

  useEffect(() => {
    if (!isTyping) {
      setTypingText('');
      return;
    }

    let typingInterval: number | null = null;
    let restartTimer: number | null = null;

    const clearTimers = () => {
      if (typingInterval) {
        window.clearInterval(typingInterval);
        typingInterval = null;
      }
      if (restartTimer) {
        window.clearTimeout(restartTimer);
        restartTimer = null;
      }
    };

    const startTyping = () => {
      clearTimers();
      const usedHints = recentTypingHintsRef.current.slice(-TYPING_HINT_REPEAT_HISTORY_COUNT);
      const selectedHint = pickTypingHint(typingPhase, usedHints, previousTypingCategoryRef.current);
      const message = selectedHint.text;
      recentTypingHintsRef.current = [...usedHints, message].slice(-TYPING_HINT_REPEAT_HISTORY_COUNT);
      previousTypingCategoryRef.current = selectedHint.category;
      let index = 0;
      setTypingText('');

      typingInterval = window.setInterval(() => {
        index += 1;
        const nextText = message.slice(0, index);
        setTypingText(nextText);

        if (index >= message.length) {
          clearTimers();
          restartTimer = window.setTimeout(() => {
            if (!isTyping) return;
            startTyping();
          }, TYPING_RESTART_DELAY_MS);
        }
      }, TYPING_CHAR_INTERVAL_MS);
    };

    startTyping();

    return () => {
      clearTimers();
    };
  }, [isTyping, typingPhase]);

  const toggleToolCalls = (index: number) => {
    setExpandedToolCalls((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleClose = () => {
    if (isProcessing) {
      handleCancelStream();
    }
    onRequestClose();
  };

  const handleCopyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // clipboard API not available
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const handleConversationSubmit = (event: FormEvent) => {
    setActiveTab('conversation');
    void handleSendMessage(event);
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

  const handleFavoriteToggleClick = async (
    message: Parameters<typeof handleToggleFavorite>[0],
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    await handleToggleFavorite(message);
  };

  const rateLimitCopy = (() => {
    if (!rateLimitActive) return null;

    if (rateLimitStage === 1) {
      return {
        main: '전 경기 실시간 스탯을 집계하고 있습니다. 더욱 정확한 답변을 위해 잠시 숫자를 정리할 시간이 필요해요.',
        guide: `약 ${rateLimitCountdown}초 후에 다시 질문하실 수 있습니다. 작성하신 내용은 그대로 보관 중이에요.`,
        buttonBase: '다시 시도',
      };
    }

    if (rateLimitStage === 2) {
      return {
        main: '데이터 정합성을 유지하기 위해 추가 집계가 진행 중입니다.',
        guide: `안정적인 답변을 위해 ${rateLimitCountdown}초만 더 기다려 주세요. 잠시 후 버튼이 활성화됩니다.`,
        buttonBase: '데이터 다시 요청',
      };
    }

    return {
      main: '현재 데이터 집계 요청이 매우 많아 처리 대기 중입니다.',
      guide: `시스템을 재정비하는 중입니다. ${rateLimitCountdown}초 후에 다시 시도해 주시거나, 잠시 후에 다시 방문해 주세요.`,
      buttonBase: '최종 재시도',
    };
  })();

  const typingLiveText = TYPING_A11Y_TEXT_BY_PHASE[typingPhase];
  const chatbotTabFallback = (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      탭을 불러오는 중입니다.
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
              <h3 className="text-white font-bold text-sm md:text-base m-0">야구 가이드 BEGA</h3>
              <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-xs text-white">
                Beta
              </span>
            </div>
            <p
              data-testid="chatbot-session-title"
              className="text-white/80 text-[11px] md:text-xs m-0 truncate max-w-[220px]"
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
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs transition-colors ${
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
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={chatbotTabFallback}>
              <ChatBotConversationPanel
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isTyping={isTyping}
                typingText={typingText}
                typingLiveText={typingLiveText}
                expandedToolCalls={expandedToolCalls}
                copiedIndex={copiedIndex}
                messagesEndRef={messagesEndRef}
                messagesContainerRef={messagesContainerRef}
                inputRef={inputRef}
                inputMessage={inputMessage}
                isProcessing={isProcessing}
                isSendDisabled={isSendDisabled}
                rateLimitActive={rateLimitActive}
                rateLimitCountdown={rateLimitCountdown}
                pendingMessage={pendingMessage}
                rateLimitCopy={rateLimitCopy}
                setInputMessage={setInputMessage}
                onConversationSubmit={handleConversationSubmit}
                onInputKeyDown={handleInputKeyDown}
                onCopyMessage={handleCopyMessage}
                onToggleToolCalls={toggleToolCalls}
                onFavoriteToggle={handleFavoriteToggleClick}
                onCancelStream={handleCancelStream}
                onRetrySend={() => { void handleRetrySend(); }}
                onRestorePendingMessage={handleRestorePendingMessage}
                onNavigateToPrediction={() => {
                  handleClose();
                  window.setTimeout(() => {
                    navigate('/prediction');
                  }, 300);
                }}
              />
            </Suspense>
          </div>
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
    </div>
  );
}
