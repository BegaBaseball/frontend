import { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  ChevronLeft,
  Send,
  Users,
  Calendar,
  MapPin,
  Info,
} from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore, ChatMessage } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateChat() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const {
    selectedParty,
    getChatMessages,
    sendMessage,
    getChatRoom,
    markAsRead,
    currentUserId,
    getPartyApplications,
  } = useMateStore();

  const [messageText, setMessageText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (!selectedParty) {
    return null;
  }

  const chatRoom = getChatRoom(selectedParty.id);
  const messages = getChatMessages(selectedParty.id);
  const isHost = selectedParty.hostId === currentUserId;
  const applications = getPartyApplications(selectedParty.id);
  const approvedApplications = applications.filter(app => app.isApproved);

  // 승인된 참여자가 없으면 채팅 불가
  if (approvedApplications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="mate" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => setCurrentView(isHost ? 'mateManage' : 'mateDetail')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              승인된 참여자가 없습니다. {isHost ? '신청을 승인하면 채팅을 시작할 수 있습니다.' : '호스트의 승인을 기다려주세요.'}
            </AlertDescription>
          </Alert>
          {isHost && (
            <Button
              onClick={() => setCurrentView('mateManage')}
              className="mt-4 text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              신청 관리하기
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Mark as read when entering chat
  useEffect(() => {
    markAsRead(selectedParty.id);
  }, [selectedParty.id, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      partyId: selectedParty.id,
      senderId: currentUserId,
      senderName: isHost ? selectedParty.hostName : '나',
      message: messageText,
      createdAt: new Date().toISOString(),
    };

    sendMessage(newMessage);
    setMessageText('');
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = formatMessageDate(msg.createdAt);
    const existingGroup = groupedMessages.find((g) => g.date === dateStr);
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentPage="mate" />

      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10 flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView(isHost ? 'mateManage' : 'mateDetail')}
            className="mb-2"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <TeamLogo teamId={selectedParty.teamId} size="sm" />
              <div className="flex-1">
                <h3 className="mb-1" style={{ color: '#2d5f4f' }}>
                  {selectedParty.stadium}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedParty.gameDate}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedParty.section}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {chatRoom?.participants.length || 0}명
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 p-4 mb-4 flex flex-col overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            {groupedMessages.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">아직 메시지가 없습니다</p>
                <p className="text-sm text-gray-400">
                  {isHost
                    ? '참여자와 인사를 나눠보세요'
                    : '호스트와 인사를 나눠보세요'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedMessages.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {/* Date Divider */}
                    <div className="flex items-center gap-4 mb-4">
                      <Separator className="flex-1" />
                      <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                        {group.date}
                      </span>
                      <Separator className="flex-1" />
                    </div>

                    {/* Messages */}
                    <div className="space-y-3">
                      {group.messages.map((msg) => {
                        const isMyMessage = msg.senderId === currentUserId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`flex flex-col ${
                                isMyMessage ? 'items-end' : 'items-start'
                              } max-w-[70%]`}
                            >
                              {!isMyMessage && (
                                <span className="text-xs text-gray-600 mb-1">
                                  {msg.senderName}
                                </span>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isMyMessage
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                                style={
                                  isMyMessage
                                    ? { backgroundColor: '#2d5f4f' }
                                    : {}
                                }
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {msg.message}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 mt-1">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Message Input */}
        <Card className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!messageText.trim()}
              className="text-white px-6"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        {/* Info */}
        <Alert className="mt-4">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>경기 당일까지 채팅을 통해 만날 장소와 시간을 조율하세요</li>
              <li>개인정보는 채팅에서 공유하지 마세요</li>
              <li>부적절한 언행은 신고 대상이 됩니다</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
