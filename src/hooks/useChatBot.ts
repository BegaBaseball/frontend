import { useState, useEffect, useRef } from 'react';
import { Message } from '../types/chatbot';
import { buildHistoryPayload } from '../utils/chatbot';
import { sendChatMessageStream, convertVoiceToText, RateLimitError } from '../api/chatbot';
import { toast } from 'sonner';

const GREETING_TEXT = '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?';

const USE_EDGE_FUNCTION = false; // Edge Function 사용 여부
const DEFAULT_RETRY_SECONDS = 10;
const MAX_BACKOFF_SECONDS = 40;
const JITTER_MIN_SECONDS = 1;
const JITTER_MAX_SECONDS = 2;

export const useChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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

  const [position, setPosition] = useState({ x: window.innerWidth - 540, y: window.innerHeight - 900 });
  const [size, setSize] = useState({ width: 500, height: 750 });

  // ========== Typing Effect Logic ==========
  const streamingBuffer = useRef<string>('');
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        text: '',
        sender: 'bot',
        timestamp: new Date(),
      }]);
      // 인사말을 버퍼에 밀어넣음
      streamingBuffer.current += GREETING_TEXT;
    }
  }, [isOpen]);

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

  // ========== Process Message ==========
  const processMessage = async (messageToProcess: Message) => {
    setIsTyping(true);

    const conversationForHistory = [...messages];
    const historyPayload = buildHistoryPayload(conversationForHistory);

    try {
      // 봇 응답을 위한 빈 메시지 추가
      setMessages((prev) => [...prev, { text: '', sender: 'bot', timestamp: new Date() }]);

      await sendChatMessageStream(
        { question: messageToProcess.text, history: historyPayload },
        (delta: string) => {
          // 서버에서 받은 청크를 버퍼에 추가
          streamingBuffer.current += delta;
        },
        (_error: string) => {
          // 스트림 오류 발생 시 마지막 봇 메시지에 isError 플래그 설정
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.sender === 'bot') {
              return prev.map((msg, index) =>
                index === prev.length - 1 ? { ...msg, isError: true } : msg
              );
            }
            return prev;
          });
        },
        (meta) => {
          // 메타데이터를 현재 봇 메시지에 저장
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.sender === 'bot') {
              return prev.map((msg, index) =>
                index === prev.length - 1
                  ? {
                    ...msg,
                    verified: meta.verified,
                    citations: meta.dataSources,
                    toolCalls: meta.toolCalls,
                  }
                  : msg
              );
            }
            return prev;
          });
        }
      );

      setFailureCount(0);
      setRateLimitActive(false);
      setRateLimitUntil(null);
      setPendingMessage('');
      sessionStorage.removeItem('last_pending_msg');
    } catch (error) {
      console.error('Chat Error:', error);

      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

      if (error instanceof RateLimitError || errorMessage === 'STATUS_429') {
        const nextFailureCount = Math.min(failureCount + 1, 3);
        const backoffSeconds = Math.min(DEFAULT_RETRY_SECONDS * Math.pow(2, nextFailureCount - 1), MAX_BACKOFF_SECONDS);
        const retryAfterSeconds = error instanceof RateLimitError ? error.retryAfterSeconds : DEFAULT_RETRY_SECONDS;
        const jitterSeconds = Math.floor(Math.random() * (JITTER_MAX_SECONDS - JITTER_MIN_SECONDS + 1)) + JITTER_MIN_SECONDS;
        const waitSeconds = Math.min(MAX_BACKOFF_SECONDS, Math.max(retryAfterSeconds, backoffSeconds) + jitterSeconds);

        setFailureCount(nextFailureCount);
        setRateLimitActive(true);
        setRateLimitUntil(Date.now() + waitSeconds * 1000);
      } else if (errorMessage === 'STATUS_503') {
        toast.error('서비스 점검 중이거나 일시적인 오류입니다.');
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.sender === 'bot') {
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, isError: true } : msg
            );
          }
          return prev;
        });
      } else if (errorMessage === 'STREAM_TIMEOUT') {
        toast.error('응답 시간이 초과되었습니다.');
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.sender === 'bot') {
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, isError: true } : msg
            );
          }
          return prev;
        });
      } else {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.sender === 'bot') {
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, isError: true } : msg
            );
          }
          return prev;
        });
      }

      if (!(error instanceof RateLimitError || errorMessage === 'STATUS_429')) {
        setInputMessage(pendingMessage);
      }
    } finally {
      // 스트리밍 연결이 끊어지면 처리 상태 해제
      setIsProcessing(false);
      // 안전장치: 혹시라도 스트리밍이 공백으로 끝날 경우를 대비해 일정 시간 후 타이핑 상태 해제
      setTimeout(() => setIsTyping(false), 100);
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
    if (rateLimitActive && rateLimitCountdown > 0) return;
    if (!inputMessage.trim()) return;

    const trimmedInput = inputMessage.trim();
    setPendingMessage(trimmedInput);
    sessionStorage.setItem('last_pending_msg', trimmedInput);

    const userMessage: Message = {
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
    handleMicClick,
  };
};
