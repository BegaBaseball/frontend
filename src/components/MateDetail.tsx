import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SeatViewGallery from './SeatViewGallery';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { KBO_STADIUMS, StadiumZone } from '../utils/stadiumData';
import { OptimizedImage } from './common/OptimizedImage';
import { ProfileAvatar } from './ui/ProfileAvatar';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import AdSlot from './ads/AdSlot';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from './ui/tooltip';
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
  Plus,
  User,
  RefreshCw,
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import { useAuthProfileSnapshot } from '../store/authStore';
import UserProfileModal from './profile/UserProfileModal';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { api, getApiErrorStatus } from '../utils/api';
import { Alert, AlertDescription } from './ui/alert';
import { getTeamColorByAnyKey } from '../constants/teams';
import {
  extractHashtags,
  formatHostAverageRating,
  formatGameDate,
  getHostAverageRating,
  hasSameMateUserIdentity,
  isPartyHostedByUser,
  mapBackendPartyToFrontend,
  stripHashtags,
} from '../utils/mate';
import ReviewDialog from './ReviewDialog';
import type { CancelReasonType, Application } from '../types/mate';
import { getApiErrorMessage } from '../utils/errorUtils';
import { QR_REFRESH_LEAD_MS, resolveQrRefreshDelayMs } from '../utils/qrRefresh';
import { getRefundPolicyMessage } from '../utils/paymentStatus';
import { mateMobileBarClass } from '../utils/mateFlowUi';

export default function MateDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirmDialog();
  const {
    party: selectedParty,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
    statusCode: partyStatusCode,
  } = useMatePartyFromRoute(id);
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);
  const {
    userId: currentUserId,
    userHandle: currentUserHandle,
  } = useAuthProfileSnapshot();
  const queryClient = useQueryClient();

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
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => (
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  ));
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false); // For Seat View toggle
  const [showZoneDetails, setShowZoneDetails] = useState(false);
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ handle: string; name: string } | null>(null);
  const missingPartyRedirectRef = useRef<string | null>(null);
  const selectedPartyId = selectedParty?.id;
  const selectedPartyStatus = selectedParty?.status;
  const isHost = isPartyHostedByUser(selectedParty, { id: currentUserId, handle: currentUserHandle });
  const partyReviewsQuery = useQuery({
    queryKey: ['mate-party-reviews', selectedPartyId],
    queryFn: () => api.getPartyReviews(selectedPartyId!),
    enabled: Boolean(selectedPartyId && selectedPartyStatus === 'COMPLETED'),
    retry: false,
    staleTime: 60 * 1000,
  });
  const myApplicationQuery = useQuery({
    queryKey: ['mate-party-my-application', selectedPartyId, currentUserId],
    queryFn: async () => {
      try {
        return await api.getMyApplicationByParty(selectedPartyId!);
      } catch (error) {
        if (getApiErrorStatus(error) === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(selectedPartyId && currentUserId),
    retry: false,
    staleTime: 30 * 1000,
  });
  const hostApplicationsQuery = useQuery({
    queryKey: ['mate-party-applications', selectedPartyId],
    queryFn: () => api.getApplicationsByParty(selectedPartyId!),
    enabled: Boolean(selectedPartyId && isHost),
    staleTime: 30 * 1000,
  });
  const reviews = useMemo(() => (
    Array.isArray(partyReviewsQuery.data) ? partyReviewsQuery.data : []
  ), [partyReviewsQuery.data]);
  const myApplication = myApplicationQuery.data ?? null;
  const applications = hostApplicationsQuery.data ?? [];

  useEffect(() => {
    if (partyStatusCode !== 404 || !id || selectedParty) {
      missingPartyRedirectRef.current = null;
      return;
    }
    if (missingPartyRedirectRef.current === id) {
      return;
    }

    missingPartyRedirectRef.current = id;
    toast.info('존재하지 않는 파티입니다. 목록으로 이동합니다.');
    const redirectTimer = window.setTimeout(() => {
      navigate('/mate', { replace: true });
    }, 1600);

    return () => window.clearTimeout(redirectTimer);
  }, [id, navigate, partyStatusCode, selectedParty]);

  useEffect(() => {
    if (partyReviewsQuery.error && getApiErrorStatus(partyReviewsQuery.error) !== 403) {
      toast.error('리뷰 정보를 불러오는데 실패했습니다.');
    }
  }, [partyReviewsQuery.error]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
    const confirmMessage = isApproved
      ? '참여를 취소하시겠습니까?\n\n직거래는 당사자 간 채팅 조율 방식이며 플랫폼 결제/환불이 적용되지 않습니다.\n취소는 경기 하루 전까지만 가능합니다.'
      : '신청을 취소하시겠습니까?\n\n직거래는 당사자 간 채팅 조율 방식이며 플랫폼 결제/환불이 적용되지 않습니다.';

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
      const updatedParty = await api.getPartyById(selectedParty.id);
      setSelectedParty(mapBackendPartyToFrontend(updatedParty));
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['mate-party-my-application', selectedParty.id, currentUserId] }),
        queryClient.invalidateQueries({ queryKey: ['mate-party-applications', selectedParty.id] }),
      ]);
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
      description: '직거래 신청 취소(플랫폼 결제/환불 없음)',
    },
    {
      value: 'SELLER_CHANGED_MIND' as const,
      label: '단순변심(판매자)',
      description: '직거래 신청 취소(플랫폼 결제/환불 없음)',
    },
    {
      value: 'OTHER' as const,
      label: '기타 사유',
      description: '사유 확인 후 신청 취소(플랫폼 결제/환불 없음)',
    },
  ];

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

  const scheduleNextQrRefresh = useCallback((
    isMountedRef: { current: boolean },
    expiresAt: string | null,
  ) => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!isMountedRef.current || !isDocumentVisible || selectedPartyId === undefined || !canAccessCheckIn) {
      return;
    }

    const delay = resolveQrRefreshDelayMs(expiresAt, Date.now());
    refreshTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current || typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      void fetchQrSession(isMountedRef, true);
    }, delay);
  }, [canAccessCheckIn, isDocumentVisible, selectedPartyId]);

  const fetchQrSession = useCallback(async (
    isMountedRef: { current: boolean },
    force: boolean = false,
  ) => {
    if (selectedPartyId === undefined || !canAccessCheckIn || !isDocumentVisible) return;
    if (!force && qrCheckInUrl && qrSessionExpiresAt) {
      const parsedExpiresAtMs = Date.parse(qrSessionExpiresAt);
      if (!Number.isNaN(parsedExpiresAtMs) && parsedExpiresAtMs - Date.now() > QR_REFRESH_LEAD_MS) {
        scheduleNextQrRefresh(isMountedRef, qrSessionExpiresAt);
        return;
      }
    }
    setIsQrLoading(true);
    try {
      const qrSession = await api.createCheckInQrSession({ partyId: selectedPartyId });
      if (!isMountedRef.current) return;

      setQrCheckInUrl(qrSession.checkinUrl || fallbackCheckInUrl);
      setQrSessionError(null);
      const expiresAt = qrSession.expiresAt ?? null;
      const parsedExpiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
      const isValidExpiresAt = expiresAt ? !Number.isNaN(parsedExpiresAtMs) : false;
      if (expiresAt && !isValidExpiresAt) {
        console.warn('[MateDetail] Invalid QR session expiresAt:', expiresAt);
      }
      setQrSessionExpiresAt(isValidExpiresAt ? expiresAt : null);
      scheduleNextQrRefresh(isMountedRef, isValidExpiresAt ? expiresAt : null);
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
  }, [
    canAccessCheckIn,
    fallbackCheckInUrl,
    isDocumentVisible,
    qrCheckInUrl,
    qrSessionExpiresAt,
    scheduleNextQrRefresh,
    selectedPartyId,
  ]);

  useEffect(() => {
    const isMountedRef = { current: true };

    setQrCheckInUrl(fallbackCheckInUrl);
    setQrSessionExpiresAt(null);
    setQrSessionError(null);

    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (selectedPartyId === undefined || !canAccessCheckIn || !isDocumentVisible) {
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
  }, [selectedPartyId, canAccessCheckIn, fallbackCheckInUrl, fetchQrSession, isDocumentVisible]);

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
    if (section.includes('응원')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/50';
    if (section.includes('테이블')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/50';
    if (section.includes('블루')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/50';
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-secondary/80 dark:text-gray-200 dark:border-border/70';
  };

  // description에서 해시태그 추출 (생성 Step 4에서 추가된 스타일 태그)
  const hostTags = extractHashtags(selectedParty.description);
  const mannerScore = getHostAverageRating(selectedParty);
  const mannerScoreLabel = formatHostAverageRating(selectedParty);


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
  const posterShellClass = 'rounded-3xl overflow-hidden mb-8 border border-gray-200/80 shadow-2xl ring-1 ring-black/5 transform transition-all hover:scale-[1.01] dark:border-white/10 dark:shadow-[0_32px_80px_rgba(0,0,0,0.72)] dark:ring-white/10';
  const sectionCardClass = 'border border-gray-200/80 bg-white shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:border-border/80 dark:bg-card/90 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] dark:ring-white/10';
  const insetPanelClass = 'rounded-xl border border-gray-200/80 bg-gray-50/90 dark:border-border/70 dark:bg-secondary/70';
  const summaryTradeLabel = selectedParty.status === 'SELLING'
    ? '판매 티켓'
    : '직거래';
  const summaryAmountLabel = selectedParty.status === 'SELLING'
    ? '판매가'
    : '거래 기준 금액';
  const summaryAmount = selectedParty.status === 'SELLING'
    ? (selectedParty.price || 0)
    : (selectedParty.ticketPrice || 0);
  const isAwaitingApproval = Boolean(myApplication && !myApplication.isApproved && !myApplication.isRejected);
  const summaryPolicyText = isHost
    ? (canConvertToSale ? '경기 임박 시 판매 전환 가능' : '파티 상태를 관리할 수 있습니다')
    : canCancel()
      ? (isApproved ? '경기 하루 전까지 취소 가능' : '승인 전에는 자유 취소 가능')
      : (myApplication?.isRejected ? '거절된 신청입니다' : '상태에 따라 취소가 제한됩니다');
  const actionContext = (() => {
    if (isHost) {
      return {
        eyebrow: '호스트 모드',
        title: pendingApplications.length > 0 ? '신청을 검토하고 파티를 관리하세요.' : '현재 파티 상태를 관리할 수 있습니다.',
        detail: approvedApplications.length > 0
          ? '승인된 참여자와 채팅을 열고 체크인 준비를 진행할 수 있습니다.'
          : (canConvertToSale ? '경기 임박 시 판매 전환도 가능합니다.' : '새 신청이 들어오면 이 영역에서 바로 대응할 수 있습니다.'),
      };
    }
    if (isApproved) {
      return {
        eyebrow: '참여 확정',
        title: '채팅과 체크인 준비를 진행하세요.',
        detail: canAccessCheckIn
          ? '체크인 QR은 자동으로 갱신됩니다. 경기 당일 전까지 확인해두세요.'
          : '경기 전까지 채팅에서 만날 시간과 장소를 확정해두세요.',
      };
    }
    if (myApplication && !myApplication.isApproved && !myApplication.isRejected) {
      return {
        eyebrow: '승인 대기',
        title: '호스트 승인 대기 중입니다.',
        detail: '승인 전까지는 신청을 취소할 수 있습니다.',
      };
    }
    if (myApplication?.isRejected) {
      return {
        eyebrow: '신청 결과',
        title: '이번 신청은 거절되었습니다.',
        detail: '다른 파티를 찾아보거나 목록으로 돌아갈 수 있습니다.',
      };
    }
    if (selectedParty.status === 'SELLING') {
      return {
        eyebrow: '지금 구매 가능',
        title: '티켓 정보와 정책을 확인하고 신청하세요.',
        detail: '승인 후 채팅에서 전달 시간과 장소를 조율합니다.',
      };
    }
    return {
      eyebrow: '지금 참여 가능',
      title: '핵심 정보 확인 후 바로 참여할 수 있습니다.',
      detail: '승인 후 채팅에서 거래 시간과 장소를 조율합니다.',
    };
  })();
  const actionButtons: Array<{
    key: string;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
  }> = [];

  if (isHost) {
    actionButtons.push({
      key: 'manage',
      label: `신청 관리 (${pendingApplications.length})`,
      onClick: handleManageParty,
      className: 'w-full h-14 text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-all bg-primary',
    });
    if (approvedApplications.length > 0) {
      actionButtons.push({
        key: 'chat',
        label: '채팅방 입장',
        onClick: handleOpenChat,
        variant: 'outline',
        className: 'w-full h-12 border-primary text-primary hover:bg-primary/10',
      });
    }
    if (canAccessCheckIn) {
      actionButtons.push({
        key: 'checkin',
        label: '체크인 페이지',
        onClick: handleCheckIn,
        variant: 'outline',
        className: 'w-full h-12 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10',
      });
    }
    if (canConvertToSale) {
      actionButtons.push({
        key: 'sale',
        label: isConvertingToSale ? '전환 중...' : '판매 전환',
        onClick: handleOpenSaleDialog,
        disabled: isConvertingToSale,
        variant: 'outline',
        className: 'w-full h-12 border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30',
      });
    }
  } else if (isApproved) {
    actionButtons.push({
      key: 'chat',
      label: '채팅방 입장',
      onClick: handleOpenChat,
      className: 'w-full h-14 text-lg font-bold text-white shadow-lg bg-primary',
    });
    if (canAccessCheckIn) {
      actionButtons.push({
        key: 'checkin',
        label: '체크인 페이지',
        onClick: handleCheckIn,
        variant: 'outline',
        className: 'w-full h-12 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10',
      });
    }
    if (canCancel()) {
      actionButtons.push({
        key: 'cancel',
        label: isCancelling ? '취소 중...' : '참여 취소',
        onClick: handleCancelApplication,
        disabled: isCancelling,
        variant: 'outline',
        className: 'w-full h-10 border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
      });
    }
  } else if (isAwaitingApproval) {
    actionButtons.push({
      key: 'cancel',
      label: isCancelling ? '취소 중...' : '신청 취소',
      onClick: handleCancelApplication,
      disabled: isCancelling,
      variant: 'ghost',
      className: 'w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm',
    });
  } else if (myApplication?.isRejected) {
    actionButtons.push({
      key: 'back',
      label: '다른 파티 보기',
      onClick: () => navigate('/mate'),
      variant: 'outline',
      className: 'w-full h-12 border-primary text-primary hover:bg-primary/10',
    });
  } else if (selectedParty.status === 'PENDING') {
    actionButtons.push({
      key: 'apply',
      label: '참여하기',
      onClick: handleApply,
      className: 'w-full h-14 text-xl font-bold text-white shadow-xl hover:shadow-2xl hover:bg-primary-hover transition-all bg-primary',
    });
  }
  const primaryMobileAction = actionButtons.find((action) => !action.disabled) ?? actionButtons[0] ?? null;
  const secondaryMobileAction = actionButtons[0]?.disabled ? null : (actionButtons[1] ?? null);
  const getMobileActionClass = (actionKey: string) => {
    if (actionKey === 'checkin') return 'border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10';
    if (actionKey === 'sale') return 'border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30';
    if (actionKey === 'cancel') return 'border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30';
    if (actionKey === 'back') return 'border-primary text-primary hover:bg-primary/10';
    return 'bg-primary text-white';
  };

  return (
    <TooltipProvider>
      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background pb-32 lg:pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.08),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%)]" />
        <OptimizedImage
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
        />

        <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button variant="ghost" className="pl-0 text-sm hover:bg-transparent sm:text-base" onClick={() => navigate('/mate')}>
              <ChevronLeft className="w-5 h-5 mr-1" /> 목록으로
            </Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleShare}>
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
          <div className={posterShellClass}>
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
              <div className="relative z-10 mb-6 flex justify-center sm:mb-8">
                <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-center shadow-lg backdrop-blur-md sm:flex-nowrap sm:gap-3 sm:rounded-full sm:px-5">
                  <span className="font-mono font-bold tracking-wider">
                    {formatGameDate(selectedParty.gameDate)}
                  </span>
                  <span className="hidden text-white/60 sm:inline">•</span>
                  <span className="font-mono font-bold">
                    {selectedParty.gameTime.substring(0, 5)}
                  </span>
                  <span className="hidden text-white/60 sm:inline">•</span>
                  <span className="w-full break-keep text-xs font-bold sm:w-auto sm:text-sm">
                    {selectedParty.stadium}
                  </span>
                </div>
              </div>

              {/* Main Matchup */}
              <div className="relative z-10 mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-start gap-3 sm:items-center sm:gap-6">
                <div className="flex min-w-0 flex-col items-center gap-2 text-center transform transition-transform hover:scale-105 sm:gap-3">
                  <div className="rounded-full bg-white p-2 shadow-lg sm:p-3">
                    <TeamLogo teamId={selectedParty.homeTeam} size={72} />
                  </div>
                  <span className="break-keep text-lg font-black tracking-tight shadow-black drop-shadow-md sm:text-2xl">
                    {resolveTeamDisplayName(selectedParty.homeTeam) || selectedParty.homeTeam}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black italic text-white/90 drop-shadow-xl sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>VS</span>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 text-center transform transition-transform hover:scale-105 sm:gap-3">
                  <div className="rounded-full bg-white p-2 shadow-lg sm:p-3">
                    <TeamLogo teamId={selectedParty.awayTeam} size={72} />
                  </div>
                  <span className="break-keep text-lg font-black tracking-tight shadow-black drop-shadow-md sm:text-2xl">
                    {resolveTeamDisplayName(selectedParty.awayTeam) || selectedParty.awayTeam}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="bg-white dark:bg-card/95 p-5 sm:p-6 md:p-8 border-t-4 border-dashed border-gray-200 dark:border-border relative">
              {/* Punch Holes for Ticket realism */}
              <div className="absolute -left-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-background rounded-full"></div>
              <div className="absolute -right-4 top-[-10px] w-8 h-8 bg-gray-50 dark:bg-background rounded-full"></div>

              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                {/* Seat Info with Visualization */}
                <div className="flex-1 text-center md:text-left">
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {currentZone ? (
                      <div className="group relative">
                        <Badge
                          className="border-none text-white px-3 py-1 text-sm shadow-sm"
                          style={{ backgroundColor: currentZone.color || '#4b5563' }} // Default gray if no color
                        >
                          {currentZone.name}
                        </Badge>
                        {/* Tooltip for Price & Desc */}
                        <div className="absolute bottom-full left-0 mb-2 hidden md:group-hover:block w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl z-50 border border-white/10 animate-in fade-in slide-in-from-bottom-1">
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
                      className="min-h-11 text-xs text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
                      onClick={() => setShowSeatViewGuide(!showSeatViewGuide)}
                    >
                      <MapIcon className="w-3 h-3 mr-1" /> {showSeatViewGuide ? '닫기' : '위치/시야 보기'}
                    </Button>
                    {currentZone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 text-xs text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary md:hidden"
                        onClick={() => setShowZoneDetails(!showZoneDetails)}
                      >
                        <Info className="w-3 h-3 mr-1" /> {showZoneDetails ? '구역 설명 닫기' : '구역 설명'}
                      </Button>
                    )}
                  </div>

                  {currentZone && showZoneDetails && (
                    <div className={`mb-4 ${insetPanelClass} p-4 text-left md:hidden`}>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentZone.description}</p>
                      {currentZone.price && (
                        <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex justify-between">
                            <span>주중</span>
                            <span>{currentZone.price.weekday}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>주말</span>
                            <span>{currentZone.price.weekend}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* UGC Seat View Guide Area */}
                  {showSeatViewGuide && (
                    <div className="mt-4 mb-4 animate-in zoom-in-95 duration-200">
                      <SeatViewGallery
                        compact
                        stadium={selectedParty.stadium}
                        section={selectedParty.section}
                      />
                    </div>
                  )}
                  <h2 className="mb-2 text-2xl font-black text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {selectedParty.section}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-gray-500 dark:text-gray-300 md:justify-start md:gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{selectedParty.currentParticipants}/{selectedParty.maxParticipants}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {selectedParty.ticketVerified ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-green-600 dark:text-green-400">티켓 인증됨</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 text-amber-500" />
                          <span className="font-medium text-amber-600 dark:text-amber-300">티켓 확인 전</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code - 모바일: 중앙 정렬 / 데스크톱: 우측 구분선 포함 */}
                <div className="mt-2 flex flex-col items-center md:mt-0 md:border-l md:border-gray-200 md:dark:border-border/80 md:pl-8">
                  <div className="w-28 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-border/70 dark:bg-secondary/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:w-[132px]">
                    <QRCode
                      value={qrCodeValue}
                      size={132}
                      style={{ width: '100%', maxWidth: 132, height: 'auto' }}
                      viewBox={`0 0 256 256`}
                      fgColor="#1a1a1a"
                      bgColor="#ffffff"
                      level="Q"
                    />
                  </div>
                  <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1">ENTRY CODE</p>
                  {isQrLoading && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">체크인 QR을 새로 불러오는 중입니다.</p>
                  )}
                  {qrSessionExpiresAt && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
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
          <Card className={`mb-6 p-4 ${sectionCardClass}`}>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
              <div className={`${insetPanelClass} p-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">거래 방식</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryTradeLabel}</p>
              </div>
              <div className={`${insetPanelClass} p-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">티켓 인증</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedParty.ticketVerified ? '인증 완료' : '확인 전'}</p>
              </div>
              <div className={`${insetPanelClass} p-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">{summaryAmountLabel}</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryAmount.toLocaleString()}원</p>
              </div>
              <div className={`${insetPanelClass} col-span-2 p-3 md:col-span-1`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">취소 규칙</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryPolicyText}</p>
              </div>
              <div className={`${insetPanelClass} p-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">참여 현황</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedParty.currentParticipants}/{selectedParty.maxParticipants}명</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-20">
            <div className="space-y-6 lg:col-span-2">
              <Card className={`p-6 ${sectionCardClass}`}>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                  <Info className="w-5 h-5 text-primary" /> 비용 안내
                </h3>
                <div className={`${insetPanelClass} p-5`}>
                  {selectedParty.status === 'SELLING' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600 dark:text-gray-300">티켓 판매가</span>
                        <span className="text-xl font-bold text-orange-600">
                          {selectedParty.price?.toLocaleString()}원
                        </span>
                      </div>
                      <Separator className="my-2 bg-gray-200 dark:bg-border" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        직거래 안내: 승인 후 채팅에서 거래 시간과 장소를 조율하고 당사자 간 직접 거래합니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">티켓 가격</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-200">
                          {(selectedParty.ticketPrice || 0).toLocaleString()}원
                        </span>
                      </div>
                      <Separator className="my-2 bg-gray-200 dark:bg-border" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        직거래 안내: 승인 후 채팅에서 거래 시간과 장소를 조율하고 당사자 간 직접 거래합니다.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className={`${insetPanelClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">정책 안내</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      플랫폼 결제/환불 없이 승인 후 채팅으로 직거래를 조율합니다.
                    </p>
                  </div>
                  <div className={`${insetPanelClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">다음 단계</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {isHost
                        ? '신청 관리에서 승인 여부를 결정하고, 이후 채팅이나 체크인으로 흐름을 이어갈 수 있습니다.'
                        : '상태에 따라 승인 대기, 채팅 입장, 체크인 준비로 이어집니다.'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={`p-5 sm:p-6 ${sectionCardClass}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4 sm:items-center">
                    <ProfileAvatar
                      src={selectedParty.hostProfileImageUrl ?? undefined}
                      alt={selectedParty.hostName}
                      fallbackName={selectedParty.hostName}
                      width={80}
                      height={80}
                      showRing
                      ringClassName="p-1 bg-white/95 dark:bg-secondary/90 border border-white/60 dark:border-white/10 shadow-lg"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">Host Trust</p>
                      <button
                        type="button"
                        className="mt-1 text-left text-xl font-black text-gray-900 dark:text-white"
                        onClick={() => setShowHostProfile(true)}
                      >
                        {selectedParty.hostName}
                      </button>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="dark:border-border dark:text-gray-200">
                          <Star className={`w-3 h-3 ${mannerScore === null ? 'text-gray-400' : 'text-yellow-500 fill-yellow-500'}`} />
                          {mannerScore === null ? mannerScoreLabel : `평점 ${mannerScoreLabel}`}
                        </Badge>
                        <Badge variant="outline" className={`${selectedParty.ticketVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200' : 'dark:border-border dark:text-gray-200'}`}>
                          <Shield className="w-3 h-3" />
                          {selectedParty.ticketVerified ? '티켓 인증' : '인증 확인 전'}
                        </Badge>
                        <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-900/50 dark:bg-purple-950/35 dark:text-purple-200">
                          {summaryTradeLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 sm:w-auto" onClick={() => setShowHostProfile(true)}>
                    프로필 보기
                  </Button>
                </div>
              </Card>

              <Card className={`p-6 ${sectionCardClass}`}>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                  <MessageSquare className="w-5 h-5 text-primary" /> 파티 소개
                </h3>
                <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300 md:text-base">
                  {stripHashtags(selectedParty.description)}
                </p>
                {hostTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hostTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>

              <Card className={`p-6 overflow-hidden ${sectionCardClass}`}>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                  <MapPin className="w-5 h-5 text-primary" /> 좌석 시야
                </h3>
                <SeatViewGallery
                  stadium={selectedParty.stadium}
                  section={selectedParty.section}
                />
              </Card>

              {selectedParty.status === 'COMPLETED' && currentUserId && (isHost || isApproved) && (
                <Card className={`p-4 ${sectionCardClass}`}>
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    리뷰
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const targets = isHost
                        ? approvedApplications
                          .filter((app): app is Application & { applicantHandle: string } => Boolean(app.applicantHandle))
                          .map((app) => ({
                            handle: app.applicantHandle,
                            name: app.applicantName,
                          }))
                        : (selectedParty.hostHandle
                          ? [{
                            handle: selectedParty.hostHandle,
                            name: selectedParty.hostName,
                          }]
                          : []);

                      if (targets.length === 0) {
                        return <p className="text-sm text-gray-400">리뷰 대상이 없습니다.</p>;
                      }

                        return targets.map((target) => {
                          const myReview = reviews.find(
                          (r) => hasSameMateUserIdentity(
                            { handle: r.reviewerHandle },
                            { handle: currentUserHandle },
                          ) && hasSameMateUserIdentity(
                            { handle: r.revieweeHandle },
                            target,
                          )
                        );

                        return (
                          <div
                            key={target.handle}
                            className={`flex items-center justify-between p-3 ${insetPanelClass}`}
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
                                    <span className="ml-1 max-w-[120px] truncate text-xs text-gray-500 dark:text-gray-400">
                                      "{myReview.comment}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {myReview ? (
                              <Badge variant="outline" className="text-xs text-gray-500 dark:border-border dark:text-gray-300">
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

              <AdSlot
                slotId="mate_detail_1"
                pageType="mate_detail"
                contentId={selectedParty?.id ? String(selectedParty.id) : (id ?? null)}
                creativeType="sponsor_card"
                loggedIn={Boolean(currentUserId)}
                userId={currentUserId ? String(currentUserId) : null}
                wave="ads_wave2"
                minHeight={176}
                className="mt-4"
              />
            </div>

            <div className="space-y-4">
              <Card className={`sticky top-6 p-5 ${sectionCardClass}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {actionContext.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">
                  {actionContext.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {actionContext.detail}
                </p>

                <div className="mt-4 space-y-2">
                  {isAwaitingApproval && (
                    <div
                      data-testid="mate-pending-status"
                      className={`${insetPanelClass} flex items-start gap-3 p-4 text-sm text-gray-600 dark:text-gray-300`}
                    >
                      <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-400/15 dark:text-amber-200">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          신청이 접수되었습니다.
                        </p>
                        <p className="mt-1">
                          호스트 승인 전까지는 자유롭게 취소할 수 있고, 승인되면 채팅방 입장 버튼이 열립니다.
                        </p>
                      </div>
                    </div>
                  )}
                  {actionButtons.length > 0 ? actionButtons.map((action) => (
                    <Button
                      key={action.key}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      variant={action.variant}
                      className={action.className}
                    >
                      {action.label}
                    </Button>
                  )) : (
                    <div className={`${insetPanelClass} p-4 text-sm text-gray-600 dark:text-gray-300`}>
                      현재 바로 실행할 수 있는 액션은 없습니다. 상태 변화를 기다리거나 목록으로 돌아가세요.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {primaryMobileAction && (
            <div data-testid="mate-mobile-action-bar" className={`${mateMobileBarClass} lg:hidden`}>
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    {actionContext.eyebrow}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {actionButtons[0]?.disabled ? actionButtons[0].label : actionContext.title}
                  </p>
                </div>
                {secondaryMobileAction && (
                  <Button
                    onClick={secondaryMobileAction.onClick}
                    disabled={secondaryMobileAction.disabled}
                    variant={secondaryMobileAction.variant ?? 'outline'}
                    className={`flex-1 sm:flex-none sm:min-w-[104px] ${getMobileActionClass(secondaryMobileAction.key)}`}
                  >
                    {secondaryMobileAction.label}
                  </Button>
                )}
                <Button
                  onClick={primaryMobileAction.onClick}
                  disabled={primaryMobileAction.disabled}
                  variant={primaryMobileAction.key === 'manage' || primaryMobileAction.key === 'apply' || primaryMobileAction.key === 'chat' ? 'default' : (primaryMobileAction.variant ?? 'outline')}
                  className={`flex-1 sm:flex-none sm:min-w-[124px] ${primaryMobileAction.disabled ? 'bg-gray-300 text-gray-500 dark:bg-secondary/80 dark:text-gray-400' : getMobileActionClass(primaryMobileAction.key)}`}
                >
                  {primaryMobileAction.label}
                </Button>
              </div>
            </div>
          )}
        </div>
        <UserProfileModal
          handle={selectedParty?.hostHandle ?? null}
          isOpen={showHostProfile}
          onClose={() => setShowHostProfile(false)}
        />
        {reviewTarget && currentUserId && (
          <ReviewDialog
            isOpen={reviewTarget !== null}
            onClose={() => setReviewTarget(null)}
            partyId={selectedParty.id}
            reviewee={reviewTarget}
            onSuccess={() => {
              void queryClient.invalidateQueries({ queryKey: ['mate-party-reviews', selectedParty.id] });
            }}
          />
        )}

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>취소 사유 선택</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                직거래 파티는 취소 시 플랫폼 결제/환불이 적용되지 않습니다.
              </p>
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
    </TooltipProvider>
  );
}
