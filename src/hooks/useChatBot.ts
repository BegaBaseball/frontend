import { useState, useEffect, useRef } from 'react';
import { Message } from '../types/chatbot';
import { buildHistoryPayload } from '../utils/chatbot';
import { sendChatMessageStream, convertVoiceToText, RateLimitError, ChatStreamEventError } from '../api/chatbot';
import {
  CHATBOT_STATUS_RATE_LIMIT,
  CHATBOT_STATUS_SERVICE_UNAVAILABLE,
  CHATBOT_STREAM_TIMEOUT_ERROR,
  CHATBOT_STREAM_INCOMPLETE_ERROR,
  CHATBOT_STREAM_TEMPORARY_ERROR,
  isChatStreamStatusError,
  isStreamAbortError,
} from '../api/stream';
import { useAuthSession } from '../store/authStore';
import { toast } from 'sonner';

const GREETING_TEXT = '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?';

const CHAT_STORAGE_KEY = 'chatbot_messages';

const saveMessages = (msgs: Message[]): void => {
  try {
    const toSave = msgs.filter(m => !m.isSystem && m.text.trim().length > 0);
    if (toSave.length > 0) {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
    } else {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    }
  } catch { /* storage 접근 실패 시 무시 */ }
};

const loadMessages = (): Message[] => {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Array<Message & { timestamp: string }> = JSON.parse(raw);
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
};

const USE_EDGE_FUNCTION = false; // Edge Function 사용 여부
const DEFAULT_RETRY_SECONDS = 10;
const MAX_BACKOFF_SECONDS = 40;
const JITTER_MIN_SECONDS = 1;
const JITTER_MAX_SECONDS = 2;

const createMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const useChatBot = (initialOpen = false) => {
  const { isLoggedIn } = useAuthSession();
  const prevLoggedInRef = useRef(isLoggedIn);

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [pendingMessage, setPendingMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [position, setPosition] = useState({
    x: Math.max(0, window.innerWidth - 540),
    y: Math.max(0, window.innerHeight - 900),
  });
  const [size, setSize] = useState({ width: 500, height: 750 });

  // ========== Typing Effect Logic ==========
  const streamingBuffer = useRef<string>('');
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeBotMessageIdRef = useRef<string | null>(null);
  const activeStreamAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestSeqRef = useRef(0);

  useEffect(() => {
    // 20ms 마다 버퍼에서 글자를 꺼내서 화면에 표시
    typingIntervalRef.current = setInterval(() => {
      if (streamingBuffer.current.length > 0) {
        // 타이핑이 시작되면 로딩 인디케이터 숨김
        setIsTyping(false);

        const char = streamingBuffer.current.charAt(0);
        streamingBuffer.current = streamingBuffer.current.slice(1);

        setMessages((prev) => {
          if (prev.length === 0) return prev;

          const activeBotMessageId = activeBotMessageIdRef.current;
          if (activeBotMessageId) {
            let updated = false;
            const nextMessages = prev.map((msg) => {
              if (msg.id !== activeBotMessageId || msg.sender !== 'bot') {
                return msg;
              }
              updated = true;
              return { ...msg, text: msg.text + char };
            });
            return updated ? nextMessages : prev;
          }

          // 마지막 메시지가 봇 메시지인지 확인하고 업데이트
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.sender === 'bot') {
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, text: msg.text + char } : msg
            );
          }
          return prev;
        });
      }
    }, 20);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // ========== Initial Greeting ==========
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // 빈 봇 메시지 껍데기만 먼저 추가
      setMessages([{
        id: createMessageId(),
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        isSystem: true,
      }]);
      // 인사말을 버퍼에 밀어넣음
      streamingBuffer.current += GREETING_TEXT;
    }
  }, [isOpen]);

  // ========== Chat History Persistence ==========
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (prevLoggedInRef.current && !isLoggedIn) {
      setMessages([]);
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    }
    prevLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    const storedMessage = sessionStorage.getItem('last_pending_msg');
    if (storedMessage && storedMessage.trim().length > 0) {
      setPendingMessage(storedMessage);
      setInputMessage(storedMessage);
    }
  }, []);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRateLimitCountdown(0);
      setRateLimitActive(false);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitCountdown(remainingSeconds);
      if (remainingSeconds <= 0) {
        setRateLimitActive(false);
      }
    };

    updateCountdown();

    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [rateLimitUntil]);

  // ========== Scroll to Bottom ==========
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

  const markLastBotMessageAsError = () => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastMsg = prev[prev.length - 1];
      if (lastMsg.sender !== 'bot') return prev;
      return prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, isError: true } : msg
      );
    });
  };

  const markBotMessageAsError = (botMessageId?: string | null) => {
    if (!botMessageId) {
      markLastBotMessageAsError();
      return;
    }

    flushStreamingBuffer(botMessageId);
    setMessages((prev) => prev.map((msg) => (
      msg.id === botMessageId && msg.sender === 'bot'
        ? { ...msg, isError: true, cancelled: false }
        : msg
    )));
  };

  const flushStreamingBuffer = (botMessageId?: string | null) => {
    if (!streamingBuffer.current) {
      return;
    }

    const bufferedText = streamingBuffer.current;
    streamingBuffer.current = '';

    setMessages((prev) => {
      if (prev.length === 0) return prev;

      if (botMessageId) {
        let updated = false;
        const nextMessages = prev.map((msg) => {
          if (msg.id !== botMessageId || msg.sender !== 'bot') {
            return msg;
          }
          updated = true;
          return { ...msg, text: msg.text + bufferedText };
        });
        if (updated) {
          return nextMessages;
        }
      }

      const lastMsg = prev[prev.length - 1];
      if (lastMsg.sender !== 'bot') {
        return prev;
      }

      return prev.map((msg, index) =>
        index === prev.length - 1 ? { ...msg, text: msg.text + bufferedText } : msg
      );
    });
  };

  const markBotMessageAsCancelled = (botMessageId?: string | null) => {
    if (!botMessageId) {
      return;
    }

    flushStreamingBuffer(botMessageId);
    setMessages((prev) => {
      let foundBotMessage = false;
      const nextMessages = prev.map((msg) => {
        if (msg.id !== botMessageId || msg.sender !== 'bot') {
          return msg;
        }
        foundBotMessage = true;
        return {
          ...msg,
          text: msg.text.trim().length > 0 ? msg.text : '응답을 취소했습니다.',
          cancelled: true,
          isError: false,
        };
      });

      if (foundBotMessage) {
        return nextMessages;
      }

      return [...prev, {
        id: botMessageId,
        text: '응답을 취소했습니다.',
        sender: 'bot',
        timestamp: new Date(),
        cancelled: true,
        isError: false,
      }];
    });
  };

  const abortActiveStream = () => {
    const controller = activeStreamAbortControllerRef.current;
    const activeBotMessageId = activeBotMessageIdRef.current;

    if (!controller || controller.signal.aborted) {
      return false;
    }

    activeRequestSeqRef.current += 1;
    markBotMessageAsCancelled(activeBotMessageId);
    setIsProcessing(false);
    setIsTyping(false);

    controller.abort(new DOMException('chat stream cancelled', 'AbortError'));
    activeStreamAbortControllerRef.current = null;
    activeBotMessageIdRef.current = null;
    return true;
  };

  // ========== Process Message ==========
  const processMessage = async (messageToProcess: Message) => {
    setIsTyping(true);
    flushStreamingBuffer(activeBotMessageIdRef.current);

    // 현재 전송 중인 질문(마지막 유저 메시지)은 history가 아닌 question 파라미터로 전달됨.
    // slice(0, -1)로 제외하여 첫 번째 질문 시 history=null → 캐시 저장 가능 조건 충족.
    const conversationForHistory = messages.slice(0, -1);
    const historyPayload = buildHistoryPayload(conversationForHistory);
    const botMessageId = createMessageId();
    const streamAbortController = new AbortController();
    const requestSeq = activeRequestSeqRef.current + 1;

    activeRequestSeqRef.current = requestSeq;
    activeBotMessageIdRef.current = botMessageId;
    activeStreamAbortControllerRef.current = streamAbortController;

    try {
      // 봇 응답을 위한 빈 메시지 추가
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === botMessageId && msg.sender === 'bot')) {
          return prev;
        }
        return [...prev, {
          id: botMessageId,
          text: '',
          sender: 'bot',
          timestamp: new Date(),
          cancelled: false,
        }];
      });

      await sendChatMessageStream(
        { question: messageToProcess.text, history: historyPayload },
        (delta: string) => {
          if (activeRequestSeqRef.current !== requestSeq) {
            return;
          }
          // 서버에서 받은 청크를 버퍼에 추가
          streamingBuffer.current += delta;
        },
        (meta) => {
          if (activeRequestSeqRef.current !== requestSeq) {
            return;
          }
          const isCancelledMeta = meta.cancelled === true || meta.finish_reason === 'cancelled';
          const isMetaError = meta.error === 'temporary_generation_issue' || meta.finish_reason === 'error';

          // 메타데이터를 현재 봇 메시지에 저장
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            return prev.map((msg) => (
              msg.id === botMessageId && msg.sender === 'bot'
                ? {
                  ...msg,
                  verified: meta.verified,
                  cached: meta.cached,
                  intent: meta.intent,
                  strategy: meta.strategy,
                  citations: meta.dataSources,
                  toolCalls: meta.toolCalls,
                  cancelled: isCancelledMeta ? true : msg.cancelled,
                  isError: isMetaError ? true : msg.isError,
                }
                : msg
            ));
          });
        },
        { signal: streamAbortController.signal },
      );

      setFailureCount(0);
      setRateLimitActive(false);
      setRateLimitUntil(null);
      setPendingMessage('');
      sessionStorage.removeItem('last_pending_msg');
    } catch (error) {
      console.error('Chat Error:', error);

      if (isStreamAbortError(error)) {
        // abort 시점에 placeholder bot 메시지가 아직 커밋되지 않았을 수 있어
        // catch 경로에서도 취소 상태를 한 번 더 확정한다.
        markBotMessageAsCancelled(botMessageId);
      } else if (error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)) {
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
        markBotMessageAsError(botMessageId);
      } else if (isChatStreamStatusError(error, CHATBOT_STREAM_TIMEOUT_ERROR)) {
        toast.error('응답 시간이 초과되었습니다.');
        markBotMessageAsError(botMessageId);
      } else if (isChatStreamStatusError(error, CHATBOT_STREAM_INCOMPLETE_ERROR)) {
        toast.error('응답이 중단되었습니다. 다시 시도해주세요.');
        markBotMessageAsError(botMessageId);
      } else if (error instanceof ChatStreamEventError || isChatStreamStatusError(error, CHATBOT_STREAM_TEMPORARY_ERROR)) {
        toast.error(
          error instanceof ChatStreamEventError
            ? error.detail || '일시적인 오류가 발생했습니다. 다시 시도해주세요.'
            : '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        );
        markBotMessageAsError(botMessageId);
      } else {
        markBotMessageAsError(botMessageId);
      }

      if (
        !isStreamAbortError(error)
        && !(error instanceof RateLimitError || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT))
      ) {
        setInputMessage(pendingMessage);
      }
    } finally {
      if (activeStreamAbortControllerRef.current === streamAbortController) {
        activeStreamAbortControllerRef.current = null;
        activeBotMessageIdRef.current = null;
      }
      // 스트리밍 연결이 끊어지면 처리 상태 해제
      setIsProcessing(false);
      // 안전장치: 스트리밍 종료 시 즉시 로딩 상태 해제
      setIsTyping(false);
    }
  };

  // ========== Queue Processing ==========
  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0) {
      const nextMessage = messageQueue[0];
      setMessageQueue((prev) => prev.slice(1));
      setIsProcessing(true);
      processMessage(nextMessage);
    }
  }, [messageQueue, isProcessing]);

  // ========== Send Message ==========
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const submittedInput = e.currentTarget instanceof HTMLFormElement
      ? new FormData(e.currentTarget).get('message')
      : null;
    const trimmedInput = typeof submittedInput === 'string'
      ? submittedInput.trim()
      : inputMessage.trim();

    if (rateLimitActive && rateLimitCountdown > 0) return;
    if (!trimmedInput) return;

    if (isProcessing) {
      abortActiveStream();
    }

    setPendingMessage(trimmedInput);
    sessionStorage.setItem('last_pending_msg', trimmedInput);

    const userMessage: Message = {
      id: createMessageId(),
      text: trimmedInput,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessageQueue((prev) => [...prev, userMessage]);
    setInputMessage('');
  };

  const handleRetrySend = () => {
    if (rateLimitCountdown > 0) return;

    const retryText = inputMessage.trim() || pendingMessage.trim();
    if (!retryText) return;

    setPendingMessage(retryText);
    sessionStorage.setItem('last_pending_msg', retryText);

    const userMessage: Message = {
      id: createMessageId(),
      text: retryText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageQueue((prev) => [...prev, userMessage]);
    setInputMessage('');
    setRateLimitActive(false);
    setRateLimitUntil(null);
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

  useEffect(() => {
    return () => {
      abortActiveStream();
    };
  }, []);

  // ========== Voice Recording ==========
  const handleMicClick = async () => {
    if (!navigator.mediaDevices) {
      toast.error('이 브라우저는 마이크를 지원하지 않습니다.');
      return;
    }

    if (isRecording && mediaRecorder) {
      setIsRecording(false);
      setInputMessage('텍스트로 변환 중입니다...');
      mediaRecorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });

        try {
          const text = await convertVoiceToText(blob);
          setInputMessage(text);
        } catch (error) {
          setInputMessage(error instanceof Error ? error.message : '변환에 실패했습니다.');
          toast.error('음성 변환에 실패했습니다.');
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setInputMessage('음성 녹음 중... (다시 클릭하여 중지)');
    } catch (error) {
      toast.error('마이크 권한이 필요합니다.');
    }
  };

  return {
    // State
    isOpen,
    setIsOpen,
    messages,
    inputMessage,
    setInputMessage,
    isRecording,
    isTyping,
    isProcessing,
    rateLimitActive,
    rateLimitCountdown,
    rateLimitStage: Math.min(Math.max(failureCount, 1), 3),
    pendingMessage,
    position,
    setPosition,
    size,
    setSize,

    // Refs
    messagesEndRef,
    messagesContainerRef,

    // Handlers
    handleSendMessage,
    handleRetrySend,
    handleRestorePendingMessage,
    handleCancelStream,
    handleMicClick,
  };
};
