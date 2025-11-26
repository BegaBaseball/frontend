import { useState, useEffect, useRef } from 'react';
import { Message } from '../types/chatbot';
import { buildHistoryPayload } from '../utils/chatbot';
import { sendChatMessageStream, convertVoiceToText } from '../api/chatbot';
import { toast } from 'sonner';

const INITIAL_MESSAGE: Message = {
  text: '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?',
  sender: 'bot',
  timestamp: new Date(),
};

const USE_EDGE_FUNCTION = false; // Edge Function 사용 여부

export const useChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [position, setPosition] = useState({ x: window.innerWidth - 540, y: window.innerHeight - 900 });
  const [size, setSize] = useState({ width: 500, height: 750 });
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
      // FastAPI SSE 스트리밍 사용
      let botMessageCreated = false;

      await sendChatMessageStream(
        { question: messageToProcess.text, history: historyPayload },
        (delta: string) => {
          if (!botMessageCreated) {
            const botMessage: Message = {
              text: delta,
              sender: 'bot',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
            botMessageCreated = true;
            setIsTyping(false);
          } else {
            setMessages((prev) =>
              prev.map((msg, index) =>
                index === prev.length - 1 ? { ...msg, text: msg.text + delta } : msg
              )
            );
          }
        },
        (error: string) => {
          const errorMsg: Message = {
            text: `오류: ${error}`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
          botMessageCreated = true;
        }
      );
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMsg: Message = {
        text: `죄송합니다, 답변을 생성하는 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : '알 수 없는 오류'
        }`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
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
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessageQueue((prev) => [...prev, userMessage]);
    setInputMessage('');
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
    position,
    setPosition,
    size,
    setSize,

    // Refs
    messagesEndRef,
    messagesContainerRef,

    // Handlers
    handleSendMessage,
    handleMicClick,
  };
};