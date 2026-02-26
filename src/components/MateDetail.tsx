import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { KBO_STADIUMS, StadiumZone } from '../utils/stadiumData';
import { OptimizedImage } from './common/OptimizedImage';
import { ProfileAvatar } from './ui/ProfileAvatar';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { useMatePartyFromRoute } from '../hooks/useMatePartyFromRoute';
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
  Plus,
  User,
  RefreshCw,
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import { useAuthStore } from '../store/authStore';
import UserProfileModal from './profile/UserProfileModal';
import TeamLogo, { teamIdToName } from './TeamLogo';
import { api, getApiErrorStatus } from '../utils/api';
import { Alert, AlertDescription } from './ui/alert';
import { DEPOSIT_AMOUNT } from '../utils/constants';
import { getTeamColorByAnyKey } from '../constants/teams';
import { formatGameDate, extractHashtags, mapBackendPartyToFrontend, stripHashtags } from '../utils/mate';
import ReviewDialog from './ReviewDialog';
import type { CancelReasonType, PartyReview, Application } from '../types/mate';
import { getApiErrorMessage } from '../utils/errorUtils';
import { resolveQrRefreshDelayMs } from '../utils/qrRefresh';
import { getRefundPolicyMessage } from '../utils/paymentStatus';
import { isDirectTradeMode } from '../utils/paymentMode';

export default function MateDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirmDialog();
  const {
    party: selectedParty,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);
  const user = useAuthStore((state) => state.user);

  // Use user from auth store directly
  const currentUserId = user?.id || null;

  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConvertingToSale, setIsConvertingToSale] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [salePriceError, setSalePriceError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReasonType>('BUYER_CHANGED_MIND');
  const [cancelMemo, setCancelMemo] = useState('');
  const [qrCheckInUrl, setQrCheckInUrl] = useState('');
  const [qrSessionExpiresAt, setQrSessionExpiresAt] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrSessionError, setQrSessionError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false); // For Seat View toggle
  const [hostAvgRating, setHostAvgRating] = useState<number | null>(null);
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [reviews, setReviews] = useState<PartyReview[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ id: number; name: string } | null>(null);
  const selectedPartyId = selectedParty?.id;
  const selectedPartyStatus = selectedParty?.status;

  // 호스트 평균 평점 가져오기 (리뷰 기반)
  useEffect(() => {
    if (!selectedParty) return;
    api.getUserAverageRating(selectedParty.hostId)
      .then((rating) => setHostAvgRating(rating))
      .catch(() => setHostAvgRating(null));
  }, [selectedParty?.hostId]);

  // COMPLETED 파티의 리뷰 목록 가져오기
  useEffect(() => {
    if (!selectedParty || selectedParty.status !== 'COMPLETED') return;
    api.getPartyReviews(selectedParty.id)
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch((err: unknown) => {
        const status = getApiErrorStatus(err);
        if (status !== 403) {
          toast.error('리뷰 정보를 불러오는데 실패했습니다.');
        }
      });
  }, [selectedPartyId, selectedPartyStatus]);

  // 내 신청 정보 가져오기
  useEffect(() => {
    if (!selectedParty || !currentUserId) return;

    const fetchMyApplication = async () => {
      try {
        const myApp = await api.getMyApplicationByParty(selectedParty.id);
        setMyApplication(myApp);
      } catch (error: unknown) {
        if (getApiErrorStatus(error) === 404) {
          try {
            const applicationsData = await api.getMyApplications();
            const fallback = applicationsData.find((app: Application) =>
              String(app.partyId) === String(selectedParty.id)
            );
            setMyApplication(fallback ?? null);
            return;
          } catch (fallbackError) {
            console.error('내 신청 정보 fallback 조회 실패:', fallbackError);
          }
        }
        console.error('내 신청 정보 가져오기 실패:', error);
      }
    };

    fetchMyApplication();
  }, [selectedPartyId, currentUserId]);

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
  }, [selectedPartyId, selectedParty?.hostId, currentUserId]);

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
      ? '참여를 취소하시겠습니까?\n\n취소 사유에 따라 전액/부분 환불 정책이 적용됩니다.\n취소는 경기 하루 전까지만 가능합니다.'
      : '신청을 취소하시겠습니까?\n\n취소 사유에 따라 전액/부분 환불 정책이 적용됩니다.';

    const confirmed = await confirm({ title: isApproved ? '참여 취소' : '신청 취소', description: confirmMessage, confirmLabel: '취소하기', variant: 'destructive' });
    if (!confirmed) return;

    setSelectedCancelReason(isApproved ? 'BUYER_CHANGED_MIND' : 'OTHER');
    setCancelMemo('');
    setShowCancelDialog(true);
  };

  const executeCancelApplication = async () => {
    if (!selectedParty || !myApplication || !currentUserId) return;

    setIsCancelling(true);
    setShowCancelDialog(false);
    try {
      const result = await api.cancelApplicationWithReason(myApplication.id, {
        cancelReasonType: selectedCancelReason,
        cancelMemo: cancelMemo.trim() || undefined,
      });
      toast.success('신청이 취소되었습니다.', {
        description: getRefundPolicyMessage(
          result.refundPolicyApplied,
          result.refundAmount,
          result.feeCharged,
        ),
      });
      setMyApplication(null);
      const updatedParty = await api.getPartyById(selectedParty.id);
      setSelectedParty(mapBackendPartyToFrontend(updatedParty));
    } catch (error: unknown) {
      console.error('신청 취소 중 오류:', error);
      toast.error(getApiErrorMessage(error, '신청 취소 중 오류가 발생했습니다.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const cancelReasonOptions = [
    {
      value: 'BUYER_CHANGED_MIND' as const,
      label: '단순변심(구매자)',
      description: '부분환불(수수료 차감)',
    },
    {
      value: 'SELLER_CHANGED_MIND' as const,
      label: '단순변심(판매자)',
      description: '부분환불(수수료 차감)',
    },
    {
      value: 'OTHER' as const,
      label: '기타 사유',
      description: '전액환불',
    },
  ];

  const isHost = selectedParty?.hostId === currentUserId;
  const isApproved = myApplication?.isApproved || false;
  const canAccessCheckIn = Boolean(selectedParty) &&
    (isHost || isApproved) &&
    selectedParty?.status !== 'CHECKED_IN' &&
    selectedParty?.status !== 'COMPLETED' &&
    selectedParty?.status !== 'FAILED';

  const fallbackCheckInUrl = useMemo(() => {
    if (!id && !selectedParty?.id) {
      return typeof window === 'undefined' ? '/mate' : window.location.href;
    }
    const path = `/mate/${id ?? selectedParty?.id}/checkin`;
    if (typeof window === 'undefined') {
      return path;
    }
    return new URL(path, window.location.origin).toString();
  }, [id, selectedParty?.id]);

  const fetchQrSession = useCallback(async (isMountedRef: { current: boolean }) => {
    if (selectedPartyId === undefined) return;
    setIsQrLoading(true);
    try {
      const qrSession = await api.createCheckInQrSession({ partyId: selectedPartyId });
      if (!isMountedRef.current) return;

      setQrCheckInUrl(qrSession.checkinUrl || fallbackCheckInUrl);
      const expiresAt = qrSession.expiresAt ?? null;
      const parsedExpiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
      const isValidExpiresAt = expiresAt ? !Number.isNaN(parsedExpiresAtMs) : false;
      if (expiresAt && !isValidExpiresAt) {
        console.warn('[MateDetail] Invalid QR session expiresAt:', expiresAt);
      }
      setQrSessionExpiresAt(isValidExpiresAt ? expiresAt : null);

      const delay = resolveQrRefreshDelayMs(expiresAt, Date.now());
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          void fetchQrSession(isMountedRef);
        }
      }, delay);
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      console.error('QR 세션 발급 실패:', error);
      setQrCheckInUrl(fallbackCheckInUrl);
      setQrSessionError(getApiErrorMessage(error, 'QR 세션을 발급하지 못했습니다.'));
    } finally {
      if (isMountedRef.current) {
        setIsQrLoading(false);
      }
    }
  }, [selectedPartyId, fallbackCheckInUrl]);

  useEffect(() => {
    const isMountedRef = { current: true };

    setQrCheckInUrl(fallbackCheckInUrl);
    setQrSessionExpiresAt(null);
    setQrSessionError(null);

    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (selectedPartyId === undefined || !canAccessCheckIn) {
      setIsQrLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }

    void fetchQrSession(isMountedRef);

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [selectedPartyId, canAccessCheckIn, fallbackCheckInUrl, fetchQrSession]);

  const qrCodeValue = useMemo(() => qrCheckInUrl || fallbackCheckInUrl, [qrCheckInUrl, fallbackCheckInUrl]);



  if (isPartyLoading && !selectedParty) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-24 mb-4" />
          {/* 티켓 스켈레톤 */}
          <div className="rounded-3xl shadow-2xl overflow-hidden mb-8">
            <Skeleton className="h-64 w-full" />
            <div className="bg-white dark:bg-card p-6">
              <div className="flex gap-8 items-center justify-between">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-20 w-20 hidden md:block" />
              </div>
            </div>
          </div>
          {/* 상세 정보 스켈레톤 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 border-none shadow-md">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-4/6" />
              </Card>
              <Card className="p-6 border-none shadow-md">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-px w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="p-6 border-none shadow-md">
                <Skeleton className="h-24 w-24 rounded-full mx-auto mb-3" />
                <Skeleton className="h-5 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </Card>
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (partyError || !selectedParty) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            파티를 불러오지 못했습니다
          </h2>
          <p className="text-gray-500 dark:text-gray-300 mb-4 text-sm">
            {partyError || '파티 정보를 찾을 수 없습니다.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/mate')}>
              <ChevronLeft className="w-4 h-4 mr-1" /> 목록으로
            </Button>
            <Button className="bg-primary text-white" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-1" /> 다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const handleOpenSaleDialog = () => {
    setSalePrice('');
    setSalePriceError('');
    setShowSaleDialog(true);
  };

  const handleConfirmSale = async () => {
    const parsed = parseInt(salePrice, 10);
    if (!salePrice || isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      setSalePriceError('양의 정수를 입력해주세요.');
      return;
    }
    if (parsed < 100) {
      setSalePriceError('최소 100원 이상 입력해주세요.');
      return;
    }
    setIsConvertingToSale(true);
    try {
      const updatedParty = await api.updateParty(selectedParty.id, { status: 'SELLING', price: parsed });
      const mappedParty = mapBackendPartyToFrontend(updatedParty);
      setSelectedParty(mappedParty);
      toast.success('판매 전환이 완료되었습니다.');
      setShowSaleDialog(false);
    } catch (error: unknown) {
      console.error('판매 전환 중 오류:', error);
      toast.error(getApiErrorMessage(error, '판매 전환 중 오류가 발생했습니다.'));
    } finally {
      setIsConvertingToSale(false);
    }
  };
  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: '직관메이트 파티', text: '함께 직관 가실 분?', url: shareUrl });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('공유 링크를 복사했습니다.');
        return;
      }

      toast.error('이 브라우저에서는 공유 링크 복사를 지원하지 않습니다.');
    } catch (error) {
      console.error('공유 처리 중 오류:', error);
      toast.error('복사에 실패했습니다. 주소창의 링크를 직접 복사해주세요.');
    }
  };
  const handleApply = () => navigate(`/mate/${id}/apply`);
  const handleCheckIn = () => {
    const fallbackPath = `/mate/${id}/checkin`;
    try {
      const parsedUrl = new URL(qrCheckInUrl || fallbackPath, window.location.origin);
      navigate(`${parsedUrl.pathname}${parsedUrl.search}`);
      return;
    } catch (error) {
      console.error('체크인 URL 파싱 실패:', error);
    }

    navigate(fallbackPath);
  };
  const handleManageParty = () => navigate(`/mate/${id}/manage`);
  const handleOpenChat = () => navigate(`/mate/${id}/chat`);

  // UI Helpers
  const homeTeamColor = getTeamColorByAnyKey(selectedParty.homeTeam);
  const getSeatBadgeColor = (section: string) => {
    if (section.includes('응원')) return 'bg-red-100 text-red-700 border-red-200';
    if (section.includes('테이블')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (section.includes('블루')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // description에서 해시태그 추출 (생성 Step 4에서 추가된 스타일 태그)
  const hostTags = extractHashtags(selectedParty.description);
  // 리뷰 기반 평균 평점 우선, 없으면 hostRating 사용 (1-5 스케일)
  const mannerScore = hostAvgRating !== null && hostAvgRating !== undefined ? hostAvgRating : (selectedParty.hostRating ?? 5.0);


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
    <div className="min-h-screen bg-gray-50 dark:bg-background pb-20">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => navigate('/mate')}>
            <ChevronLeft className="w-5 h-5 mr-1" /> 목록으로
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1.5" />
            공유
          </Button>
        </div>
        {isPartyRevalidating && (
          <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* 1. 매치 포스터 (Ticket Metaphor Evolution) */}
        <div className="rounded-3xl shadow-2xl overflow-hidden mb-8 transform transition-all hover:scale-[1.01]">
          {/* Header / Banner Area with Team Color Gradient */}
          <div
            className="relative p-4 sm:p-6 text-white"
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
          <div className="bg-white dark:bg-card p-6 md:p-8 border-t-4 border-dashed border-gray-200 dark:border-border relative">
            {/* Punch Holes for Ticket realism */}
            <div className="absolute -left-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-background rounded-full"></div>
            <div className="absolute -right-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-background rounded-full"></div>

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
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl z-50 border border-white/10 animate-in fade-in slide-in-from-bottom-1">
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
                    className="min-h-11 text-xs text-gray-500 hover:text-primary"
                    onClick={() => setShowSeatViewGuide(!showSeatViewGuide)}
                  >
                    <MapIcon className="w-3 h-3 mr-1" /> {showSeatViewGuide ? '닫기' : '위치/시야 보기'}
                  </Button>
                </div>

                {/* UGC Seat View Guide Area */}
                {showSeatViewGuide && (
                  <div className="mt-4 mb-4 bg-gray-50 dark:bg-secondary/70 rounded-xl border border-dashed border-gray-300 dark:border-border p-4 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-border rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl">📷</span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      아직 등록된 시야가 없어요
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mb-3">
                      직관 후 이 좌석의 뷰를 공유해주시면<br />
                      <span className="text-primary font-bold">50 포인트</span>를 즉시 적립해 다려요!
                    </p>
                    <Button size="sm" className="bg-primary hover:bg-primary-hover text-white rounded-full min-h-11 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      첫 번째 사진 등록하기
                    </Button>
                  </div>
                )}
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
                  {selectedParty.section}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-4 text-gray-500 dark:text-gray-300">
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

              {/* QR Code - 모바일: 중앙 정렬 / 데스크톱: 우측 구분선 포함 */}
              <div className="flex flex-col items-center md:border-l md:border-gray-200 md:dark:border-border md:pl-8">
                <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <QRCode
                    value={qrCodeValue}
                    size={132}
                    style={{ width: 132, height: 132 }}
                    viewBox={`0 0 256 256`}
                    fgColor="#1a1a1a"
                    bgColor="#ffffff"
                    level="Q"
                  />
                </div>
                <p className="text-[10px] text-center text-gray-400 mt-1">ENTRY CODE</p>
                {isQrLoading && (
                  <p className="text-[10px] text-gray-400 mt-1">QR 준비 중...</p>
                )}
                {qrSessionExpiresAt && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    유효: {new Date(qrSessionExpiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {qrSessionError && (
                  <p className="text-[10px] text-red-500 mt-1 text-center">{qrSessionError}</p>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* 2. 상세 정보 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* 파티 소개 */}
            <Card className="p-6 border-none shadow-md bg-white dark:bg-card/80 backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                <MessageSquare className="w-5 h-5 text-primary" /> 파티 소개
              </h3>
              <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base mb-4">
                {stripHashtags(selectedParty.description)}
              </p>
              {hostTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hostTags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* 결제 정보 (Improved) */}
            <Card className="p-6 border-none shadow-md bg-white dark:bg-card/80">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                <Info className="w-5 h-5 text-primary" /> 비용 안내
              </h3>

              {/* Surface Color Box for Dark Mode */}
              <div className="bg-gray-50 dark:bg-secondary/70 rounded-xl p-5 border border-gray-100 dark:border-border">
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
                      <span className="text-gray-600 dark:text-gray-300">티켓 가격</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">
                        {(selectedParty.ticketPrice || 0).toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-gray-300">보증금</span>
                        <div className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                            취소 사유에 따라 전액 또는 부분 환불 정책이 적용됩니다
                          </div>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">
                        {DEPOSIT_AMOUNT.toLocaleString()}원
                      </span>
                    </div>
                    <Separator className="bg-gray-200 dark:bg-border my-2" />
                    {!isDirectTradeMode() && (
                      <div className="flex justify-between items-center text-lg mt-2">
                        <span className="font-bold text-primary dark:text-[#5abba6]">총 결제 금액</span>
                        <span className="font-black text-primary dark:text-[#5abba6]">
                          {((selectedParty.ticketPrice || 0) + DEPOSIT_AMOUNT).toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedParty.status !== 'SELLING' && !isDirectTradeMode() && (
                <p className="text-xs text-gray-400 mt-3 text-right">
                  * 단순변심 취소 시 수수료가 차감될 수 있습니다
                </p>
              )}
            </Card>

            {/* 좌석 시야 */}
            <Card className="p-6 border-none shadow-md overflow-hidden bg-white dark:bg-card/80">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> 좌석 시야
              </h3>
              <div className="aspect-video bg-gray-200 dark:bg-secondary rounded-xl flex items-center justify-center relative overflow-hidden group">
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
              className="p-6 text-center border-none shadow-md bg-white dark:bg-card/80 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setShowHostProfile(true)}
            >
              <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-700/50"></div>

              <div className="relative z-10 mb-2 flex justify-center">
                <ProfileAvatar
                  src={selectedParty.hostProfileImageUrl ?? undefined}
                  alt={selectedParty.hostName}
                  fallbackName={selectedParty.hostName}
                  width={96}
                  height={96}
                  showRing
                  ringClassName="p-1 bg-white/95 dark:bg-border shadow-lg"
                />
                {/* Manner Temperature Bar (Carrot Market Style) */}
                <div className="mt-3 mb-1">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{selectedParty.hostName}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-secondary px-3 py-1 rounded-full">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{mannerScore.toFixed(1)}</span>
                    <div className="w-16 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${(mannerScore / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Click hint */}
              <p className="text-xs text-gray-400 mt-3">클릭하여 프로필 보기</p>
            </Card>


            {/* Review Section - COMPLETED parties only */}
            {selectedParty.status === 'COMPLETED' && currentUserId && (isHost || isApproved) && (
              <Card className="p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  리뷰
                </h3>
                <div className="space-y-2">
                  {(() => {
                    // 리뷰 대상 목록 구성
                    const targets = isHost
                      ? approvedApplications.map((app) => ({
                        id: app.applicantId,
                        name: app.applicantName,
                      }))
                      : [{ id: selectedParty.hostId, name: selectedParty.hostName }];

                    if (targets.length === 0) {
                      return <p className="text-sm text-gray-400">리뷰 대상이 없습니다.</p>;
                    }

                    return targets.map((target) => {
                      const myReview = reviews.find(
                        (r) => r.reviewerId === currentUserId && r.revieweeId === target.id
                      );

                      return (
                        <div
                          key={target.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-card rounded-lg"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {target.name}
                            </span>
                            {myReview && (
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <Star
                                    key={num}
                                    className={`w-3.5 h-3.5 ${num <= myReview.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                      }`}
                                  />
                                ))}
                                {myReview.comment && (
                                  <span className="text-xs text-gray-500 ml-1 truncate max-w-[120px]">
                                    "{myReview.comment}"
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {myReview ? (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              작성 완료
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-primary text-primary hover:bg-primary/10"
                              onClick={() => setReviewTarget(target)}
                            >
                              리뷰 작성
                            </Button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            )}

            {/* Floating Action Buttons (Sticky) */}
            <div className="space-y-3 sticky top-6 z-20">
              {/* Host Actions */}
              {isHost ? (
                <>
                  <Button
                    onClick={handleManageParty}
                    className="w-full text-white shadow-xl hover:shadow-2xl transition-all h-14 text-lg font-bold bg-primary"
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    신청 관리 ({pendingApplications.length})
                  </Button>
                  {approvedApplications.length > 0 && (
                    <Button
                      onClick={handleOpenChat}
                      variant="outline"
                      className="w-full h-12 border-primary text-primary hover:bg-primary/10"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      채팅방 입장
                    </Button>
                  )}
                  {canAccessCheckIn && (
                    <Button
                      onClick={handleCheckIn}
                      variant="outline"
                      className="w-full h-12 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10"
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      체크인 페이지
                    </Button>
                  )}
                  {canConvertToSale && (
                    <Button
                      onClick={handleOpenSaleDialog}
                      disabled={isConvertingToSale}
                      variant="outline"
                      className="w-full h-12 border-orange-400 text-orange-600 hover:bg-orange-50"
                    >
                      {isConvertingToSale ? '전환 중...' : '판매 전환'}
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
                        className="w-full text-white h-14 text-lg font-bold shadow-lg bg-primary"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        채팅방 입장
                      </Button>
                      {canAccessCheckIn && (
                        <Button
                          onClick={handleCheckIn}
                          variant="outline"
                          className="w-full h-12 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10"
                        >
                          <QrCode className="w-5 h-5 mr-2" />
                          체크인 페이지
                        </Button>
                      )}

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
                          className="w-full text-white h-14 text-xl font-bold shadow-xl hover:shadow-2xl hover:bg-primary-hover transition-all bg-primary"
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
      <UserProfileModal
        userId={selectedParty?.hostId ?? null}
        isOpen={showHostProfile}
        onClose={() => setShowHostProfile(false)}
      />
      {reviewTarget && currentUserId && (
        <ReviewDialog
          isOpen={reviewTarget !== null}
          onClose={() => setReviewTarget(null)}
          partyId={selectedParty.id}
          reviewerId={currentUserId}
          reviewee={reviewTarget}
          onSuccess={() => {
            api.getPartyReviews(selectedParty.id)
              .then((data) => setReviews(Array.isArray(data) ? data : []))
              .catch((err) => console.error('리뷰 목록 갱신 실패:', err));
          }}
        />
      )}

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>취소 사유 선택</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">취소 사유를 선택하면 환불 규칙이 자동 적용됩니다.</p>
            <div className="space-y-2">
              {cancelReasonOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedCancelReason(option.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-left transition ${selectedCancelReason === option.value
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-gray-200'
                    }`}
                  disabled={isCancelling}
                >
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                추가 메모 (선택)
              </label>
              <Input
                value={cancelMemo}
                onChange={(e) => setCancelMemo(e.target.value)}
                placeholder="선택 사유를 더 자세히 입력하세요."
                disabled={isCancelling}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isCancelling}
              onClick={() => setShowCancelDialog(false)}
            >
              뒤로가기
            </Button>
            <Button
              disabled={isCancelling}
              className="bg-primary text-white"
              onClick={executeCancelApplication}
            >
              {isCancelling ? '취소 처리 중...' : '취소하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 판매 전환 Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>티켓 판매 전환</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              판매 가격 (원)
            </label>
            <Input
              type="number"
              min={100}
              step={1}
              placeholder="예: 15000"
              value={salePrice}
              onChange={(e) => {
                setSalePrice(e.target.value);
                setSalePriceError('');
              }}
              className="mt-1"
            />
            {salePriceError && (
              <p className="text-sm text-red-500 mt-1">{salePriceError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isConvertingToSale}
              onClick={() => setShowSaleDialog(false)}
            >
              취소
            </Button>
            <Button
              disabled={isConvertingToSale}
              className="bg-primary text-white"
              onClick={handleConfirmSale}
            >
              {isConvertingToSale ? '전환 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
