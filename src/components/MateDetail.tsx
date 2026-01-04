import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Calendar,
  MapPin,
  Users,
  Shield,
  Star,
  CheckCircle,
  Share2,
  ChevronLeft,
  Clock,
  AlertTriangle,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import { api } from '../utils/api';
import { Alert, AlertDescription } from './ui/alert';
import { DEPOSIT_AMOUNT } from '../utils/constants'; 

export default function MateDetail() {
  const navigate = useNavigate();  
  const { id } = useParams<{ id: string }>();  
  const selectedParty = useMateStore((state) => state.selectedParty);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);
  const updateParty = useMateStore((state) => state.updateParty);

  
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  // localStorage에서 파티 정보 복원
useEffect(() => {
  if (!selectedParty) {
    const savedParty = localStorage.getItem('selectedParty');
    if (savedParty) {
      try {
        const party = JSON.parse(savedParty);
        setSelectedParty(party);
      } catch (error) {
        console.error('파티 정보 복원 실패:', error);
        localStorage.removeItem('selectedParty');
      }
    }
  }
}, [selectedParty, setSelectedParty]);

// selectedParty가 변경될 때 localStorage에 저장
useEffect(() => {
  if (selectedParty) {
    localStorage.setItem('selectedParty', JSON.stringify(selectedParty));
  }
}, [selectedParty]);

 // 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await api.getCurrentUser();  
        const userId = await api.getUserIdByEmail(userData.data.email);  // 변경
        setCurrentUserId(userId.data || userId);
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // 내 신청 정보 가져오기
  useEffect(() => {
    if (!selectedParty || !currentUserId) return;

    const fetchMyApplication = async () => {
      try {
        const applicationsData = await api.getApplicationsByApplicant(currentUserId);  // 변경
        const myApp = applicationsData.find((app: any) => 
          String(app.partyId) === String(selectedParty.id)
        );
        setMyApplication(myApp);
      } catch (error) {
        console.error('내 신청 정보 가져오기 실패:', error);
      }
    };

    fetchMyApplication();
  }, [selectedParty, currentUserId]);

  // 파티 신청 목록 가져오기 (호스트인 경우)
  useEffect(() => {
    if (!selectedParty || !currentUserId) return;

    const isHost = String(selectedParty.hostId) === String(currentUserId);
    if (!isHost) return;

    const fetchApplications = async () => {
      try {
        const data = await api.getApplicationsByParty(selectedParty.id);  
        setApplications(data);
      } catch (error) {
        console.error('신청 목록 가져오기 실패:', error);
      }
    };

    fetchApplications();
  }, [selectedParty, currentUserId]);

  const isGameTomorrow = () => {
    if (!selectedParty) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const gameDate = new Date(selectedParty.gameDate);
    gameDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((gameDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // 경기가 오늘이거나 내일이면 true (취소 불가)
    return daysDiff < 1;
  };

  // 취소 가능 여부 체크
  const canCancel = () => {
    if (!myApplication) return false;
    if (myApplication.isRejected) return false;
    if (selectedParty.status === 'CHECKED_IN' || selectedParty.status === 'COMPLETED') {
      return false;
    }
    // 승인 전에는 항상 취소 가능
    if (!myApplication.isApproved) return true;
    // 승인 후에는 경기 D-1까지만 취소 가능
    return !isGameTomorrow();
  };

  // 신청 취소 핸들러
  const handleCancelApplication = async () => {
    if (!myApplication || !currentUserId) return;

    const isApproved = myApplication.isApproved;
    
    let confirmMessage = '';
    if (isApproved) {
      confirmMessage = 
        '참여를 취소하시겠습니까?\n\n' +
        '⚠️ 승인 후 취소 시:\n' +
        '- 보증금 10,000원은 환불되지 않습니다\n' +
        '- 티켓 가격만 환불됩니다\n' +
        '- 취소는 경기 하루 전까지만 가능합니다';
    } else {
      confirmMessage = '신청을 취소하시겠습니까?\n\n전액 환불됩니다.';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsCancelling(true);

    try {
      await api.cancelApplication(myApplication.id, currentUserId);
      
      if (isApproved) {
        alert('참여가 취소되었습니다.\n티켓 가격만 환불되며, 보증금은 환불되지 않습니다.');
      } else {
        alert('신청이 취소되었습니다.\n결제 금액이 전액 환불됩니다.');
      }
      
      // 내 신청 정보 초기화
      setMyApplication(null);
      
      // 파티 정보 다시 불러오기
      const updatedParty = await api.getPartyById(selectedParty.id);
      setSelectedParty(updatedParty);
      
    } catch (error: any) {
      console.error('신청 취소 중 오류:', error);
      const errorMessage = error.response?.data?.message || '신청 취소 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!selectedParty) {
    return null;
  }

  const isHost = String(selectedParty.hostId) === String(currentUserId);
  const isApproved = myApplication?.isApproved || false;
  const approvedApplications = applications.filter(app => app.isApproved);
  const pendingApplications = applications.filter(app => !app.isApproved && !app.isRejected);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      PENDING: { label: '모집 중', color: '#2d5f4f' },
      MATCHED: { label: '매칭 성공', color: '#059669' },
      FAILED: { label: '매칭 실패', color: '#dc2626' },
      SELLING: { label: '티켓 판매', color: '#ea580c' },
      SOLD: { label: '판매 완료', color: '#6b7280' },
      CHECKED_IN: { label: '체크인 완료', color: '#7c3aed' },
      COMPLETED: { label: '관람 완료', color: '#4b5563' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge style={{ backgroundColor: config.color }} className="text-white">
        {config.label}
      </Badge>
    );
  };

  const getBadgeInfo = (badge: string) => {
    if (badge === 'verified') {
      return {
        icon: <Shield className="w-5 h-5 text-blue-500" />,
        label: '인증 회원',
        color: 'text-blue-600',
      };
    }
    if (badge === 'trusted') {
      return {
        icon: <Star className="w-5 h-5 text-yellow-500" />,
        label: '신뢰 회원',
        color: 'text-yellow-600',
      };
    }
    return {
      icon: null,
      label: '새 회원',
      color: 'text-gray-600',
    };
  };

  const badgeInfo = getBadgeInfo(selectedParty.hostBadge);

  const isGameSoon = () => {
    const gameDate = new Date(selectedParty.gameDate);
    const now = new Date();
    const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilGame < 24 && hoursUntilGame > 0;
  };

  const canConvertToSale =
    (selectedParty.status === 'PENDING' || selectedParty.status === 'FAILED') &&
    isGameSoon();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '직관메이트 파티',
        text: `${selectedParty.stadium}에서 ${selectedParty.gameDate}에 열리는 경기 함께 보실 분!`,
        url: window.location.href,
      });
    } else {
      alert('공유 링크가 클립보드에 복사되었습니다!');
    }
  };

  const handleApply = () => {
    navigate(`/mate/${id}/apply`);  
  };

  const handleConvertToSale = () => {
    const price = prompt('판매 가격을 입력해주세요 (원):');
    if (price && !isNaN(Number(price))) {
      updateParty(selectedParty.id, { status: 'SELLING', price: Number(price) });
    }
  };

  const handleCheckIn = () => {
    navigate(`/mate/${id}/checkin`);  
  };

  const handleManageParty = () => {
    navigate(`/mate/${id}/manage`); 
  };

  const handleOpenChat = () => {
    navigate(`/mate/${id}/chat`);  
  };

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <img
      src={grassDecor}
      alt=""
      className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
    />

    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <Button
        variant="ghost"
        onClick={() => {
          localStorage.removeItem('selectedParty'); 
          navigate('/mate');  
        }}
        className="mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        목록으로
      </Button>

        <Card className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-100 flex-shrink-0">
                <TeamLogo teamId={selectedParty.teamId} size={60} />
              </div>
              <div>
                <h1 className="mb-2" style={{ color: '#2d5f4f' }}>
                  {selectedParty.stadium} 직관
                </h1>
                {getStatusBadge(selectedParty.status)}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="rounded-full"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Game Info */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <div>
                <p className="text-sm text-gray-500">경기 일시</p>
                <p>
                  {selectedParty.gameDate} {selectedParty.gameTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <div>
                <p className="text-sm text-gray-500">구장 및 좌석</p>
                <p>
                  {selectedParty.stadium} • {selectedParty.section}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <div>
                <p className="text-sm text-gray-500">모집 인원</p>
                <p>
                  {selectedParty.currentParticipants}/{selectedParty.maxParticipants}명
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                  <TeamLogo teamId={selectedParty.homeTeam} size={36} />
                </div>
                <span>홈</span>
              </div>
              <span className="text-xl">vs</span>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                  <TeamLogo teamId={selectedParty.awayTeam} size={36} />
                </div>
                <span>원정</span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Host Info */}
          <div className="mb-6">
            <h3 className="mb-4" style={{ color: '#2d5f4f' }}>
              호스트 정보
            </h3>
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span>{selectedParty.hostName}</span>
                  {badgeInfo.icon}
                  <span className={`text-sm ${badgeInfo.color}`}>
                    {badgeInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{selectedParty.hostRating}</span>
                  <span className="text-sm text-gray-500">(평점)</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="mb-6">
            <h3 className="mb-4" style={{ color: '#2d5f4f' }}>
              파티 소개
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {selectedParty.description}
            </p>
          </div>

          {/* Ticket Verification */}
          <div className="mb-6">
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">예매내역 인증 완료</span>
            </div>
          </div>

          {/* Price Info */}
            <div className="mb-6">
              {selectedParty.status === 'SELLING' && selectedParty.price ? (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-700">티켓 판매가</span>
                    <span className="text-orange-900" style={{ fontWeight: 'bold' }}>
                      {selectedParty.price.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">티켓 가격</span>
                      <span className="text-blue-900">
                        {(selectedParty.ticketPrice || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">보증금</span>
                      <span className="text-blue-900">10,000원</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-blue-700" style={{ fontWeight: 'bold' }}>총 결제 금액</span>
                      <span className="text-lg text-blue-900" style={{ fontWeight: 'bold' }}>
                        {((selectedParty.ticketPrice || 0) + 10000).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    티켓 가격은 경기 1일 후 자정에 호스트에게 정산됩니다 (수수료 10%)
                  </p>
                </div>
              )}
            </div>

          {/* Warnings */}
          {selectedParty.status === 'MATCHED' && (
            <Alert className="mb-6">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <p className="mb-2">노쇼 위약금 안내</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>경기 당일 체크인하지 않으면 노쇼로 간주됩니다</li>
                  <li>노쇼 시 티켓 가격의 2배를 위약금으로 납부해야 합니다</li>
                  <li>위약금은 파티장에게 전달됩니다</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {isGameSoon() && selectedParty.status === 'PENDING' && (
            <Alert className="mb-6">
              <Clock className="w-4 h-4" />
              <AlertDescription>
                경기 시작 24시간 이내입니다. 매칭이 어려울 경우 티켓 판매로 전환할 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Host Actions */}
            {isHost && (
              <>
                <Button
                  onClick={handleManageParty}
                  className="w-full text-white"
                  size="lg"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  <Settings className="w-5 h-5 mr-2" />
                  신청 관리 ({pendingApplications.length})
                </Button>
                {approvedApplications.length > 0 && (
                  <Button
                    onClick={handleOpenChat}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    채팅방 입장
                  </Button>
                )}
              </>
            )}

            {/* Participant Actions */}
            {!isHost && (
              <>
                {/* 승인됨 - 채팅 + 취소 버튼 */}
                {isApproved && (
                  <>
                    <Button
                      onClick={handleOpenChat}
                      className="w-full text-white"
                      size="lg"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      채팅방 입장
                    </Button>
                    
                    {canCancel() && (
                      <>
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800 text-sm">
                            승인 후 취소 시 보증금 10,000원은 환불되지 않습니다.
                          </AlertDescription>
                        </Alert>
                        <Button
                          onClick={handleCancelApplication}
                          disabled={isCancelling}
                          variant="outline"
                          className="w-full text-red-600 border-red-300 hover:bg-red-50"
                          size="lg"
                        >
                          {isCancelling ? '취소 중...' : '참여 취소'}
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* 아직 신청 안 함 */}
                {selectedParty.status === 'PENDING' && !myApplication && (
                  <Button
                    onClick={handleApply}
                    className="w-full text-white"
                    size="lg"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    참여하기
                  </Button>
                )}

                {/* 승인 대기 중 - 취소 가능 */}
                {myApplication && !myApplication.isApproved && !myApplication.isRejected && (
                  <div className="space-y-3">
                    <Alert>
                      <Clock className="w-4 h-4" />
                      <AlertDescription>
                        신청이 완료되었습니다. 호스트의 승인을 기다려주세요.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleCancelApplication}
                      disabled={isCancelling}
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      size="lg"
                    >
                      {isCancelling ? '취소 중...' : '신청 취소'}
                    </Button>
                  </div>
                )}

                {/* 거절됨 */}
                {myApplication && myApplication.isRejected && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      신청이 거절되었습니다.
                    </AlertDescription>
                  </Alert>
                )}

                {/* 경기 D-1 이후 취소 불가 안내 */}
                {myApplication && myApplication.isApproved && isGameTomorrow() && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      경기 하루 전부터는 참여를 취소할 수 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* 체크인 버튼 - 기존 코드 유지 */}
            {selectedParty.status === 'MATCHED' && (isHost || isApproved) && (
              <Button
                onClick={handleCheckIn}
                variant="outline"
                className="w-full"
                size="lg"
              >
                체크인하기
              </Button>
            )}

            {selectedParty.status === 'SELLING' && !isHost && (
              <Button
                onClick={handleApply}
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: '#ea580c' }}
              >
                구매하기
              </Button>
            )}

            {isHost && canConvertToSale && (
              <Button
                onClick={handleConvertToSale}
                variant="outline"
                className="w-full"
                size="lg"
              >
                티켓 판매로 전환
              </Button>
            )}
          </div>
        </Card>
      </div>
      <ChatBot />
    </div>
  );
}