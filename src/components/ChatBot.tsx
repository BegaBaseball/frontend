import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Badge } from './ui/badge';
import { X, Send, MessageSquare, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatBot } from '../hooks/useChatBot';
import { useAuthStore } from '../store/authStore';
import { useState, useEffect } from 'react';


export default function ChatBot() {
  const { isLoggedIn } = useAuthStore();
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

  return (
    <div style={{ position: 'fixed', zIndex: 9999 }}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="animate-fade-in-up"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            maxWidth: 'calc(100vw - 40px)',
            height: '600px',
            backgroundColor: '#000000',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#2d5f4f',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={chatBotIcon}
                alt="BEGA"
                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', padding: '6px' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>야구 가이드 BEGA</h3>
                  <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-700">Beta</Badge>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>야구 정보 안내</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                color: '#9ca3af',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="scrollbar-hide"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {!isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center', padding: '24px', borderRadius: '16px', backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>로그인이 필요합니다</h3>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>야구 가이드 챗봇은 로그인 후 이용하실 수 있습니다.</p>
                  <a
                    href="/login"
                    style={{
                      display: 'inline-block',
                      padding: '10px 24px',
                      borderRadius: '12px',
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      textDecoration: 'none',
                      fontWeight: '500',
                    }}
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
                    style={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 16px',
                        borderRadius: '16px',
                        maxWidth: '85%',
                        backgroundColor: message.sender === 'user' ? 'white' : 'rgba(55, 65, 81, 0.8)',
                        color: message.sender === 'user' ? '#111827' : 'white',
                        border: message.sender === 'bot' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      }}
                    >
                      {message.sender === 'bot' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm prose prose-invert max-w-none">
                          {message.text}
                        </ReactMarkdown>
                      ) : (
                        <p style={{ margin: 0, fontSize: '14px' }}>{message.text}</p>
                      )}
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: message.sender === 'user' ? '#6b7280' : '#9ca3af' }}>
                        {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: 'rgba(55, 65, 81, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#d1d5db' }}>답변 생성 중...</p>
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
            style={{
              padding: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#111827',
                borderRadius: '16px',
                padding: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <button
                type="button"
                disabled={!isLoggedIn || isProcessing}
                style={{
                  color: '#9ca3af',
                  background: 'none',
                  border: 'none',
                  cursor: !isLoggedIn || isProcessing ? 'not-allowed' : 'pointer',
                  padding: '8px',
                  opacity: !isLoggedIn || isProcessing ? 0.5 : 1,
                }}
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={!isLoggedIn ? '로그인이 필요합니다...' : '메시지를 입력하세요...'}
                disabled={!isLoggedIn || isProcessing}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: '14px',
                  padding: '8px',
                }}
              />
              <button
                type="submit"
                disabled={!isLoggedIn || isProcessing}
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px',
                  cursor: !isLoggedIn || isProcessing ? 'not-allowed' : 'pointer',
                  opacity: !isLoggedIn || isProcessing ? 0.5 : 1,
                }}
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
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#2d5f4f',
            border: 'none',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <img
            src={chatBotIcon}
            alt="BEGA"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
            }}
          />
        </button>
      )}
    </div>
  );
}