import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Badge } from './ui/badge';
import { X, Send, MessageSquare, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthStore } from '../store/authStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useEffect } from 'react';


export default function ChatBot() {
  const { isLoggedIn } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
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

  return (
    <div className="fixed z-[9999]">
      {/* Chat Window - 모바일: 전체화면 / 데스크톱: 우측하단 팝업 */}
      {isOpen && (
        <div
          className={`
            animate-fade-in-up
            fixed flex flex-col overflow-hidden
            bg-black border border-white/10
            ${isMobile
              ? 'inset-0 rounded-none'
              : 'bottom-5 right-5 w-[400px] max-w-[calc(100vw-40px)] h-[600px] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            }
          `}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#2d5f4f]">
            <div className="flex items-center gap-3">
              <img
                src={chatBotIcon}
                alt="BEGA"
                className="w-10 h-10 rounded-full bg-white p-1.5"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-base m-0">야구 가이드 BEGA</h3>
                  <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-700">Beta</Badge>
                </div>
                <p className="text-gray-400 text-xs m-0">야구 정보 안내</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-200 bg-transparent border-none cursor-pointer
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
                <div className="text-center p-6 rounded-2xl bg-gray-800/50 border border-white/10">
                  <h3 className="text-white font-bold mb-2">로그인이 필요합니다</h3>
                  <p className="text-gray-400 text-sm mb-4">야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.</p>
                  <a
                    href="/login"
                    className="inline-block py-2.5 px-6 rounded-xl text-white bg-white/10
                               border border-white/20 no-underline font-medium
                               hover:bg-white/20 transition-colors"
                  >
                    로그인하러 가기
                  </a>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        py-2.5 px-4 rounded-2xl max-w-[85%]
                        ${message.sender === 'user'
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-700/80 text-white border border-white/10'
                        }
                      `}
                    >
                      {message.sender === 'bot' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm prose prose-invert max-w-none">
                          {message.text}
                        </ReactMarkdown>
                      ) : (
                        <p className="m-0 text-sm">{message.text}</p>
                      )}
                      <p className={`mt-1 text-[11px] ${message.sender === 'user' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="py-3 px-4 rounded-2xl bg-gray-700/80 border border-white/10">
                      <p className="m-0 text-sm text-gray-300">답변 생성 중...</p>
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
            className="p-4 border-t border-white/10"
          >
            <div className="flex items-center gap-2 bg-gray-900 rounded-2xl p-2 border border-white/10">
              <button
                type="button"
                disabled={!isLoggedIn || isProcessing}
                className={`
                  text-gray-400 bg-transparent border-none p-2
                  ${!isLoggedIn || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-gray-200'}
                  transition-colors
                `}
                aria-label="파일 첨부"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={!isLoggedIn ? '로그인이 필요합니다...' : '메시지를 입력하세요...'}
                disabled={!isLoggedIn || isProcessing}
                inputMode="text"
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2 px-1
                           placeholder:text-gray-500 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!isLoggedIn || isProcessing}
                className={`
                  bg-white text-black border-none rounded-xl p-2
                  ${!isLoggedIn || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
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