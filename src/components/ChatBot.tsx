import chatBotIcon from '/src/assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { X, Send, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Return the raw payload, not Base64 encoded
  return payload;
};

export default function ChatBot() {
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
  const eventSourceRef = useRef<EventSource | null>(null); // Keep for cleanup, though not used for new requests

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Close any existing EventSource before creating a new one
    eventSourceRef.current?.close(); // Still close if it was EventSource

    const userMessage: Message = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    const conversationForHistory = [...messages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');

    const botMessage: Message = {
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);

    const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';
    const historyPayload = buildHistoryPayload(conversationForHistory); // This now returns raw array

    try {
      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentInput, // Use 'question' as per backend's POST /stream expects 'question' in payload
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get readable stream from response.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message'; // Default event type if not specified

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            const dataString = line.substring(5).trim();
            if (dataString === '[DONE]') {
              break; // Explicitly handle done event
            }
            try {
              const data = JSON.parse(dataString);
              if (currentEvent === 'message' && data.delta) {
                setMessages((prev) =>
                  prev.map((msg, index) =>
                    index === prev.length - 1
                      ? { ...msg, text: msg.text + data.delta }
                      : msg
                  )
                );
              } else if (currentEvent === 'error') {
                console.error('SSE Error:', data);
                setMessages((prev) =>
                  prev.map((msg, index) =>
                    index === prev.length - 1
                      ? { ...msg, text: `오류: ${data.message || '알 수 없는 오류'}` }
                      : msg
                  )
                );
              }
              currentEvent = 'message'; // Reset for next event block
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat Stream Error:', error);
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, text: `죄송합니다, 답변을 생성하는 중 오류가 발생했습니다: ${error.message || error}` }
            : msg
        )
      );
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      // 녹음 중지
      setIsRecording(false);
      // TODO: 실제 STT API 연동 시 여기서 음성을 텍스트로 변환
      setInputMessage('음성 입력 기능 준비 중입니다.');
    } else {
      // 녹음 시작
      setIsRecording(true);
      // TODO: 실제 STT API 연동 시 여기서 녹음 시작
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

      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[700px] shadow-2xl flex flex-col z-50 overflow-hidden">
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
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-white text-gray-900'
                      : 'text-white markdown-content'
                  }`}
                  style={message.sender === 'bot' ? { backgroundColor: '#2d5f4f' } : {}}
                >
                  {message.sender === 'bot' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="text-sm prose prose-invert max-w-none"
                      components={{
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-2">
                            <table className="min-w-full border-collapse border border-green-300" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-green-700" {...props} />,
                        th: ({node, ...props}) => <th className="border border-green-300 px-3 py-2 text-left font-semibold" {...props} />,
                        td: ({node, ...props}) => <td className="border border-green-300 px-3 py-2" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-green-600/20" {...props} />,
                        p: ({node, ...props}) => <p className="text-sm mb-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-green-100" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside text-sm my-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside text-sm my-2" {...props} />,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm">{message.text}</p>
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleMicClick}
                className={`text-white ${isRecording ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1"
              />
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
