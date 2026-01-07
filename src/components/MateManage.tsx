import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import ChatBot from './ChatBot';
import { api } from '../utils/api';
import { Application } from '../types/mate';

export default function MateManage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedParty } = useMateStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await api.getCurrentUser();
        const userId = await api.getUserIdByEmail(userData.data.email);
        setCurrentUserId(userId.data || userId);
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // 신청 목록 불러오기
  useEffect(() => {
    if (!selectedParty) return;

    const fetchApplications = async () => {
      setIsLoading(true);
      try {
        const data = await api.getApplicationsByParty(selectedParty.id);
        setApplications(data);
      } catch (error) {
        console.error('신청 목록 불러오기 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [selectedParty]);

  if (!selectedParty) {
    return null;
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertDescription>사용자 정보를 불러오는 중...</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isHost = String(selectedParty.hostId) === String(currentUserId);

  if (!isHost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert>
            <AlertDescription>호스트만 접근할 수 있는 페이지입니다.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(`/mate/${id}`)} className="mt-4">
            뒤로 가기
          </Button>
        </div>
      </div>
    );
  }

  // 신청 승인
  const handleApprove = async (applicationId: string) => {
    try {
      await api.approveApplication(applicationId);
      alert('신청이 승인되었습니다!');
      
      // 신청 목록 다시 불러오기
      const data = await api.getApplicationsByParty(selectedParty.id);
      setApplications(data);
    } catch (error) {
      console.error('신청 승인 중 오류:', error);
      alert('신청 승인에 실패했습니다.');
    }
  };

  // 신청 거절
  const handleReject = async (applicationId: string) => {
    try {
      await api.rejectApplication(applicationId);
      alert('신청이 거절되었습니다.');
      
      // 신청 목록 다시 불러오기
      const data = await api.getApplicationsByParty(selectedParty.id);
      setApplications(data);
    } catch (error) {
      console.error('신청 거절 중 오류:', error);
      alert('신청 거절에 실패했습니다.');
    }
  };

  // 파티 삭제 핸들러
  const handleDeleteParty = async () => {
    if (!selectedParty || !currentUserId) return;

    // 승인된 신청자 확인
    const approvedCount = applications.filter(app => app.isApproved).length;
    
    if (approvedCount > 0) {
      alert(
        '승인된 참여자가 있어 파티를 삭제할 수 없습니다.\n' +
        '참여자가 취소하거나 거절 후 삭제해주세요.'
      );
      return;
    }

    const pendingCount = applications.filter(
      app => !app.isApproved && !app.isRejected
    ).length;

    let confirmMessage = '파티를 삭제하시겠습니까?\n\n';
    
    if (pendingCount > 0) {
      confirmMessage += `⚠️ 대기 중인 신청 ${pendingCount}건도 함께 삭제됩니다.`;
    } else {
      confirmMessage += '이 작업은 되돌릴 수 없습니다.';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.deleteParty(selectedParty.id, currentUserId);
      alert('파티가 삭제되었습니다.');
      navigate('/mate');
    } catch (error: any) {
      console.error('파티 삭제 중 오류:', error);
      const errorMessage = error.message || '파티 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleOpenChat = () => {
    navigate(`/mate/${id}/chat`);
  };

  const getBadgeIcon = (badge: string) => {
    if (badge === 'verified' || badge === 'VERIFIED') return <Shield className="w-4 h-4 text-blue-500" />;
    if (badge === 'trusted' || badge === 'TRUSTED') return <Star className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  const renderApplication = (app: Application, showActions: boolean = false) => (
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
        <span>결제 금액:</span>
        <span style={{ color: '#2d5f4f' }}>{app.depositAmount.toLocaleString()}원</span>
        <Badge variant="outline" className="ml-2">
          {app.paymentType === 'DEPOSIT' ? '보증금' : '전액결제'}
        </Badge>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
            <p className="text-gray-600">신청 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => !app.isApproved && !app.isRejected);
  const approvedApplications = applications.filter(app => app.isApproved);
  const rejectedApplications = applications.filter(app => app.isRejected);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
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

          <div className="flex gap-2 mt-4">
            {approvedApplications.length > 0 && (
              <Button
                onClick={handleOpenChat}
                className="flex-1 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                채팅방 입장
              </Button>
            )}
            
            {/* 삭제 버튼 */}
            <Button
              onClick={handleDeleteParty}
              disabled={isDeleting}
              variant="outline"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              {isDeleting ? '삭제 중...' : '파티 삭제'}
            </Button>
          </div>
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

      <ChatBot />
    </div>
  );
}