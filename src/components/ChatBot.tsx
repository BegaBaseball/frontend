import chatBotIcon from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { X, Send, Mic } from 'lucide-react';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    const botMessage: Message = {
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);

    const apiUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';

    const eventSource = new EventSource(
      `${apiUrl}/chat/stream?q=${encodeURIComponent(inputMessage)}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.delta) {
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1
              ? { ...msg, text: msg.text + data.delta }
              : msg
          )
        );
      }
    };

    eventSource.onerror = () => {
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, text: '죄송합니다, 답변을 생성하는 중 오류가 발생했습니다.' }
            : msg
        )
      );
      eventSource.close();
    };

    eventSource.addEventListener('done', () => {
      eventSource.close();
    });
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
                      : 'text-white'
                  }`}
                  style={message.sender === 'bot' ? { backgroundColor: '#2d5f4f' } : {}}
                >
                  <p className="text-sm">{message.text}</p>
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
