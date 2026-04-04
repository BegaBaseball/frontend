import { startTransition, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { normalizeAiDataSources, normalizeAiToolCalls } from '../api/aiMeta';
import {
  addChatFavorite,
  createChatSession,
  deleteChatSession,
  getChatSessionMessages,
  listChatFavorites,
  listChatSessions,
  removeChatFavorite,
  saveAssistantChatMessage,
  saveUserChatMessage,
} from '../api/chatSessions';
import {
  ChatStreamEventError,
  RateLimitError,
  sendChatMessageStream,
} from '../api/chatbot';
import {
  CHATBOT_STATUS_RATE_LIMIT,
  CHATBOT_STATUS_SERVICE_UNAVAILABLE,
  CHATBOT_STREAM_INCOMPLETE_ERROR,
  CHATBOT_STREAM_TEMPORARY_ERROR,
  CHATBOT_STREAM_TIMEOUT_ERROR,
  isChatStreamStatusError,
  isStreamAbortError,
} from '../api/stream';
import { useAuthSession } from '../store/authStore';
import {
  ChatFavoriteItem,
  ChatMeta,
  ChatMessageStatus,
  ChatSessionSummary,
  Message,
  StoredChatMessage,
} from '../types/chatbot';
import { appendTextToBotMessage, buildHistoryPayload } from '../utils/chatbot';

const GREETING_TEXT = '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?';
const CURRENT_SESSION_STORAGE_KEY = 'chatbot_current_session_id';
const PENDING_MESSAGE_STORAGE_KEY = 'last_pending_msg';
const DEFAULT_RETRY_SECONDS = 10;
const MAX_BACKOFF_SECONDS = 40;
const JITTER_MIN_SECONDS = 1;
const JITTER_MAX_SECONDS = 2;
const SESSION_TITLE_LIMIT = 60;
const SESSION_PREVIEW_LIMIT = 220;
const STREAMING_BUFFER_FLUSH_INTERVAL_MS = 64;

type QueuedMessage = {
  sessionId: number;
  historyPayload: Array<{ role: string; content: string }> | null;
  userMessage: Message;
};

const createMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const readStoredSessionId = (): number | null => {
  try {
    const raw = sessionStorage.getItem(CURRENT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const persistSessionId = (sessionId: number | null): void => {
  try {
    if (sessionId === null) {
      sessionStorage.removeItem(CURRENT_SESSION_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(CURRENT_SESSION_STORAGE_KEY, String(sessionId));
  } catch {
    // sessionStorage 사용 실패 시 무시
  }
};

const clearStoredChatUiState = (): void => {
  try {
    sessionStorage.removeItem(CURRENT_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_MESSAGE_STORAGE_KEY);
  } catch {
    // storage 사용 실패 시 무시
  }
};

const trimPreview = (text: string, limit: number): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 3).trim()}...`;
};

const buildSessionTitle = (text: string): string => trimPreview(text, SESSION_TITLE_LIMIT);
const buildSessionPreview = (text: string): string => trimPreview(text, SESSION_PREVIEW_LIMIT);

const sortSessions = (items: ChatSessionSummary[]): ChatSessionSummary[] => [...items].sort(
  (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
);

const normalizeStoredMessage = (message: StoredChatMessage): Message => ({
  id: `stored-${message.messageId}`,
  serverId: message.messageId,
  sessionId: message.sessionId,
  text: message.content,
  sender: message.role === 'USER' ? 'user' : 'bot',
  timestamp: new Date(message.createdAt),
  status: message.status,
  isError: message.status === 'ERROR',
  cancelled: message.cancelled || message.status === 'CANCELLED',
  favorite: message.favorite,
  verified: message.verified ?? undefined,
  cached: message.cached ?? undefined,
  citations: normalizeAiDataSources(message.citations ?? undefined),
  toolCalls: normalizeAiToolCalls(message.toolCalls ?? undefined),
  intent: message.intent ?? undefined,
  strategy: message.strategy ?? undefined,
  plannerMode: message.plannerMode ?? undefined,
  plannerCacheHit: message.plannerCacheHit ?? undefined,
  toolExecutionMode: message.toolExecutionMode ?? undefined,
  fallbackReason: message.fallbackReason ?? undefined,
  finishReason: message.finishReason ?? undefined,
  errorCode: message.errorCode ?? undefined,
  metadata: message.metadata ?? null,
});

const createOptimisticUserMessage = (stored: StoredChatMessage): Message => normalizeStoredMessage(stored);

const createBotPlaceholder = (sessionId: number, botMessageId: string): Message => ({
  id: botMessageId,
  sessionId,
  text: '',
  sender: 'bot',
  timestamp: new Date(),
  status: 'COMPLETED',
  cancelled: false,
  isError: false,
});

const createSystemGreeting = (): Message => ({
  id: createMessageId(),
  text: '',
  sender: 'bot',
  timestamp: new Date(),
  isSystem: true,
  status: 'COMPLETED',
});

const buildAssistantPersistencePayload = (
  content: string,
  status: ChatMessageStatus,
  meta: ChatMeta | null,
  overrides?: Partial<{
    cancelled: boolean;
    errorCode: string | null;
  }>,
): Record<string, unknown> => ({
  content,
  status,
  verified: meta?.verified ?? false,
  cached: meta?.cached ?? false,
  intent: meta?.intent,
  strategy: meta?.strategy,
  finishReason: meta?.finish_reason,
  cancelled: overrides?.cancelled ?? meta?.cancelled ?? status === 'CANCELLED',
  errorCode: overrides?.errorCode ?? meta?.error ?? null,
  plannerMode: meta?.plannerMode,
  plannerCacheHit: meta?.plannerCacheHit,
  toolExecutionMode: meta?.toolExecutionMode,
  fallbackReason: meta?.fallbackReason,
  metadata: {
    verified: meta?.verified ?? false,
    cached: meta?.cached ?? false,
    intent: meta?.intent,
    strategy: meta?.strategy,
    finish_reason: meta?.finish_reason,
    cancelled: overrides?.cancelled ?? meta?.cancelled ?? status === 'CANCELLED',
    error: overrides?.errorCode ?? meta?.error ?? null,
    planner_mode: meta?.plannerMode,
    planner_cache_hit: meta?.plannerCacheHit,
    tool_execution_mode: meta?.toolExecutionMode,
    fallback_reason: meta?.fallbackReason,
    perf: meta?.perf,
    data_sources: meta?.dataSources ?? [],
    tool_calls: meta?.toolCalls ?? [],
  },
  citations: meta?.dataSources ?? [],
  toolCalls: meta?.toolCalls ?? [],
});

const buildFailureText = (error: unknown): string => {
  if (error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)) {
    return '요청이 많아 잠시 후 다시 시도해주세요.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STATUS_SERVICE_UNAVAILABLE)) {
    return '서비스 점검 중이거나 일시적인 오류입니다.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STREAM_TIMEOUT_ERROR)) {
    return '응답 시간이 초과되었습니다.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STREAM_INCOMPLETE_ERROR)) {
    return '응답이 중단되었습니다. 다시 시도해주세요.';
  }
  if (error instanceof ChatStreamEventError || isChatStreamStatusError(error, CHATBOT_STREAM_TEMPORARY_ERROR)) {
    return error instanceof ChatStreamEventError
      ? error.detail || '일시적인 오류가 발생했습니다. 다시 시도해주세요.'
      : '일시적인 오류가 발생했습니다. 다시 시도해주세요.';
  }
  return '응답 중 오류가 발생했습니다. 다시 시도해주세요.';
};

export const useChatBot = (initialOpen = false) => {
  const { isLoggedIn } = useAuthSession();
  const prevLoggedInRef = useRef(isLoggedIn);

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [favorites, setFavorites] = useState<ChatFavoriteItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [pendingMessage, setPendingMessage] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(isLoggedIn);
  const [isLoadingMessages, setIsLoadingMessages] = useState(isLoggedIn);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(isLoggedIn);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const activeStreamAbortControllerRef = useRef<AbortController | null>(null);
  const activeBotMessageIdRef = useRef<string | null>(null);
  const activeBotMessageIndexRef = useRef<number | null>(null);
  const activeRequestSeqRef = useRef(0);
  const streamingBuffer = useRef('');
  const streamingFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSessionTitle = sessions.find((session) => session.sessionId === currentSessionId)?.title ?? AiChatSessionTitleFallback;

  const updateBotMessageById = (
    botMessageId: string | null | undefined,
    updater: (message: Message) => Message,
    options?: { deferred?: boolean },
  ) => {
    const applyUpdate = () => setMessages((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const knownIndex = activeBotMessageIndexRef.current;
      const targetIndex = botMessageId && knownIndex !== null && prev[knownIndex]?.id === botMessageId
        ? knownIndex
        : (() => {
          for (let index = prev.length - 1; index >= 0; index -= 1) {
            if (prev[index].sender === 'bot' && (!botMessageId || prev[index].id === botMessageId)) {
              return index;
            }
          }
          return -1;
        })();

      if (targetIndex < 0) {
        return prev;
      }

      const current = prev[targetIndex];
      if (current.sender !== 'bot') {
        return prev;
      }

      const next = prev.slice();
      next[targetIndex] = updater(current);
      activeBotMessageIndexRef.current = targetIndex;
      return next;
    });

    if (options?.deferred) {
      startTransition(applyUpdate);
      return;
    }

    applyUpdate();
  };

  const clearScheduledStreamingFlush = () => {
    if (streamingFlushTimeoutRef.current) {
      clearTimeout(streamingFlushTimeoutRef.current);
      streamingFlushTimeoutRef.current = null;
    }
  };

  const flushStreamingBuffer = (botMessageId?: string | null) => {
    clearScheduledStreamingFlush();

    if (!streamingBuffer.current) {
      return;
    }

    const bufferedText = streamingBuffer.current;
    streamingBuffer.current = '';
    updateBotMessageById(
      botMessageId ?? activeBotMessageIdRef.current,
      (message) => appendTextToBotMessage(message, bufferedText),
      { deferred: true },
    );
  };

  const scheduleStreamingFlush = (botMessageId?: string | null) => {
    if (!streamingBuffer.current || streamingFlushTimeoutRef.current) {
      return;
    }

    streamingFlushTimeoutRef.current = setTimeout(() => {
      streamingFlushTimeoutRef.current = null;
      flushStreamingBuffer(botMessageId);
    }, STREAMING_BUFFER_FLUSH_INTERVAL_MS);
  };

  useEffect(() => () => {
    clearScheduledStreamingFlush();
  }, []);

  useEffect(() => {
    if (isOpen && !isLoadingMessages && messages.length === 0) {
      setMessages([createSystemGreeting()]);
      streamingBuffer.current += GREETING_TEXT;
      scheduleStreamingFlush(null);
    }
  }, [isOpen, isLoadingMessages, messages.length]);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRateLimitCountdown(0);
      setRateLimitActive(false);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitCountdown(remainingSeconds);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [rateLimitUntil]);

  useEffect(() => {
    if (prevLoggedInRef.current && !isLoggedIn) {
      activeStreamAbortControllerRef.current?.abort(new DOMException('logout', 'AbortError'));
      activeStreamAbortControllerRef.current = null;
      activeBotMessageIdRef.current = null;
      activeBotMessageIndexRef.current = null;
      clearScheduledStreamingFlush();
      streamingBuffer.current = '';
      setIsLoadingSessions(false);
      setIsLoadingMessages(false);
      setIsLoadingFavorites(false);
      setSessions([]);
      setMessages([]);
      setFavorites([]);
      setCurrentSessionId(null);
      setMessageQueue([]);
      setPendingMessage('');
      setInputMessage('');
      clearStoredChatUiState();
    }
    prevLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    const storedMessage = sessionStorage.getItem(PENDING_MESSAGE_STORAGE_KEY);
    if (storedMessage && storedMessage.trim().length > 0) {
      setPendingMessage(storedMessage);
      setInputMessage(storedMessage);
    }
  }, []);

  useEffect(() => {
    persistSessionId(currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    const bootstrapChatData = async () => {
      if (!isLoggedIn) {
        setIsLoadingSessions(false);
        setIsLoadingFavorites(false);
        setIsLoadingMessages(false);
        return;
      }

      setIsLoadingSessions(true);
      setIsLoadingFavorites(true);

      try {
        const [nextSessions, nextFavorites] = await Promise.all([
          listChatSessions(),
          listChatFavorites(),
        ]);
        const sortedSessions = sortSessions(nextSessions);
        setSessions(sortedSessions);
        setFavorites(nextFavorites);

        const storedSessionId = readStoredSessionId();
        const selectedSessionId = (
          storedSessionId !== null && sortedSessions.some((session) => session.sessionId === storedSessionId)
            ? storedSessionId
            : sortedSessions[0]?.sessionId ?? null
        );

        setCurrentSessionId(selectedSessionId);

        if (selectedSessionId !== null) {
          setIsLoadingMessages(true);
          const storedMessages = await getChatSessionMessages(selectedSessionId);
          setMessages(storedMessages.map(normalizeStoredMessage));
          setIsLoadingMessages(false);
        } else {
          setMessages([]);
        }
      } catch {
        toast.error('대화 기록을 불러오지 못했습니다.');
      } finally {
        setIsLoadingSessions(false);
        setIsLoadingFavorites(false);
        setIsLoadingMessages(false);
      }
    };

    void bootstrapChatData();
  }, [isLoggedIn]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const updateSessionsAfterMessage = (sessionId: number, content: string, createdAt: Date) => {
    setSessions((prev) => {
      const next = prev.map((session) => {
        if (session.sessionId !== sessionId) {
          return session;
        }
        const nextMessageCount = (session.messageCount ?? 0) + 1;
        return {
          ...session,
          title: session.title === '새 대화' && (session.messageCount ?? 0) === 0
            ? buildSessionTitle(content)
            : session.title,
          messageCount: nextMessageCount,
          latestMessagePreview: buildSessionPreview(content),
          updatedAt: createdAt.toISOString(),
          lastMessageAt: createdAt.toISOString(),
        };
      });
      return sortSessions(next);
    });
  };

  const replacePlaceholderWithStoredMessage = (placeholderId: string, storedMessage: StoredChatMessage) => {
    const normalized = normalizeStoredMessage(storedMessage);
    setMessages((prev) => {
      const replacedIndex = prev.findIndex((message) => message.id === placeholderId);
      if (replacedIndex >= 0) {
        const next = prev.slice();
        next[replacedIndex] = normalized;
        activeBotMessageIndexRef.current = replacedIndex;
        return next;
      }

      if (prev.some((message) => message.id === normalized.id)) {
        return prev;
      }

      return [...prev, normalized];
    });
  };

  const persistAssistantOutcome = async (
    sessionId: number,
    placeholderId: string,
    content: string,
    status: ChatMessageStatus,
    meta: ChatMeta | null,
    overrides?: Partial<{ cancelled: boolean; errorCode: string | null }>,
  ) => {
    const stored = await saveAssistantChatMessage(
      sessionId,
      buildAssistantPersistencePayload(content, status, meta, overrides),
    );
    replacePlaceholderWithStoredMessage(placeholderId, stored);
    updateSessionsAfterMessage(sessionId, stored.content, new Date(stored.createdAt));
  };

  const loadSessionMessages = async (sessionId: number) => {
    setIsLoadingMessages(true);
    try {
      const storedMessages = await getChatSessionMessages(sessionId);
      setMessages(storedMessages.map(normalizeStoredMessage));
      setCurrentSessionId(sessionId);
      activeBotMessageIdRef.current = null;
      activeBotMessageIndexRef.current = null;
      clearScheduledStreamingFlush();
      streamingBuffer.current = '';
    } catch {
      toast.error('대화 내용을 불러오지 못했습니다.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const abortActiveStream = () => {
    const controller = activeStreamAbortControllerRef.current;
    const activeBotMessageId = activeBotMessageIdRef.current;

    if (!controller || controller.signal.aborted) {
      return false;
    }

    activeRequestSeqRef.current += 1;
    flushStreamingBuffer(activeBotMessageId);
    updateBotMessageById(activeBotMessageId, (message) => ({
      ...message,
      text: message.text.trim().length > 0 ? message.text : '응답을 취소했습니다.',
      status: 'CANCELLED',
      cancelled: true,
      isError: false,
    }));
    setIsProcessing(false);
    setIsTyping(false);

    controller.abort(new DOMException('chat stream cancelled', 'AbortError'));
    activeStreamAbortControllerRef.current = null;
    activeBotMessageIdRef.current = null;
    activeBotMessageIndexRef.current = null;
    return true;
  };

  const processMessage = async ({ sessionId, historyPayload, userMessage }: QueuedMessage) => {
    setIsTyping(true);
    flushStreamingBuffer(activeBotMessageIdRef.current);

    const botMessageId = createMessageId();
    const streamAbortController = new AbortController();
    const requestSeq = activeRequestSeqRef.current + 1;

    activeRequestSeqRef.current = requestSeq;
    activeBotMessageIdRef.current = botMessageId;
    activeStreamAbortControllerRef.current = streamAbortController;

    let assistantText = '';
    let assistantMeta: ChatMeta | null = null;

    try {
      setMessages((prev) => {
        if (prev.some((message) => message.id === botMessageId)) {
          return prev;
        }
        const next = [...prev, createBotPlaceholder(sessionId, botMessageId)];
        activeBotMessageIndexRef.current = next.length - 1;
        return next;
      });

      await sendChatMessageStream(
        { question: userMessage.text, history: historyPayload },
        (delta) => {
          if (activeRequestSeqRef.current !== requestSeq) {
            return;
          }
          assistantText += delta;
          streamingBuffer.current += delta;
          scheduleStreamingFlush(botMessageId);
        },
        (meta) => {
          if (activeRequestSeqRef.current !== requestSeq) {
            return;
          }
          assistantMeta = meta;
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            verified: meta.verified,
            cached: meta.cached,
            citations: meta.dataSources,
            toolCalls: meta.toolCalls,
            intent: meta.intent,
            strategy: meta.strategy,
            plannerMode: meta.plannerMode,
            plannerCacheHit: meta.plannerCacheHit,
            toolExecutionMode: meta.toolExecutionMode,
            fallbackReason: meta.fallbackReason,
            finishReason: meta.finish_reason,
            cancelled: meta.cancelled ?? false,
            isError: meta.error === 'temporary_generation_issue' || meta.finish_reason === 'error',
            metadata: meta.perf ?? null,
          }));
        },
        { signal: streamAbortController.signal },
      );

      flushStreamingBuffer(botMessageId);

      const finalContent = assistantText.trim().length > 0
        ? assistantText
        : '응답이 비어 있습니다. 다시 시도해주세요.';
      const resolvedAssistantMeta = assistantMeta as ChatMeta | null;
      const finalStatus: ChatMessageStatus = resolvedAssistantMeta?.cancelled || resolvedAssistantMeta?.finish_reason === 'cancelled'
        ? 'CANCELLED'
        : resolvedAssistantMeta?.error || resolvedAssistantMeta?.finish_reason === 'error'
          ? 'ERROR'
          : 'COMPLETED';

      await persistAssistantOutcome(sessionId, botMessageId, finalContent, finalStatus, resolvedAssistantMeta);

      setFailureCount(0);
      setRateLimitActive(false);
      setRateLimitUntil(null);
      setPendingMessage('');
      sessionStorage.removeItem(PENDING_MESSAGE_STORAGE_KEY);
    } catch (error) {
      flushStreamingBuffer(botMessageId);

      if (isStreamAbortError(error)) {
        const cancelledText = assistantText.trim().length > 0 ? assistantText : '응답을 취소했습니다.';
        const resolvedAssistantMeta = assistantMeta as ChatMeta | null;
        try {
          await persistAssistantOutcome(sessionId, botMessageId, cancelledText, 'CANCELLED', resolvedAssistantMeta, {
            cancelled: true,
            errorCode: resolvedAssistantMeta?.error ?? 'cancelled',
          });
        } catch {
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            text: cancelledText,
            status: 'CANCELLED',
            cancelled: true,
            isError: false,
          }));
        }
      } else {
        const failureText = buildFailureText(error);
        const errorCode = error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)
          ? 'rate_limit'
          : error instanceof ChatStreamEventError
            ? error.eventCode || 'temporary_error'
            : error instanceof Error
              ? error.message
              : 'chat_stream_error';

        if (error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)) {
          const nextFailureCount = Math.min(failureCount + 1, 3);
          const backoffSeconds = Math.min(DEFAULT_RETRY_SECONDS * Math.pow(2, nextFailureCount - 1), MAX_BACKOFF_SECONDS);
          const retryAfterSeconds = error instanceof RateLimitError ? error.retryAfterSeconds : DEFAULT_RETRY_SECONDS;
          const jitterSeconds = Math.floor(Math.random() * (JITTER_MAX_SECONDS - JITTER_MIN_SECONDS + 1)) + JITTER_MIN_SECONDS;
          const waitSeconds = Math.min(MAX_BACKOFF_SECONDS, Math.max(retryAfterSeconds, backoffSeconds) + jitterSeconds);

          setFailureCount(nextFailureCount);
          setRateLimitActive(true);
          setRateLimitUntil(Date.now() + waitSeconds * 1000);
        } else if (isChatStreamStatusError(error, CHATBOT_STATUS_SERVICE_UNAVAILABLE)) {
          toast.error('서비스 점검 중이거나 일시적인 오류입니다.');
        } else if (isChatStreamStatusError(error, CHATBOT_STREAM_TIMEOUT_ERROR)) {
          toast.error('응답 시간이 초과되었습니다.');
        } else if (isChatStreamStatusError(error, CHATBOT_STREAM_INCOMPLETE_ERROR)) {
          toast.error('응답이 중단되었습니다. 다시 시도해주세요.');
        } else if (error instanceof ChatStreamEventError || isChatStreamStatusError(error, CHATBOT_STREAM_TEMPORARY_ERROR)) {
          toast.error(failureText);
        } else {
          toast.error('응답 중 오류가 발생했습니다.');
        }

        try {
          await persistAssistantOutcome(sessionId, botMessageId, failureText, 'ERROR', assistantMeta, {
            errorCode,
          });
        } catch {
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            text: failureText,
            status: 'ERROR',
            isError: true,
            cancelled: false,
            errorCode,
          }));
        }

        if (!(error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT))) {
          setInputMessage(pendingMessage);
        }
      }
    } finally {
      if (activeStreamAbortControllerRef.current === streamAbortController) {
        activeStreamAbortControllerRef.current = null;
        activeBotMessageIdRef.current = null;
        activeBotMessageIndexRef.current = null;
      }
      setIsProcessing(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0) {
      const [nextMessage, ...rest] = messageQueue;
      setMessageQueue(rest);
      setIsProcessing(true);
      void processMessage(nextMessage);
    }
  }, [messageQueue, isProcessing]);

  const ensureActiveSession = async (): Promise<ChatSessionSummary> => {
    if (currentSessionId !== null) {
      const existing = sessions.find((session) => session.sessionId === currentSessionId);
      if (existing) {
        return existing;
      }
    }

    const created = await createChatSession();
    setSessions((prev) => sortSessions([created, ...prev]));
    setCurrentSessionId(created.sessionId);
    setMessages([]);
    activeBotMessageIdRef.current = null;
    activeBotMessageIndexRef.current = null;
    clearScheduledStreamingFlush();
    streamingBuffer.current = '';
    return created;
  };

  const submitMessage = async (trimmedInput: string) => {
    if (!trimmedInput || !isLoggedIn) return;
    if (rateLimitActive && rateLimitCountdown > 0) return;

    if (isProcessing) {
      abortActiveStream();
    }

    setPendingMessage(trimmedInput);
    sessionStorage.setItem(PENDING_MESSAGE_STORAGE_KEY, trimmedInput);

    try {
      const activeSession = await ensureActiveSession();
      const historyPayload = buildHistoryPayload(messages);
      const storedUserMessage = await saveUserChatMessage(activeSession.sessionId, trimmedInput);
      const normalizedUserMessage = createOptimisticUserMessage(storedUserMessage);

      setMessages((prev) => [...prev.filter((message) => !message.isSystem), normalizedUserMessage]);
      updateSessionsAfterMessage(activeSession.sessionId, trimmedInput, new Date(storedUserMessage.createdAt));
      setMessageQueue((prev) => [...prev, {
        sessionId: activeSession.sessionId,
        historyPayload,
        userMessage: normalizedUserMessage,
      }]);
      setInputMessage('');
    } catch {
      toast.error('메시지를 저장하지 못했습니다.');
      setInputMessage(trimmedInput);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedInput = event.currentTarget instanceof HTMLFormElement
      ? new FormData(event.currentTarget).get('message')
      : null;
    const trimmedInput = typeof submittedInput === 'string'
      ? submittedInput.trim()
      : inputMessage.trim();

    await submitMessage(trimmedInput);
  };

  const handleRetrySend = async () => {
    if (rateLimitCountdown > 0) return;
    const retryText = inputMessage.trim() || pendingMessage.trim();
    if (!retryText) return;
    setRateLimitActive(false);
    setRateLimitUntil(null);
    await submitMessage(retryText);
  };

  const handleRestorePendingMessage = () => {
    if (!pendingMessage.trim()) return;
    setInputMessage(pendingMessage);
  };

  const handleCancelStream = () => {
    if (!isProcessing && !activeStreamAbortControllerRef.current) {
      return;
    }
    abortActiveStream();
  };

  const handleCreateNewSession = async () => {
    if (!isLoggedIn) return null;
    if (isProcessing) {
      abortActiveStream();
    }
    setMessageQueue([]);
    try {
      const session = await createChatSession();
      setSessions((prev) => sortSessions([session, ...prev]));
      setCurrentSessionId(session.sessionId);
      setMessages([]);
      activeBotMessageIdRef.current = null;
      activeBotMessageIndexRef.current = null;
      clearScheduledStreamingFlush();
      streamingBuffer.current = '';
      return session.sessionId;
    } catch {
      toast.error('새 대화를 시작하지 못했습니다.');
      return null;
    }
  };

  const handleSelectSession = async (sessionId: number) => {
    if (!isLoggedIn) return;
    if (sessionId === currentSessionId) return;
    if (isProcessing) {
      abortActiveStream();
    }
    setMessageQueue([]);
    await loadSessionMessages(sessionId);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!isLoggedIn) return;
    if (isProcessing && sessionId === currentSessionId) {
      abortActiveStream();
    }

    try {
      await deleteChatSession(sessionId);
      setFavorites((prev) => prev.filter((item) => item.sessionId !== sessionId));
      setSessions((prev) => {
        const filtered = prev.filter((session) => session.sessionId !== sessionId);
        if (sessionId === currentSessionId) {
          const nextSessionId = filtered[0]?.sessionId ?? null;
          setCurrentSessionId(nextSessionId);
          if (nextSessionId === null) {
            setMessages([]);
          } else {
            void loadSessionMessages(nextSessionId);
          }
        }
        return filtered;
      });
      if (sessionId === currentSessionId && sessions.length <= 1) {
        setMessages([]);
        activeBotMessageIdRef.current = null;
        activeBotMessageIndexRef.current = null;
        clearScheduledStreamingFlush();
        streamingBuffer.current = '';
      }
    } catch {
      toast.error('대화를 삭제하지 못했습니다.');
    }
  };

  const handleToggleFavorite = async (message: Message) => {
    if (!message.serverId || message.sender !== 'bot' || message.status !== 'COMPLETED') {
      return;
    }

    try {
      if (message.favorite) {
        await removeChatFavorite(message.serverId);
        setFavorites((prev) => prev.filter((item) => item.messageId !== message.serverId));
        setMessages((prev) => prev.map((item) => (
          item.serverId === message.serverId ? { ...item, favorite: false } : item
        )));
        return;
      }

      const favorite = await addChatFavorite(message.serverId);
      setFavorites((prev) => [favorite, ...prev.filter((item) => item.messageId !== favorite.messageId)]);
      setMessages((prev) => prev.map((item) => (
        item.serverId === message.serverId ? { ...item, favorite: true } : item
      )));
    } catch {
      toast.error('즐겨찾기를 변경하지 못했습니다.');
    }
  };

  const handleUseFavoritePrompt = (favorite: ChatFavoriteItem) => {
    if (!favorite.prompt) return;
    setInputMessage(favorite.prompt);
  };

  useEffect(() => {
    return () => {
      abortActiveStream();
    };
  }, []);

  return {
    isOpen,
    setIsOpen,
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
    rateLimitStage: Math.min(Math.max(failureCount, 1), 3),
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
  };
};

const AiChatSessionTitleFallback = '새 대화';
