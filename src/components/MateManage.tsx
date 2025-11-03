import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
  ChevronLeft,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  Shield,
  Calendar,
  MapPin,
} from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateManage() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedParty, getPartyApplications, approveApplication, rejectApplication, currentUserId } = useMateStore();

  if (!selectedParty) {
    return null;
  }

  const isHost = selectedParty.hostId === currentUserId;

  if (!isHost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar currentPage="mate" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertDescription>호스트만 접근할 수 있는 페이지입니다.</AlertDescription>
          </Alert>
          <Button onClick={() => setCurrentView('mateDetail')} className="mt-4">
            뒤로 가기
          </Button>
        </div>
      </div>
    );
  }

  const applications = getPartyApplications(selectedParty.id);
  const pendingApplications = applications.filter(app => !app.isApproved && !app.isRejected);
  const approvedApplications = applications.filter(app => app.isApproved);
  const rejectedApplications = applications.filter(app => app.isRejected);

  const handleApprove = (applicationId: string) => {
    approveApplication(applicationId, selectedParty.id);
  };

  const handleReject = (applicationId: string) => {
    rejectApplication(applicationId);
  };

  const handleOpenChat = () => {
    setCurrentView('mateChat');
  };

  const getBadgeIcon = (badge: string) => {
    if (badge === 'verified') return <Shield className="w-4 h-4 text-blue-500" />;
    if (badge === 'trusted') return <Star className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  const renderApplication = (app: any, showActions: boolean = false) => (
    <Card key={app.id} className="p-5 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span>{app.applicantName}</span>
            {getBadgeIcon(app.applicantBadge)}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{app.applicantRating}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {new Date(app.createdAt).toLocaleString('ko-KR')}
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">{app.message}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <span>보증금:</span>
        <span style={{ color: '#2d5f4f' }}>{app.depositAmount.toLocaleString()}원</span>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button
            onClick={() => handleApprove(app.id)}
            className="flex-1 text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            승인
          </Button>
          <Button
            onClick={() => handleReject(app.id)}
            variant="outline"
            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            거절
          </Button>
        </div>
      )}
    </Card>
  );

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
          onClick={() => setCurrentView('mateDetail')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <h1 style={{ color: '#2d5f4f' }} className="mb-2">
          파티 관리
        </h1>
        <p className="text-gray-600 mb-8">신청 목록을 확인하고 승인/거절하세요</p>

        {/* Party Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <TeamLogo teamId={selectedParty.teamId} size="md" />
            <div className="flex-1">
              <h3 className="mb-1" style={{ color: '#2d5f4f' }}>
                {selectedParty.stadium}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {selectedParty.gameDate}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {selectedParty.section}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedParty.currentParticipants}/{selectedParty.maxParticipants}명
                </div>
              </div>
            </div>
          </div>

          {approvedApplications.length > 0 && (
            <Button
              onClick={handleOpenChat}
              className="w-full text-white mt-4"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              채팅방 입장
            </Button>
          )}
        </Card>

        {/* Applications Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pending">
              대기 중 ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              승인됨 ({approvedApplications.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              거절됨 ({rejectedApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApplications.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">대기 중인 신청이 없습니다</p>
              </div>
            ) : (
              pendingApplications.map(app => renderApplication(app, true))
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedApplications.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">승인된 신청이 없습니다</p>
              </div>
            ) : (
              <>
                <Alert className="mb-4">
                  <MessageSquare className="w-4 h-4" />
                  <AlertDescription>
                    승인된 참여자와 채팅방에서 소통할 수 있습니다
                  </AlertDescription>
                </Alert>
                {approvedApplications.map(app => renderApplication(app, false))}
              </>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedApplications.length === 0 ? (
              <div className="text-center py-16">
                <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">거절된 신청이 없습니다</p>
              </div>
            ) : (
              rejectedApplications.map(app => renderApplication(app, false))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
