import { useState, useRef, useEffect } from 'react';
import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Send, Mic, LogIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Cookies from 'js-cookie';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const HISTORY_MESSAGE_LIMIT = 8;

const buildHistoryPayload = (conversation: Message[]) => {
  const trimmed = conversation
    .filter((msg) => msg.text && msg.text.trim().length > 0)
    .slice(-HISTORY_MESSAGE_LIMIT);
  if (!trimmed.length) return null;
  const payload = trimmed.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text,
  }));
  return payload;
};

const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zyofzvnkputevakepbdm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;


export default function ChatBot() {
  // 로그인 상태 확인
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // --- 순차 처리를 위한 상태 추가 ---
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // --- Edge Function API 호출 로직을 별도 함수로 분리 ---
  const processMessage = async (messageToProcess: Message) => {
    setIsTyping(true);
    // 전체 대화 기록을 기반으로 history payload 생성
    const conversationForHistory = [...messages];
    const historyPayload = buildHistoryPayload(conversationForHistory);

    try {
      // Edge Function 사용 설정 (API 키 보안을 위해 Edge Function 사용)
      const useEdgeFunction = false;
      
      const endpoint = useEdgeFunction 
        ? `${EDGE_FUNCTION_URL}/ai-chat`
        : `${apiUrl}/chat/stream`;
        
        
      const payload = useEdgeFunction
        ? { query: messageToProcess.text, history: historyPayload, style: 'markdown' }
        : { question: messageToProcess.text, history: historyPayload };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Edge Function 사용 시 인증 헤더 추가
      if (useEdgeFunction) {
        // 커스텀 JWT 토큰 가져오기
        const authToken = Cookies.get('Authorization');
        
        if (authToken) {
          // 사용자 JWT 토큰 사용
          headers['Authorization'] = `Bearer ${authToken}`;
        } else if (SUPABASE_ANON_KEY) {
          // 로그인되지 않은 경우 Anon Key 사용
          headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
        } else {
          throw new Error('Supabase anon key가 설정되지 않았습니다. 환경변수를 확인해주세요.');
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      if (useEdgeFunction) {
        // Edge Function JSON 응답 처리
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const botMessage: Message = { 
          text: data.answer || '죄송합니다. 답변을 생성할 수 없습니다.', 
          sender: 'bot', 
          timestamp: new Date() 
        };
        
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
      } else {
        // FastAPI SSE 스트리밍 응답 처리
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get readable stream from response.');
        
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEvent = 'message';
        let botMessageCreated = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              const dataString = line.substring(5).trim();
              if (dataString === '[DONE]') break;
              try {
                const data = JSON.parse(dataString);
                if (currentEvent === 'message' && data.delta) {
                  if (!botMessageCreated) {
                    const botMessage: Message = { text: data.delta, sender: 'bot', timestamp: new Date() };
                    setMessages((prev) => [...prev, botMessage]);
                    botMessageCreated = true;
                    setIsTyping(false);
                  } else {
                    setMessages((prev) => prev.map((msg, index) => index === prev.length - 1 ? { ...msg, text: msg.text + data.delta } : msg));
                  }
                } else if (currentEvent === 'error') {
                  const errorMsg: Message = { text: `오류: ${data.message || '알 수 없는 오류'}`, sender: 'bot', timestamp: new Date() };
                  setMessages((prev) => [...prev, errorMsg]);
                  botMessageCreated = true;
                }
                currentEvent = 'message';
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line, parseError);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Chat Edge Function Error:', error);
      const errorMsg: Message = {
        text: `죄송합니다, 답변을 생성하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setIsProcessing(false); // 현재 메시지 처리 완료
    }
  };

  // --- 대기열(Queue) 처리를 위한 useEffect ---
  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0) {
      const nextMessage = messageQueue[0];
      setMessageQueue((prev) => prev.slice(1));
      setIsProcessing(true);
      processMessage(nextMessage);
    }
  }, [messageQueue, isProcessing, processMessage]);

  // --- handleSendMessage는 메시지를 UI와 대기열에 추가하는 역할만 수행 ---
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // 로그인 체크 (개발 완료 후 활성화용)
    // if (!isLoggedIn) {
    //   alert('로그인 후 이용해주세요.');
    //   return;
    // }

    const userMessage: Message = { text: inputMessage, sender: 'user', timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setMessageQueue((prev) => [...prev, userMessage]);
    setInputMessage('');
  };

  const handleMicClick = async () => {
    if (!navigator.mediaDevices) {
      alert("이 브라우저는 마이크를 지원하지 않습니다.");
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
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          const response = await fetch(`${apiUrl}/chat/voice`, { method: 'POST', body: formData, signal: controller.signal });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('음성 변환 실패');
          const result = await response.json();
          setInputMessage(result?.text || '');
        } catch (error) {
          setInputMessage(error instanceof Error && error.name === 'AbortError' ? '변환 시간이 초과되었습니다.' : '변환에 실패했습니다.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setInputMessage('음성 녹음 중... (다시 클릭하여 중지)');
    } catch (error) {
      alert('마이크 권한이 필요합니다.');
    }
  };


  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-20 h-20 rounded-full shadow-2xl hover:scale-110 transition-transform duration-200 z-50"
        style={{ backgroundColor: '#2d5f4f' }}
      >
        <img
          src={chatBotIcon}
          alt="BEGA Chat Bot"
          className="w-full h-full rounded-full p-2"
        />
      </button>

      {/* Chat Window - Popup from bottom right */}
      <div
        style={{
          position: 'fixed',
          bottom: '140px',
          right: '32px',
          width: '500px',
          height: '750px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '2px solid #e5e7eb',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
          pointerEvents: isOpen ? 'auto' : 'none',
          visibility: isOpen ? 'visible' : 'hidden',
          fontSize: '15px',
        }}
      >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b" style={{ backgroundColor: '#2d5f4f' }}>
            <div className="flex items-center gap-3">
              <img src={chatBotIcon} alt="BEGA" className="w-10 h-10 rounded-full bg-white p-1" />
              <div>
                <h3 className="text-white" style={{ fontWeight: 900 }}>야구 가이드 BEGA</h3>
                <p className="text-xs text-green-100">야구 정보 안내</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* 로그인하지 않은 사용자용 UI (개발 완료 후 활성화) */}
            {/* {!isLoggedIn ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <LogIn className="w-16 h-16 mb-4" style={{ color: '#2d5f4f' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2d5f4f' }}>
                  로그인이 필요합니다
                </h3>
                <p className="text-gray-600 mb-6">
                  야구 가이드 BEGA를 이용하시려면<br />
                  로그인해주세요.
                </p>
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    navigateToLogin();
                  }}
                  className="text-white px-6 py-2"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  로그인 하러가기
                </Button>
              </div>
            ) : (
              <>
            */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-white text-gray-900 max-w-[80%]'
                      : 'text-white markdown-content max-w-[95%]'
                  }`}
                  style={message.sender === 'bot' ? { backgroundColor: '#2d5f4f' } : {}}
                >
                  {message.sender === 'bot' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="text-[15px] prose prose-invert max-w-none"
                      components={{
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-2 -mx-2" style={{ maxWidth: '100%' }}>
                            <table className="border-collapse border border-green-300 text-sm" style={{ minWidth: '300px' }} {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-green-700" {...props} />,
                        th: ({node, ...props}) => <th className="border border-green-300 px-2 py-1 text-left font-semibold whitespace-nowrap" {...props} />,
                        td: ({node, ...props}) => <td className="border border-green-300 px-2 py-1 whitespace-nowrap" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-green-600/20" {...props} />,
                        p: ({node, ...props}) => <p className="text-[15px] mb-2 break-words" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-green-100" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside text-[15px] my-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside text-[15px] my-2" {...props} />,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-[15px]">{message.text}</p>
                  )}
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-gray-500' : 'text-green-100'}`}>
                    {message.timestamp.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-3 text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-green-100 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-green-100 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-green-100 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <p className="text-[15px] text-green-100">답변 생성 중...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            {/* 로그인 체크 닫는 태그 */}
            {/* 
              </>
            )}
            */}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleMicClick}
                className={`text-white ${isRecording ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: '#2d5f4f' }}
                aria-label="음성 입력"
                disabled={isProcessing}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                id="chatbot-message-input"
                name="message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isProcessing ? "답변을 기다리는 중입니다..." : "메시지를 입력하세요..."}
                className="flex-1"
                autoComplete="off"
                aria-label="메시지 입력"
                disabled={isProcessing /* || !isLoggedIn */}
              />
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
                aria-label="메시지 전송"
                disabled={isProcessing /* || !isLoggedIn */}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
      </div>
    </>
  );
}
