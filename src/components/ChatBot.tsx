import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Send, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthStore } from '../store/authStore';

export default function ChatBot() {
  const { isLoggedIn } = useAuthStore();
  const {
    isOpen,
    setIsOpen,
    messages,
    inputMessage,
    setInputMessage,
    isRecording,
    isTyping,
    isProcessing,
    messagesEndRef,
    handleSendMessage,
    handleMicClick,
  } = useChatBot();

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

      {/* Chat Window */}
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
        <div
          className="p-4 flex items-center justify-between border-b"
          style={{ backgroundColor: '#2d5f4f' }}
        >
          <div className="flex items-center gap-3">
            <img
              src={chatBotIcon}
              alt="BEGA"
              className="w-10 h-10 rounded-full bg-white p-1"
            />
            <div>
              <h3 className="text-white" style={{ fontWeight: 900 }}>
                야구 가이드 BEGA
              </h3>
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
          {!isLoggedIn ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 rounded-2xl bg-white shadow-sm max-w-md">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  <img
                    src={chatBotIcon}
                    alt="BEGA"
                    className="w-12 h-12 rounded-full p-1"
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  로그인이 필요합니다
                </h3>
                <p className="text-gray-600 mb-4">
                  야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.
                </p>
                <a
                  href="/login"
                  className="inline-block px-6 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: '#2d5f4f' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
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
                          table: ({ node, ...props }) => (
                            <div
                              className="overflow-x-auto my-2 -mx-2"
                              style={{ maxWidth: '100%' }}
                            >
                              <table
                                className="border-collapse border border-green-300 text-sm"
                                style={{ minWidth: '300px' }}
                                {...props}
                              />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-green-700" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th
                              className="border border-green-300 px-2 py-1 text-left font-semibold whitespace-nowrap"
                              {...props}
                            />
                          ),
                          td: ({ node, ...props }) => (
                            <td
                              className="border border-green-300 px-2 py-1 whitespace-nowrap"
                              {...props}
                            />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className="hover:bg-green-600/20" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-[15px] mb-2 break-words" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-green-100" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside text-[15px] my-2" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside text-[15px] my-2" {...props} />
                          ),
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-[15px]">{message.text}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-gray-500' : 'text-green-100'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
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
                        <span 
                          className="w-2 h-2 bg-green-100 rounded-full"
                          style={{ animation: 'dotBounce 1.4s infinite ease-in-out' }}
                        />
                        <span
                          className="w-2 h-2 bg-green-100 rounded-full"
                          style={{ animation: 'dotBounce 1.4s infinite ease-in-out 0.2s' }}
                        />
                        <span
                          className="w-2 h-2 bg-green-100 rounded-full"
                          style={{ animation: 'dotBounce 1.4s infinite ease-in-out 0.4s' }}
                        />
                      </div>
                      <p className="text-[15px] text-green-100">답변 생성 중...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
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
              disabled={!isLoggedIn || isProcessing}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Input
              id="chatbot-message-input"
              name="message"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                !isLoggedIn
                  ? '로그인이 필요합니다...'
                  : isProcessing
                  ? '답변을 기다리는 중입니다...'
                  : '메시지를 입력하세요...'
              }
              className="flex-1"
              autoComplete="off"
              aria-label="메시지 입력"
              disabled={!isLoggedIn || isProcessing}
            />
            <Button
              type="submit"
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
              aria-label="메시지 전송"
              disabled={!isLoggedIn || isProcessing}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}