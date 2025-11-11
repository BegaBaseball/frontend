import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  ChevronLeft,
  Send,
  Users,
  Calendar,
  MapPin,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore, ChatMessage } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { useWebSocket } from '../hooks/useWebSocket';

export default function MateChat() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedParty } = useMateStore();

  // 모든 useState를 최상단에 선언
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{ 
    id: number;
    email: string; 
    name: string 
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleMessageReceived = useCallback((message: ChatMessage) => {
    console.log('메시지 수신:', message);
    setMessages((prev) => {
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/auth/mypage', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          console.log('👤 사용자 정보:', result);
          
          if (result.success && result.data) {
            const userIdResponse = await fetch(
              `http://localhost:8080/api/users/email-to-id?email=${encodeURIComponent(result.data.email)}`,
              { credentials: 'include' }
            );
            
            let userId = result.data.email;
            
            if (userIdResponse.ok) {
              const userIdData = await userIdResponse.json();
              userId = userIdData.data || userIdData;
            }
            
            console.log('사용자 ID:', userId);
            
            setCurrentUser({
              id: typeof userId === 'number' ? userId : parseInt(userId),
              email: result.data.email,
              name: result.data.name,
            });
          }
        } else {
          console.error('인증 실패:', response.status);
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserInfo();
  }, []);

  // WebSocket 연결
  const { sendMessage: sendWebSocketMessage, isConnected } = useWebSocket({
    partyId: selectedParty?.id || '',
    onMessageReceived: handleMessageReceived,
    enabled: !!selectedParty && !!currentUser,
  });

  // 기존 메시지 불러오기
  useEffect(() => {
    if (!selectedParty || !currentUser) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/chat/party/${selectedParty.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('기존 메시지 개수:', data.length);
          setMessages(data);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [selectedParty, currentUser]);

  // 스크롤 자동 이동
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // isHost 계산 (조건부 return 전에)
  const isHost = currentUser && selectedParty 
    ? String(selectedParty.hostId) === String(currentUser.id) 
    : false;

  // 내 신청 정보 확인
  useEffect(() => {
    if (!selectedParty || !currentUser || isHost) {
      setIsCheckingApproval(false);
      return;
    }

    const checkMyApproval = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/applications/applicant/${currentUser.id}`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const applications = await response.json();
          const myApp = applications.find((app: any) => 
            String(app.partyId) === String(selectedParty.id)
          );
          console.log('채팅방 - 내 신청 정보:', myApp);
          console.log('승인 여부:', myApp?.isApproved);
          setMyApplication(myApp);
        }
      } catch (error) {
        console.error('신청 정보 확인 실패:', error);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkMyApproval();
  }, [selectedParty, currentUser, isHost]);

  // 조건부 return들
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="mate" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              로그인이 필요합니다. 로그인 후 이용해주세요.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => window.location.href = '/login'}
            className="mt-4 text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedParty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="mate" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              파티를 선택해주세요.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => setCurrentView('mate')}
            className="mt-4 text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            파티 목록으로
          </Button>
        </div>
      </div>
    );
  }

  console.log('🏠 호스트 여부:', {
    partyHostId: selectedParty.hostId,
    currentUserId: currentUser.id,
    isHost
  });

  // 승인 체크 중
  if (isCheckingApproval) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
          <p className="text-gray-600">승인 정보 확인 중...</p>
        </div>
      </div>
    );
  }

  // 호스트가 아니고 승인도 안 받았으면 접근 불가
  if (!isHost && !myApplication?.isApproved) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="mate" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('mateDetail')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              호스트의 승인을 기다려주세요.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !isConnected) {
      console.warn('메시지 전송 불가:', { messageText, isConnected });
      return;
    }

    const newMessage = {
      partyId: selectedParty.id,
      senderId: String(currentUser.id),
      senderName: currentUser.name,
      message: messageText,
    };

    console.log('📤 메시지 전송:', newMessage);
    sendWebSocketMessage(newMessage);
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ color: '#2d5f4f' }}>
                    {selectedParty.stadium}
                  </h3>
                  {isHost && (
                    <Badge className="bg-blue-500 text-white text-xs">호스트</Badge>
                  )}
                </div>
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
                    {selectedParty.currentParticipants}명
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span>{isConnected ? '연결됨' : '연결 중...'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="flex-1 p-4 mb-4 flex flex-col overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            {groupedMessages.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-2">아직 메시지가 없습니다</p>
                <p className="text-sm text-gray-400">
                  {isHost ? '참여자와 인사를 나눠보세요' : '호스트와 인사를 나눠보세요'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedMessages.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <div className="flex items-center gap-4 mb-4">
                      <Separator className="flex-1" />
                      <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                        {group.date}
                      </span>
                      <Separator className="flex-1" />
                    </div>

                    <div className="space-y-3">
                      {group.messages.map((msg) => {
                        const isMyMessage = String(msg.senderId) === String(currentUser.id);
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
                                  isMyMessage ? { backgroundColor: '#2d5f4f' } : {}
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

        <Card className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={isConnected ? "메시지를 입력하세요..." : "서버 연결 중..."}
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || !isConnected}
              className="text-white px-6"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>

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