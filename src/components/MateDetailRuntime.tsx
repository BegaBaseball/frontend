import { lazy, Suspense, type CSSProperties, type ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfirmDialog } from './contexts/confirmDialogCore';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import {
  cancelApplicationWithReason,
  normalizeMateParty,
  updateParty,
} from '../api/mate';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyMyApplicationQueryOptions,
  invalidateMatePartyQueries,
  removeMatePartyFromCollections,
  setMatePartyMyApplicationQueryData,
  syncMatePartyQueryData,
  updateMatePartyApplicationsQueryData,
  updateMatePartyCollectionQueryData,
  useMatePartyFromRoute,
} from '../hooks/mateDetailRoute';
import {
  Calendar,
  MapPin,
  Users,
  Shield,
  CheckCircle,
  Share2,
  ChevronLeft,
  AlertTriangle,
  QrCode,
  Map as MapIcon,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { getTeamColorByAnyKey } from '../constants/teams';
import {
  formatGameDate,
  isPartyHostedByUser,
} from '../utils/mate';
import type { CancelReasonType } from '../types/mate';
import { getRefundPolicyMessage } from '../utils/paymentStatus';
import ViewportDeferred from './ViewportDeferred';
import type { MateDetailActionButton, MateDetailActionContext } from './MateDetailActionSection';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const TECHNICAL_ERROR_PATTERNS = [
  /request failed with status code \d+/i,
  /^network error$/i,
  /^api error:/i,
  /timeout of \d+ms exceeded/i,
  /failed to fetch/i,
];

const resolveMateDetailErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const data = 'data' in error ? (error as { data?: { message?: string; error?: string } | null }).data : null;
    const serverMessage = typeof data?.message === 'string'
      ? data.message.trim()
      : typeof data?.error === 'string'
        ? data.error.trim()
        : '';

    if (serverMessage && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(serverMessage))) {
      return serverMessage;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return message;
    }
  }

  return fallback;
};

const ReviewDialog = lazy(() => import('./ReviewDialog'));
const LazyUserProfileModal = lazy(() => import('./profile/UserProfileModal'));
const LazyMateDetailQrRuntime = lazy(() => import('./MateDetailQrRuntime'));
const LazyMateDetailSeatPanel = lazy(() => import('./MateDetailSeatPanel'));
const LazyMateDetailActionDialogs = lazy(() => import('./MateDetailActionDialogs'));
const LazyMateDetailActionSection = lazy(() => import('./MateDetailActionSection'));
const LazyMateDetailOverviewSection = lazy(() => import('./MateDetailOverviewSection'));
const LazyMateDetailInfoSections = lazy(() => import('./MateDetailInfoSections'));

function InlineBadge({
  className,
  style,
  title,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={joinClassNames(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

export default function MateDetailRuntime() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirmDialog();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
    statusCode: partyStatusCode,
  } = useMatePartyFromRoute(id);
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const currentUserHandle = currentUser?.handle;
  const queryClient = useQueryClient();

  const [isCancelling, setIsCancelling] = useState(false);
  const [isConvertingToSale, setIsConvertingToSale] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [salePriceError, setSalePriceError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReasonType>('BUYER_CHANGED_MIND');
  const [cancelMemo, setCancelMemo] = useState('');
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false); // For Seat View toggle
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ handle: string; name: string } | null>(null);
  const missingPartyRedirectRef = useRef<string | null>(null);
  const partyId = party?.id;
  const partyStatus = party?.status;
  const isHost = isPartyHostedByUser(party, { id: currentUserId, handle: currentUserHandle });
  const myApplicationQuery = useQuery({
    ...(partyId != null
      ? getMatePartyMyApplicationQueryOptions(partyId, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: Boolean(partyId && currentUserId),
  });
  const hostApplicationsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(partyId && isHost),
  });
  const myApplication = myApplicationQuery.data ?? null;
  const applications = hostApplicationsQuery.data ?? [];

  useEffect(() => {
    if (partyStatusCode !== 404 || !id || party) {
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
  }, [id, navigate, partyStatusCode, party]);

  useEffect(() => {
    setShowQrPanel(false);
    setShowSeatViewGuide(false);
    setShowHostProfile(false);
    setReviewTarget(null);
  }, [partyId]);

  const isGameTomorrow = () => {
    if (!party) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gameDate = new Date(party.gameDate);
    gameDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((gameDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < 1;
  };

  const canCancel = () => {
    if (!party) return false;
    if (!myApplication) return false;
    if (myApplication.isRejected) return false;
    if (party.status === 'CHECKED_IN' || party.status === 'COMPLETED') return false;
    if (!myApplication.isApproved) return true;
    return !isGameTomorrow();
  };

  const handleCancelApplication = async () => {
    if (!party || !myApplication || !currentUserId) return;
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
    if (!party || !myApplication || !currentUserId) return;

    setIsCancelling(true);
    setShowCancelDialog(false);
    try {
      const wasApproved = myApplication.isApproved;
      const cancelledApplicationId = myApplication.id;
      const result = await cancelApplicationWithReason(myApplication.id, {
        cancelReasonType: selectedCancelReason,
        cancelMemo: cancelMemo.trim() || undefined,
      });
      setMatePartyMyApplicationQueryData(queryClient, party.id, currentUserId, null);
      updateMatePartyApplicationsQueryData(queryClient, party.id, (applications) =>
        applications.filter((application) => application.id !== cancelledApplicationId),
      );
      if (wasApproved) {
        updateMatePartyCollectionQueryData(queryClient, party.id, (currentParty) => ({
          ...currentParty,
          currentParticipants: Math.max(1, currentParty.currentParticipants - 1),
          status: 'PENDING',
        }), {
          includeMyParties: false,
        });
        removeMatePartyFromCollections(queryClient, party.id, {
          includePartyLists: false,
          includeMyParties: true,
        });
      }
      toast.success('신청이 취소되었습니다.', {
        description: getRefundPolicyMessage(
          result.refundPolicyApplied,
          result.refundAmount,
          result.feeCharged,
        ),
      });
    } catch (error: unknown) {
      console.error('신청 취소 중 오류:', error);
      toast.error(resolveMateDetailErrorMessage(error, '신청 취소 중 오류가 발생했습니다.'));
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
  const canAccessCheckIn = Boolean(party) &&
    (isHost || isApproved) &&
    party?.status !== 'CHECKED_IN' &&
    party?.status !== 'COMPLETED' &&
    party?.status !== 'FAILED';

  const fallbackCheckInUrl = useMemo(() => {
    if (!id && !party?.id) {
      return typeof window === 'undefined' ? '/mate' : window.location.href;
    }
    const path = `/mate/${id ?? party?.id}/checkin`;
    if (typeof window === 'undefined') {
      return path;
    }
    return new URL(path, window.location.origin).toString();
  }, [id, party?.id]);

  if (isPartyLoading && !party) {
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

  if (partyError || !party) {
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

  const isGameSoon = () => {
    const gameDate = new Date(party.gameDate);
    const now = new Date();
    const hours = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hours < 24 && hours > 0;
  };

  const canConvertToSale = (party.status === 'PENDING' || party.status === 'FAILED') && isGameSoon();

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
      const updatedParty = await updateParty(party.id, { status: 'SELLING', price: parsed });
      syncMatePartyQueryData(queryClient, normalizeMateParty(updatedParty));
      toast.success('판매 전환이 완료되었습니다.');
      setShowSaleDialog(false);
    } catch (error: unknown) {
      console.error('판매 전환 중 오류:', error);
      toast.error(resolveMateDetailErrorMessage(error, '판매 전환 중 오류가 발생했습니다.'));
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
  const homeTeamColor = getTeamColorByAnyKey(party.homeTeam);
  const getSeatBadgeColor = (section: string) => {
    if (section.includes('응원')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/50';
    if (section.includes('테이블')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-200 dark:border-purple-900/50';
    if (section.includes('블루')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/50';
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-secondary/80 dark:text-gray-200 dark:border-border/70';
  };


  const posterShellClass = 'rounded-3xl overflow-hidden mb-8 border border-gray-200/80 shadow-2xl ring-1 ring-black/5 transform transition-all hover:scale-[1.01] dark:border-white/10 dark:shadow-[0_32px_80px_rgba(0,0,0,0.72)] dark:ring-white/10';
  const sectionCardClass = 'border border-gray-200/80 bg-white shadow-md ring-1 ring-black/5 backdrop-blur-sm dark:border-border/80 dark:bg-card/90 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] dark:ring-white/10';
  const insetPanelClass = 'rounded-xl border border-gray-200/80 bg-gray-50/90 dark:border-border/70 dark:bg-secondary/70';
  const summaryTradeLabel = party.status === 'SELLING'
    ? '판매 티켓'
    : '직거래';
  const summaryAmountLabel = party.status === 'SELLING'
    ? '판매가'
    : '거래 기준 금액';
  const summaryAmount = party.status === 'SELLING'
    ? (party.price || 0)
    : (party.ticketPrice || 0);
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
          ? '체크인 페이지로 이동하거나 QR 패널을 열어 경기 당일 준비를 확인하세요.'
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
    if (party.status === 'SELLING') {
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
  } else if (party.status === 'PENDING') {
    actionButtons.push({
      key: 'apply',
      label: '참여하기',
      onClick: handleApply,
      className: 'w-full h-14 text-xl font-bold text-white shadow-xl hover:shadow-2xl hover:bg-primary-hover transition-all bg-primary',
    });
  }
  const primaryMobileAction = actionButtons.find((action) => !action.disabled) ?? actionButtons[0] ?? null;
  const secondaryMobileAction = actionButtons[0]?.disabled ? null : (actionButtons[1] ?? null);
  const actionContextForSection: MateDetailActionContext = actionContext;
  const actionButtonsForSection: MateDetailActionButton[] = actionButtons;

  return (
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
                    {formatGameDate(party.gameDate)}
                  </span>
                  <span className="hidden text-white/60 sm:inline">•</span>
                  <span className="font-mono font-bold">
                    {party.gameTime.substring(0, 5)}
                  </span>
                  <span className="hidden text-white/60 sm:inline">•</span>
                  <span className="w-full break-keep text-xs font-bold sm:w-auto sm:text-sm">
                    {party.stadium}
                  </span>
                </div>
              </div>

              {/* Main Matchup */}
              <div className="relative z-10 mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-start gap-3 sm:items-center sm:gap-6">
                <div className="flex min-w-0 flex-col items-center gap-2 text-center transform transition-transform hover:scale-105 sm:gap-3">
                  <div className="rounded-full bg-white p-2 shadow-lg sm:p-3">
                    <TeamLogo teamId={party.homeTeam} size={72} />
                  </div>
                  <span className="break-keep text-lg font-black tracking-tight shadow-black drop-shadow-md sm:text-2xl">
                    {resolveTeamDisplayName(party.homeTeam) || party.homeTeam}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-3xl font-black italic text-white/90 drop-shadow-xl sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>VS</span>
                </div>

                <div className="flex min-w-0 flex-col items-center gap-2 text-center transform transition-transform hover:scale-105 sm:gap-3">
                  <div className="rounded-full bg-white p-2 shadow-lg sm:p-3">
                    <TeamLogo teamId={party.awayTeam} size={72} />
                  </div>
                  <span className="break-keep text-lg font-black tracking-tight shadow-black drop-shadow-md sm:text-2xl">
                    {resolveTeamDisplayName(party.awayTeam) || party.awayTeam}
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
                    <InlineBadge className={getSeatBadgeColor(party.section)}>
                      {party.section.split(' ')[0]}
                    </InlineBadge>

                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="mate-open-seat-panel"
                      className="min-h-11 text-xs text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
                      onClick={() => setShowSeatViewGuide(true)}
                    >
                      <MapIcon className="w-3 h-3 mr-1" /> 좌석/구역 보기
                    </Button>
                  </div>
                  <h2 className="mb-2 text-2xl font-black text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {party.section}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-gray-500 dark:text-gray-300 md:justify-start md:gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{party.currentParticipants}/{party.maxParticipants}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {party.ticketVerified ? (
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

                {/* QR CTA - 모바일: 중앙 정렬 / 데스크톱: 우측 구분선 포함 */}
                <div className="mt-2 flex flex-col items-center md:mt-0 md:border-l md:border-gray-200 md:dark:border-border/80 md:pl-8">
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-border/70 dark:bg-secondary/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:h-[132px] sm:w-[132px]">
                    <QrCode className="h-10 w-10 text-[#5b21b6]" />
                  </div>
                  <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1">CHECK-IN QR</p>
                  {canAccessCheckIn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="mate-open-qr-panel"
                      className="mt-3 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10"
                      onClick={() => setShowQrPanel(true)}
                    >
                      체크인 QR 보기
                    </Button>
                  ) : (
                    <p className="mt-3 max-w-[11rem] text-center text-[11px] text-gray-500 dark:text-gray-400">
                      참여 확정 후 체크인 패널을 열 수 있습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-20">
            <div className="space-y-6 lg:col-span-2">
              <ViewportDeferred
                rootMargin="0px 0px 160px 0px"
                fallback={<div className={`min-h-[108px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60`} />}
              >
                <Suspense fallback={null}>
                  <LazyMateDetailOverviewSection
                    party={party}
                    summaryTradeLabel={summaryTradeLabel}
                    summaryAmountLabel={summaryAmountLabel}
                    summaryAmount={summaryAmount}
                    summaryPolicyText={summaryPolicyText}
                    sectionCardClass={sectionCardClass}
                    insetPanelClass={insetPanelClass}
                  />
                </Suspense>
              </ViewportDeferred>
              <ViewportDeferred
                rootMargin="0px 0px 240px 0px"
                fallback={<div className={`min-h-[520px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60`} />}
              >
                <Suspense fallback={null}>
                  <LazyMateDetailInfoSections
                    party={party}
                    routePartyId={id}
                    isHost={isHost}
                    isApproved={isApproved}
                    currentUserId={currentUserId}
                    currentUserHandle={currentUserHandle}
                    sectionCardClass={sectionCardClass}
                    insetPanelClass={insetPanelClass}
                    getSeatBadgeColor={getSeatBadgeColor}
                    onOpenHostProfile={() => setShowHostProfile(true)}
                    onOpenSeatViewGuide={() => setShowSeatViewGuide(true)}
                    onRequestReview={setReviewTarget}
                  />
                </Suspense>
              </ViewportDeferred>
            </div>

            <Suspense fallback={null}>
              <LazyMateDetailActionSection
                actionContext={actionContextForSection}
                actionButtons={actionButtonsForSection}
                isAwaitingApproval={isAwaitingApproval}
                sectionCardClass={sectionCardClass}
                insetPanelClass={insetPanelClass}
                primaryMobileAction={primaryMobileAction}
                secondaryMobileAction={secondaryMobileAction}
              />
            </Suspense>
          </div>
        </div>
        {showQrPanel ? (
          <Suspense fallback={null}>
            <LazyMateDetailQrRuntime
              partyId={party.id}
              fallbackCheckInUrl={fallbackCheckInUrl}
              canAccessCheckIn={canAccessCheckIn}
              onClose={() => setShowQrPanel(false)}
              onOpenCheckInPage={handleCheckIn}
            />
          </Suspense>
        ) : null}
        {showSeatViewGuide ? (
          <Suspense fallback={null}>
            <LazyMateDetailSeatPanel
              open={showSeatViewGuide}
              stadium={party.stadium}
              section={party.section}
              onClose={() => setShowSeatViewGuide(false)}
            />
          </Suspense>
        ) : null}
        {showHostProfile ? (
          <Suspense fallback={null}>
            <LazyUserProfileModal
              handle={party?.hostHandle ?? null}
              isOpen={showHostProfile}
              onClose={() => setShowHostProfile(false)}
            />
          </Suspense>
        ) : null}
        {reviewTarget && currentUserId && (
          <Suspense fallback={null}>
            <ReviewDialog
              isOpen={reviewTarget !== null}
              onClose={() => setReviewTarget(null)}
              partyId={party.id}
              reviewee={reviewTarget}
              onSuccess={() => {
                void invalidateMatePartyQueries(queryClient, party.id, {
                  includeParty: false,
                  includeReviews: true,
                });
              }}
            />
          </Suspense>
        )}

        {(showCancelDialog || showSaleDialog) ? (
          <Suspense fallback={null}>
            <LazyMateDetailActionDialogs
              showCancelDialog={showCancelDialog}
              showSaleDialog={showSaleDialog}
              isCancelling={isCancelling}
              isConvertingToSale={isConvertingToSale}
              cancelReasonOptions={cancelReasonOptions}
              selectedCancelReason={selectedCancelReason}
              cancelMemo={cancelMemo}
              salePrice={salePrice}
              salePriceError={salePriceError}
              onCloseCancelDialog={() => setShowCancelDialog(false)}
              onExecuteCancelApplication={executeCancelApplication}
              onSelectCancelReason={setSelectedCancelReason}
              onChangeCancelMemo={setCancelMemo}
              onCloseSaleDialog={() => setShowSaleDialog(false)}
              onConfirmSale={handleConfirmSale}
              onChangeSalePrice={(value) => {
                setSalePrice(value);
                setSalePriceError('');
              }}
            />
          </Suspense>
        ) : null}
      </div>
  );
}
