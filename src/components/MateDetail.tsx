import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KBO_STADIUMS, StadiumZone } from '../utils/stadiumData';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
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
  QrCode,
  Info,
  Map as MapIcon,
  HelpCircle,
  Plus
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import ChatBot from './ChatBot';
import TeamLogo, { teamIdToName } from './TeamLogo';
import { api } from '../utils/api';
import { Alert, AlertDescription } from './ui/alert';
import { DEPOSIT_AMOUNT, TEAM_COLORS_MAP } from '../utils/constants';
import { formatGameDate, extractHashtags } from '../utils/mate';

export default function MateDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // Correctly access state from the store
  const selectedParty = useMateStore((state) => state.selectedParty);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);
  const updateParty = useMateStore((state) => state.updateParty);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false); // For Seat View toggle
  const [hostAvgRating, setHostAvgRating] = useState<number | null>(null);

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
        const userId = await api.getUserIdByEmail(userData.data.email);
        setCurrentUserId(userId.data || userId);
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // 호스트 평균 평점 가져오기 (리뷰 기반)
  useEffect(() => {
    if (!selectedParty) return;
    api.getUserAverageRating(selectedParty.hostId)
      .then((rating) => setHostAvgRating(rating))
      .catch(() => setHostAvgRating(null));
  }, [selectedParty?.hostId]);

  // 내 신청 정보 가져오기
  useEffect(() => {
    if (!selectedParty || !currentUserId) return;

    const fetchMyApplication = async () => {
      try {
        const applicationsData = await api.getApplicationsByApplicant(currentUserId);
        const myApp = applicationsData.find((app: any) =>
          app.partyId === selectedParty.id
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

    const isHost = selectedParty.hostId === currentUserId;
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
    return daysDiff < 1;
  };

  const canCancel = () => {
    if (!selectedParty) return false;
    if (!myApplication) return false;
    if (myApplication.isRejected) return false;
    if (selectedParty.status === 'CHECKED_IN' || selectedParty.status === 'COMPLETED') return false;
    if (!myApplication.isApproved) return true;
    return !isGameTomorrow();
  };

  const handleCancelApplication = async () => {
    if (!selectedParty || !myApplication || !currentUserId) return;
    const isApproved = myApplication.isApproved;
    // ... logic ...
    const confirmMessage = isApproved
      ? '참여를 취소하시겠습니까?\n\n⚠️ 승인 후 취소 시:\n- 보증금 10,000원은 환불되지 않습니다\n- 티켓 가격만 환불됩니다\n- 취소는 경기 하루 전까지만 가능합니다'
      : '신청을 취소하시겠습니까?\n\n전액 환불됩니다.';

    if (!window.confirm(confirmMessage)) return;

    setIsCancelling(true);
    try {
      await api.cancelApplication(myApplication.id, currentUserId);
      if (isApproved) {
        alert('참여가 취소되었습니다.\n티켓 가격만 환불되며, 보증금은 환불되지 않습니다.');
      } else {
        alert('신청이 취소되었습니다.\n결제 금액이 전액 환불됩니다.');
      }
      setMyApplication(null);
      const updatedParty = await api.getPartyById(selectedParty.id);
      setSelectedParty(updatedParty);
    } catch (error: any) {
      console.error('신청 취소 중 오류:', error);
      alert(error.response?.data?.message || '신청 취소 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f]"></div>
      </div>
    );
  }

  if (!selectedParty) return null;

  const isHost = selectedParty.hostId === currentUserId;
  const isApproved = myApplication?.isApproved || false;
  const approvedApplications = applications.filter(app => app.isApproved);
  const pendingApplications = applications.filter(app => !app.isApproved && !app.isRejected);

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: '모집 중', color: '#dcfce7', textColor: '#166534', tooltip: '모집 중 - 참여 신청 가능' },
      MATCHED: { label: '매칭 성공', color: '#f3f4f6', textColor: '#374151', tooltip: '매칭 완료 - 모든 자리가 찼습니다' },
      FAILED: { label: '매칭 실패', color: '#fee2e2', textColor: '#991b1b', tooltip: '매칭 실패 - 모집 기간이 종료되었습니다' },
      SELLING: { label: '티켓 판매', color: '#ffedd5', textColor: '#9a3412', tooltip: '티켓 판매 중 - 호스트가 티켓을 판매합니다' },
      SOLD: { label: '판매 완료', color: '#f3f4f6', textColor: '#6b7280', tooltip: '판매 완료' },
      CHECKED_IN: { label: '체크인 완료', color: '#ede9fe', textColor: '#5b21b6', tooltip: '체크인 완료 - 참여자 전원 도착' },
      COMPLETED: { label: '관람 완료', color: '#f3f4f6', textColor: '#4b5563', tooltip: '관람 완료' },
    }[status] || { label: '모집 중', color: '#dcfce7', textColor: '#166534', tooltip: '모집 중 - 참여 신청 가능' };
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge style={{ backgroundColor: config.color, color: config.textColor }} className="cursor-help">
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const isGameSoon = () => {
    const gameDate = new Date(selectedParty.gameDate);
    const now = new Date();
    const hours = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hours < 24 && hours > 0;
  };

  const canConvertToSale = (selectedParty.status === 'PENDING' || selectedParty.status === 'FAILED') && isGameSoon();
  const handleConvertToSale = () => {
    const price = prompt('판매 가격을 입력해주세요 (원):');
    if (price && !isNaN(Number(price))) updateParty(selectedParty.id, { status: 'SELLING', price: Number(price) });
  };
  const handleShare = () => {
    if (navigator.share) navigator.share({ title: '직관메이트 파티', text: '함께 직관 가실 분?', url: window.location.href });
    else alert('공유 링크 복사 완료');
  };
  const handleApply = () => navigate(`/mate/${id}/apply`);
  const handleCheckIn = () => navigate(`/mate/${id}/checkin`);
  const handleManageParty = () => navigate(`/mate/${id}/manage`);
  const handleOpenChat = () => navigate(`/mate/${id}/chat`);

  // UI Helpers
  const homeTeamColor = TEAM_COLORS_MAP[selectedParty.homeTeam.toLowerCase()] || '#2d5f4f';
  const getSeatBadgeColor = (section: string) => {
    if (section.includes('응원')) return 'bg-red-100 text-red-700 border-red-200';
    if (section.includes('테이블')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (section.includes('블루')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // description에서 해시태그 추출 (생성 Step 4에서 추가된 스타일 태그)
  const hostTags = extractHashtags(selectedParty.description);
  // 리뷰 기반 평균 평점 우선, 없으면 hostRating 사용 (1-5 스케일)
  const mannerScore = hostAvgRating && hostAvgRating > 0 ? hostAvgRating : (selectedParty.hostRating ?? 5.0);


  // Helper: Find matching zone in stadium data
  const resolveSeatZone = (stadiumName: string, sectionName: string): StadiumZone | null => {
    // 1. Find Stadium
    const stadium = Object.values(KBO_STADIUMS).find(s => stadiumName.includes(s.name) || s.name.includes(stadiumName));
    if (!stadium) return null;

    // 2. Find Zone by keywords
    return stadium.zones.find(z =>
      z.keywords.some(k => sectionName.includes(k)) ||
      sectionName.includes(z.name)
    ) || null;
  };

  const currentZone = selectedParty ? resolveSeatZone(selectedParty.stadium, selectedParty.section) : null;


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
        <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent" onClick={() => navigate('/mate')}>
          <ChevronLeft className="w-5 h-5 mr-1" /> 목록으로
        </Button>

        {/* 1. 매치 포스터 (Ticket Metaphor Evolution) */}
        <div className="rounded-3xl shadow-2xl overflow-hidden mb-8 transform transition-all hover:scale-[1.01]">
          {/* Header / Banner Area with Team Color Gradient */}
          <div
            className="relative p-8 text-white"
            style={{
              background: `linear-gradient(135deg, ${homeTeamColor} 0%, ${homeTeamColor}dd 60%, #1a1a1a 100%)`
            }}
          >
            {/* Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

            {/* Date & Place Badge (Scoreboard Style) */}
            <div className="relative z-10 flex justify-center mb-8">
              <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 shadow-lg">
                <span className="font-mono font-bold tracking-wider">
                  {formatGameDate(selectedParty.gameDate)}
                </span>
                <div className="w-px h-3 bg-white/40"></div>
                <span className="font-mono font-bold">
                  {selectedParty.gameTime.substring(0, 5)}
                </span>
                <div className="w-px h-3 bg-white/40"></div>
                <span className="font-bold flex items-center gap-1">
                  {selectedParty.stadium}
                </span>
              </div>
            </div>

            {/* Main Matchup */}
            <div className="relative z-10 flex justify-between items-center max-w-lg mx-auto">
              <div className="flex flex-col items-center gap-3 transform hover:scale-105 transition-transform">
                <div className="bg-white p-3 rounded-full shadow-lg">
                  <TeamLogo teamId={selectedParty.homeTeam} size={80} />
                </div>
                <span className="font-black text-2xl tracking-tight shadow-black drop-shadow-md">
                  {teamIdToName[selectedParty.homeTeam.toLowerCase()] || selectedParty.homeTeam}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-4xl font-black italic text-white/90 drop-shadow-xl" style={{ fontFamily: 'Georgia, serif' }}>VS</span>
              </div>

              <div className="flex flex-col items-center gap-3 transform hover:scale-105 transition-transform">
                <div className="bg-white p-3 rounded-full shadow-lg">
                  <TeamLogo teamId={selectedParty.awayTeam} size={80} />
                </div>
                <span className="font-black text-2xl tracking-tight shadow-black drop-shadow-md">
                  {teamIdToName[selectedParty.awayTeam.toLowerCase()] || selectedParty.awayTeam}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 border-t-4 border-dashed border-gray-200 dark:border-gray-700 relative">
            {/* Punch Holes for Ticket realism */}
            <div className="absolute -left-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-gray-900 rounded-full"></div>
            <div className="absolute -right-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-gray-900 rounded-full"></div>

            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              {/* Seat Info with Visualization */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  {currentZone ? (
                    <div className="group relative">
                      <Badge
                        className="border-none text-white px-3 py-1 text-sm shadow-sm"
                        style={{ backgroundColor: currentZone.color || '#4b5563' }} // Default gray if no color
                      >
                        {currentZone.name}
                      </Badge>
                      {/* Tooltip for Price & Desc */}
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-1 ring-1 ring-white/10">
                        <p className="font-bold text-sm mb-1">{currentZone.description}</p>
                        {currentZone.price && (
                          <div className="text-gray-300 space-y-0.5">
                            <div className="flex justify-between"><span>주중</span> <span>{currentZone.price.weekday}</span></div>
                            <div className="flex justify-between"><span>주말</span> <span className="text-[#ff6f0f]">{currentZone.price.weekend}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className={`${getSeatBadgeColor(selectedParty.section)}`}>
                      {selectedParty.section.split(' ')[0]}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-gray-500 hover:text-[#2d5f4f]"
                    onClick={() => setShowSeatViewGuide(!showSeatViewGuide)}
                  >
                    <MapIcon className="w-3 h-3 mr-1" /> {showSeatViewGuide ? '닫기' : '위치/시야 보기'}
                  </Button>
                </div>

                {/* UGC Seat View Guide Area */}
                {showSeatViewGuide && (
                  <div className="mt-4 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl">📷</span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      아직 등록된 시야가 없어요
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      직관 후 이 좌석의 뷰를 공유해주시면<br />
                      <span className="text-[#2d5f4f] font-bold">50 포인트</span>를 즉시 적립해 다려요!
                    </p>
                    <Button size="sm" className="bg-[#2d5f4f] hover:bg-[#234b3e] text-white rounded-full h-8 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      첫 번째 사진 등록하기
                    </Button>
                  </div>
                )}
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
                  {selectedParty.section}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-4 text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{selectedParty.currentParticipants}/{selectedParty.maxParticipants}명</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">티켓 인증됨</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="hidden md:block border-l border-gray-200 dark:border-gray-700 pl-8">
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <QrCode className="w-20 h-20 text-gray-800" />
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-1">ENTRY CODE</p>
              </div>
            </div>
          </div>
        </div>


        {/* 2. 상세 정보 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* 파티 소개 */}
            <Card className="p-6 border-none shadow-md bg-white dark:bg-gray-800/80 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                <MessageSquare className="w-5 h-5 text-[#2d5f4f]" /> 파티 소개
              </h3>
              <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                {selectedParty.description}
              </p>
            </Card>

            {/* 결제 정보 (Improved) */}
            <Card className="p-6 border-none shadow-md bg-white dark:bg-gray-800/80">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                <Info className="w-5 h-5 text-[#2d5f4f]" /> 비용 안내
              </h3>

              {/* Surface Color Box for Dark Mode */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-100 dark:border-gray-600">
                {selectedParty.status === 'SELLING' ? (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 dark:text-gray-300">티켓 판매가</span>
                    <span className="text-xl font-bold text-orange-600">
                      {selectedParty.price?.toLocaleString()}원
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">티켓 가격</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">
                        {(selectedParty.ticketPrice || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-gray-400">보증금</span>
                        <div className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                            경기 당일 체크인 시 100% 환급됩니다 (노쇼 방지)
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">
                        {DEPOSIT_AMOUNT.toLocaleString()}원
                      </span>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-gray-600 my-2" />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold text-[#2d5f4f] dark:text-[#5abba6]">총 결제 금액</span>
                      <span className="font-black text-[#2d5f4f] dark:text-[#5abba6]">
                        {((selectedParty.ticketPrice || 0) + DEPOSIT_AMOUNT).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {selectedParty.status !== 'SELLING' && (
                <p className="text-xs text-gray-400 mt-3 text-right">
                  * 결제 수수료 별도
                </p>
              )}
            </Card>

            {/* 좌석 시야 */}
            <Card className="p-6 border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/80">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2d5f4f]" /> 좌석 시야
              </h3>
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button variant="secondary" className="bg-white/90 text-gray-800 hover:bg-white shadow-lg backdrop-blur-sm">
                    {selectedParty.stadium} {selectedParty.section} 시야 보기
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar: Host Info & Actions */}
          <div className="space-y-4">
            {/* Host Profile Card */}
            <Card
              className="p-6 text-center border-none shadow-md bg-white dark:bg-gray-800/80 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/mypage/${selectedParty.hostId}`)}
            >
              <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-700/50"></div>

              <div className="relative relative-z-10 mb-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg mx-auto bg-white">
                  <OptimizedImage
                    src={selectedParty.hostProfileImageUrl || ''}
                    alt={selectedParty.hostName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Manner Temperature Bar (Carrot Market Style) */}
                <div className="mt-3 mb-1">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{selectedParty.hostName}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{mannerScore.toFixed(1)}</span>
                    <div className="w-16 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${(mannerScore / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {hostTags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Click hint */}
              <p className="text-xs text-gray-400 mt-3">클릭하여 프로필 보기</p>
            </Card>


            {/* Floating Action Buttons (Sticky) */}
            <div className="space-y-3 sticky top-6 z-20">
              {/* Host Actions */}
              {isHost ? (
                <>
                  <Button
                    onClick={handleManageParty}
                    className="w-full text-white shadow-xl hover:shadow-2xl transition-all h-14 text-lg font-bold"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    신청 관리 ({pendingApplications.length})
                  </Button>
                  {approvedApplications.length > 0 && (
                    <Button
                      onClick={handleOpenChat}
                      variant="outline"
                      className="w-full h-12 border-[#2d5f4f] text-[#2d5f4f] hover:bg-[#2d5f4f]/10"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      채팅방 입장
                    </Button>
                  )}
                </>
              ) : (
                /* Participant Actions */
                <>
                  {isApproved ? (
                    <>
                      <Button
                        onClick={handleOpenChat}
                        className="w-full text-white h-14 text-lg font-bold shadow-lg"
                        style={{ backgroundColor: '#2d5f4f' }}
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        채팅방 입장
                      </Button>

                      {canCancel() && (
                        <Button
                          onClick={handleCancelApplication}
                          disabled={isCancelling}
                          variant="outline"
                          className="w-full text-red-500 border-red-200 hover:bg-red-50 h-10"
                        >
                          {isCancelling ? '취소 중...' : '참여 취소'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Pending & Not Applied */}
                      {selectedParty.status === 'PENDING' && !myApplication && (
                        <Button
                          onClick={handleApply}
                          className="w-full text-white h-14 text-xl font-bold shadow-xl hover:shadow-2xl hover:bg-[#234b3e] transition-all"
                          style={{ backgroundColor: '#2d5f4f' }}
                        >
                          참여하기
                        </Button>
                      )}

                      {/* Applied & Pending Approval */}
                      {myApplication && !myApplication.isApproved && !myApplication.isRejected && (
                        <div className="flex flex-col gap-2">
                          <Button
                            disabled
                            className="w-full bg-gray-300 text-gray-500 h-14 text-lg cursor-not-allowed"
                          >
                            승인 대기 중...
                          </Button>
                          <Button
                            onClick={handleCancelApplication}
                            disabled={isCancelling}
                            variant="ghost"
                            className="w-full text-red-500 hover:bg-red-50 text-sm"
                          >
                            신청 취소
                          </Button>
                        </div>
                      )}

                      {/* Rejected */}
                      {myApplication && myApplication.isRejected && (
                        <Alert className="border-red-200 bg-red-50 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-red-800 font-medium">
                            신청이 거절되었습니다.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ChatBot />
    </div>
  );
}