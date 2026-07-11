import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChatBotConversationSpinnerIcon as ChatBotSpinnerIcon } from './ChatBotConversationIcons';
import type { ChatQueueStatus, Message } from '../../types/chatbot';

const ChatBotConversationPanel = lazy(() => import('./ChatBotConversationPanel'));

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

interface ChatBotConversationRuntimeProps {
  isPanelOpen: boolean;
  messages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  isProcessing: boolean;
  rateLimitActive: boolean;
  rateLimitCountdown: number;
  rateLimitStage: number;
  queueStatus: ChatQueueStatus | null;
  pendingMessage: string;
  inputMessage: string;
  setInputMessage: (next: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  handleSendMessage: (event: FormEvent) => Promise<void>;
  handleRetrySend: () => Promise<void>;
  handleRestorePendingMessage: () => void;
  handleCancelStream: () => void;
  handleToggleFavorite: (message: Message) => Promise<void>;
  onRequestClose: () => void;
}

type RateLimitCopy = {
  main: string;
  guide: string;
  buttonBase: string;
} | null;

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

const pickTypingHint = (
  phase: TypingPhase,
  recentHints: string[],
  previousCategory: string | null,
): SelectedTypingHint => {
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

export default function ChatBotConversationRuntime({
  isPanelOpen,
  messages,
  isLoadingMessages,
  isTyping,
  isProcessing,
  rateLimitActive,
  rateLimitCountdown,
  rateLimitStage,
  queueStatus,
  pendingMessage,
  inputMessage,
  setInputMessage,
  messagesEndRef,
  messagesContainerRef,
  handleSendMessage,
  handleRetrySend,
  handleRestorePendingMessage,
  handleCancelStream,
  handleToggleFavorite,
  onRequestClose,
}: ChatBotConversationRuntimeProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const recentTypingHintsRef = useRef<string[]>([]);
  const previousTypingCategoryRef = useRef<string | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<number>>(new Set());
  const [typingPhase, setTypingPhase] = useState<TypingPhase>(1);
  const [typingText, setTypingText] = useState('');

  const isRateLimited = rateLimitActive && rateLimitCountdown > 0;
  const isSendDisabled = isRateLimited || (!isProcessing && !inputMessage.trim());

  useEffect(() => {
    if (!isPanelOpen || isProcessing || !inputRef.current) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(focusTimer);
  }, [isPanelOpen, isProcessing]);

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
            if (!isTyping) {
              return;
            }
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
    void handleSendMessage(event);
  };

  const handleFavoriteToggleClick = async (
    message: Message,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    await handleToggleFavorite(message);
  };

  const rateLimitCopy: RateLimitCopy = (() => {
    if (!rateLimitActive) {
      return null;
    }

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={(
          <div className="flex h-full items-center justify-center text-body text-muted-foreground">
            <ChatBotSpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
            탭을 불러오는 중입니다.
          </div>
        )}
      >
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
          queueStatus={queueStatus}
          pendingMessage={pendingMessage}
          rateLimitCopy={rateLimitCopy}
          setInputMessage={setInputMessage}
          onConversationSubmit={handleConversationSubmit}
          onInputKeyDown={handleInputKeyDown}
          onCopyMessage={handleCopyMessage}
          onToggleToolCalls={toggleToolCalls}
          onFavoriteToggle={handleFavoriteToggleClick}
          onCancelStream={handleCancelStream}
          onRetrySend={() => {
            void handleRetrySend();
          }}
          onRestorePendingMessage={handleRestorePendingMessage}
          onNavigateToPrediction={() => {
            onRequestClose();
            window.setTimeout(() => {
              navigate('/prediction');
            }, 300);
          }}
        />
      </Suspense>
    </div>
  );
}
