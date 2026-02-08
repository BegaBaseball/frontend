import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
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
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import ChatBot from './ChatBot';
import { api } from '../utils/api';
import { Application } from '../types/mate';
import { formatGameDate } from '../utils/mate';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Pencil } from 'lucide-react';

export default function MateManage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirmDialog();
  const { selectedParty } = useMateStore();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    section: '',
    maxParticipants: 2,
    ticketPrice: 0,
    description: '',
  });

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await api.getCurrentUser();
        const userIdResponse = await api.getUserIdByEmail(userData.data.email);
        setCurrentUserId(userIdResponse.data);
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
      setFetchError(false);
      try {
        const data = await api.getApplicationsByParty(selectedParty.id);
        setApplications(data);
      } catch (error) {
        console.error('신청 목록 불러오기 오류:', error);
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [selectedParty, retryCount]);

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

  const isHost = selectedParty.hostId === currentUserId;

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
  const handleApprove = async (applicationId: string | number) => {
    try {
      await api.approveApplication(applicationId);
      toast.success('신청이 승인되었습니다!');

      // 신청 목록 다시 불러오기
      const data = await api.getApplicationsByParty(selectedParty.id);
      setApplications(data);
    } catch (error) {
      console.error('신청 승인 중 오류:', error);
      toast.error('신청 승인에 실패했습니다.');
    }
  };

  // 신청 거절
  const handleReject = async (applicationId: string | number) => {
    try {
      await api.rejectApplication(applicationId);
      toast.success('신청이 거절되었습니다.');

      // 신청 목록 다시 불러오기
      const data = await api.getApplicationsByParty(selectedParty.id);
      setApplications(data);
    } catch (error) {
      console.error('신청 거절 중 오류:', error);
      toast.error('신청 거절에 실패했습니다.');
    }
  };

  // 파티 삭제 핸들러
  const handleDeleteParty = async () => {
    if (!selectedParty || !currentUserId) return;

    // 승인된 신청자 확인
    const approvedCount = applications.filter(app => app.isApproved).length;

    if (approvedCount > 0) {
      toast.warning('승인된 참여자가 있어 파티를 삭제할 수 없습니다.', { description: '참여자가 취소하거나 거절 후 삭제해주세요.' });
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

    const confirmed = await confirm({ title: '파티 삭제', description: confirmMessage, confirmLabel: '삭제', variant: 'destructive' });
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await api.deleteParty(selectedParty.id, currentUserId);
      toast.success('파티가 삭제되었습니다.');
      navigate('/mate');
    } catch (error: any) {
      console.error('파티 삭제 중 오류:', error);
      const errorMessage = error.message || '파티 삭제에 실패했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleOpenChat = () => {
    navigate(`/mate/${id}/chat`);
  };

  const canEdit = selectedParty.status === 'PENDING' && !applications.some(app => app.isApproved);

  const handleStartEdit = () => {
    setEditForm({
      section: selectedParty.section,
      maxParticipants: selectedParty.maxParticipants,
      ticketPrice: selectedParty.ticketPrice || 0,
      description: selectedParty.description,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateParty(selectedParty.id, editForm);
      // 로컬 상태 업데이트
      useMateStore.getState().updateParty(selectedParty.id, editForm);
      toast.success('파티 정보가 수정되었습니다.');
      setIsEditing(false);
    } catch (error: any) {
      console.error('파티 수정 중 오류:', error);
      toast.error(error.response?.data?.message || '파티 수정에 실패했습니다.');
    }
  };

  const getDeadlineText = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    if (diffMs <= 0) return '기한 만료';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
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
        <>
          {app.responseDeadline && (
            <div className="flex items-center gap-1.5 text-xs mb-3 px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                응답 기한: {getDeadlineText(app.responseDeadline)}
              </span>
            </div>
          )}
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
        </>
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

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-red-200">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-gray-600 font-medium">신청 목록을 불러오지 못했습니다</p>
            <p className="text-gray-400 text-sm mt-1">네트워크 연결을 확인하고 다시 시도해주세요</p>
            <Button variant="outline" className="mt-4" onClick={() => setRetryCount((c) => c + 1)}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> 다시 시도
            </Button>
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
          {isEditing ? (
            <div className="space-y-4">
              <h3 className="mb-2" style={{ color: '#2d5f4f' }}>파티 정보 수정</h3>
              <div className="space-y-2">
                <Label>좌석</Label>
                <Input
                  value={editForm.section}
                  onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>모집 인원</Label>
                  <select
                    value={editForm.maxParticipants}
                    onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value={2}>2명</option>
                    <option value={3}>3명</option>
                    <option value={4}>4명</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>티켓 가격 (원)</Label>
                  <Input
                    type="number"
                    value={editForm.ticketPrice}
                    onChange={(e) => setEditForm({ ...editForm, ticketPrice: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>소개글</Label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1 text-white" style={{ backgroundColor: '#2d5f4f' }}>
                  저장
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <TeamLogo teamId={selectedParty.teamId} size="md" />
                <div className="flex-1">
                  <h3 className="mb-1" style={{ color: '#2d5f4f' }}>
                    {selectedParty.stadium}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatGameDate(selectedParty.gameDate)}
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
                {canEdit && (
                  <Button
                    onClick={handleStartEdit}
                    variant="outline"
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    정보 수정
                  </Button>
                )}
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
                <Button
                  onClick={handleDeleteParty}
                  disabled={isDeleting}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                >
                  {isDeleting ? '삭제 중...' : '파티 삭제'}
                </Button>
              </div>
            </>
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

      <ChatBot />
    </div>
  );
}