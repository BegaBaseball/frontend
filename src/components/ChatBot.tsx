import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Badge } from './ui/badge';
import { X, Send, MessageSquare, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthStore } from '../store/authStore';
import { useIsMobile } from '../hooks/use-mobile';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';


export default function ChatBot() {
  const { isLoggedIn } = useAuthStore();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const {
    isOpen,
    setIsOpen,
    messages,
    inputMessage,
    setInputMessage,
    isTyping,
    isProcessing,
    messagesEndRef,
    messagesContainerRef,
    handleSendMessage,
  } = useChatBot();

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // 300ms matches animation duration
  };

  // 모바일에서 챗봇 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // Input Auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isProcessing && inputRef.current) {
      // give a small timeout to ensure the DOM is ready and the disabled attribute is removed
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isOpen, isProcessing]);

  return (
    <div className="fixed z-[9999]">
      {/* Chat Window - 모바일: 전체화면 / 데스크톱: 우측하단 팝업 */}
      {isOpen && (
        <div
          className={`
            ${isClosing ? 'animate-fade-out-down' : 'animate-fade-in-up'}
            fixed flex flex-col overflow-hidden
            bg-white dark:bg-black border border-gray-200 dark:border-white/10
            ${isMobile
              ? 'inset-0 rounded-none'
              : 'bottom-5 right-5 w-[400px] max-w-[calc(100vw-40px)] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            }
          `}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-[#2d5f4f]">
            <div className="flex items-center gap-3">
              <img
                src={chatBotIcon}
                alt="BEGA"
                className="w-10 h-10 rounded-full bg-white p-1.5"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-base m-0">야구 가이드 BEGA</h3>
                  <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">Beta</Badge>
                </div>
                <p className="text-white/80 text-xs m-0">야구 정보 안내</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer
                         p-2 rounded-full transition-colors
                         min-w-[44px] min-h-[44px] flex items-center justify-center
                         focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="챗봇 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide"
          >
            {!isLoggedIn ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-white/10">
                  <h3 className="text-gray-900 dark:text-white font-bold mb-2">로그인이 필요합니다</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.</p>
                  <a
                    href="/login"
                    className="inline-block py-2.5 px-6 rounded-xl text-gray-900 dark:text-white bg-gray-200 dark:bg-white/10
                               border border-gray-300 dark:border-white/20 no-underline font-medium
                               hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                  >
                    로그인하러 가기
                  </a>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  // 봇 메시지이고 텍스트가 아직 없으면(로딩 중) 렌더링하지 않음 (로딩바만 표시)
                  if (message.sender === 'bot' && !message.text) return null;

                  return (
                    <div
                      key={index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          py-2.5 px-4 rounded-2xl max-w-[85%]
                          ${message.sender === 'user'
                            ? 'bg-[#2d5f4f] text-white'
                            : 'bg-gray-100 dark:bg-gray-700/80 text-gray-900 dark:text-white border border-gray-300 dark:border-white/10'
                          }
                        `}
                      >
                        {message.sender === 'bot' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm prose dark:prose-invert max-w-none">
                            {message.text}
                          </ReactMarkdown>
                        ) : (
                          <p className="m-0 text-sm">{message.text}</p>
                        )}
                        <p className={`mt-1 text-[11px] ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                          {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="py-3 px-4 rounded-2xl bg-gray-100 dark:bg-gray-700/80 border border-gray-300 dark:border-white/10">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-200 dark:border-white/10"
          >
            <div className={`
              flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-2xl p-2 border border-gray-300 dark:border-white/10
              transition-colors duration-200
              ${isProcessing ? 'border-[#2d5f4f]/50 bg-gray-100 dark:bg-gray-900/80' : 'focus-within:border-[#2d5f4f] focus-within:bg-gray-50 dark:focus-within:bg-black'}
            `}>
              <button
                type="button"
                disabled={!isLoggedIn || isProcessing}
                className={`
                  text-gray-500 dark:text-gray-400 bg-transparent border-none p-2
                  ${!isLoggedIn || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200'}
                  transition-colors
                `}
                aria-label="파일 첨부"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={!isLoggedIn ? '로그인이 필요합니다...' : (isProcessing ? '답변을 기다리는 중...' : '메시지를 입력하세요...')}
                disabled={!isLoggedIn}
                inputMode="text"
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm py-2 px-1
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!isLoggedIn || isProcessing || !inputMessage.trim()}
                className={`
                  bg-[#2d5f4f] text-white border-none rounded-xl p-2
                  ${(!isLoggedIn || isProcessing || !inputMessage.trim()) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#3d7f6f]'}
                  transition-colors
                  min-w-[40px] min-h-[40px] flex items-center justify-center
                `}
                aria-label="메시지 전송"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Launcher Button - 챗봇이 닫혀있을 때만 표시 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 w-16 h-16 rounded-full bg-[#2d5f4f] border-none
                     shadow-[0_10px_25px_rgba(0,0,0,0.3)] cursor-pointer
                     flex items-center justify-center text-white
                     transition-transform duration-200 hover:scale-110 active:scale-95
                     focus:outline-none focus:ring-4 focus:ring-[#2d5f4f]/50"
          aria-label="챗봇 열기"
        >
          <img
            src={chatBotIcon}
            alt=""
            className="w-12 h-12 rounded-full"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}