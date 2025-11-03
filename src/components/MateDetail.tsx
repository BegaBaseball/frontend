import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
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
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateDetail() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const selectedParty = useMateStore((state) => state.selectedParty);
  const updateParty = useMateStore((state) => state.updateParty);
  const currentUserId = useMateStore((state) => state.currentUserId);
  const getPartyApplications = useMateStore((state) => state.getPartyApplications);
  const myApplications = useMateStore((state) => state.myApplications);

  if (!selectedParty) {
    return null;
  }

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
    setCurrentView('mateApply');
  };

  const handleConvertToSale = () => {
    const price = prompt('판매 가격을 입력해주세요 (원):');
    if (price && !isNaN(Number(price))) {
      updateParty(selectedParty.id, { status: 'SELLING', price: Number(price) });
    }
  };

  const handleCheckIn = () => {
    setCurrentView('mateCheckIn');
  };

  const handleManageParty = () => {
    setCurrentView('mateManage');
  };

  const handleOpenChat = () => {
    setCurrentView('mateChat');
  };

  const isHost = selectedParty.hostId === currentUserId;
  const myApplication = myApplications.find(app => app.partyId === selectedParty.id);
  const isApproved = myApplication?.isApproved || false;
  const applications = getPartyApplications(selectedParty.id);
  const approvedApplications = applications.filter(app => app.isApproved);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="mate" />

      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('mate')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          목록으로
        </Button>

        <Card className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <TeamLogo teamId={selectedParty.teamId} size="lg" />
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

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TeamLogo teamId={selectedParty.homeTeam} size="md" />
                <span>홈</span>
              </div>
              <span className="text-xl">vs</span>
              <div className="flex items-center gap-3">
                <TeamLogo teamId={selectedParty.awayTeam} size="md" />
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
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
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

          {/* Price (if selling) */}
          {selectedParty.price && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-orange-700">티켓 판매가</span>
                <span className="text-orange-900">
                  {selectedParty.price.toLocaleString()}원
                </span>
              </div>
            </div>
          )}

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
                  신청 관리 ({applications.filter(app => !app.isApproved && !app.isRejected).length})
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
                {isApproved && (
                  <Button
                    onClick={handleOpenChat}
                    className="w-full text-white"
                    size="lg"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    채팅하기
                  </Button>
                )}

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

                {myApplication && !myApplication.isApproved && !myApplication.isRejected && (
                  <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertDescription>
                      신청이 완료되었습니다. 호스트의 승인을 기다려주세요.
                    </AlertDescription>
                  </Alert>
                )}

                {myApplication && myApplication.isRejected && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      신청이 거절되었습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

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
    </div>
  );
}
