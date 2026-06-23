import { lazy, Suspense, useMemo, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  cancelApplicationWithReason,
  normalizeMateParty,
  updateParty,
} from '../api/mate';
import {
  invalidateMatePartyQueries,
  removeMatePartyFromCollections,
  setMatePartyMyApplicationQueryData,
  syncMatePartyQueryData,
  updateMatePartyApplicationsQueryData,
  updateMatePartyCollectionQueryData,
} from '../hooks/mateDetailRoute';
import type { Application, CancelReasonType, Party } from '../types/mate';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { getRefundPolicyMessage } from '../utils/paymentStatus';
import { getDayDifference } from '../utils/currentDate';
import { isMateGameSoon } from '../utils/mateDateLabels';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useTodayKey } from '../hooks/useTodayKey';
import { MateDetailHeroBlock } from './MateDetailReferenceBlocks';
import type { MateDetailActionButton, MateDetailActionContext } from './MateDetailActionSection';
import { useConfirmDialog } from './contexts/confirmDialogCore';

const ReviewDialog = lazy(() => import('./ReviewDialog'));
const LazyUserProfileModal = lazy(() => import('./profile/UserProfileModal'));
const LazyMateDetailActionDialogs = lazy(() => import('./MateDetailActionDialogs'));
const LazyMateDetailActionSection = lazy(() => import('./MateDetailActionSection'));
const LazyMateDetailInfoSections = lazy(() => import('./MateDetailInfoSections'));

interface MateDetailContentRuntimeProps {
  party: Party;
  routePartyId?: string;
  currentUserId: number | null;
  currentUserHandle?: string;
  isHost: boolean;
  isApproved: boolean;
  canAccessCheckIn: boolean;
  myApplication: Application | null;
  hostApplications: Application[];
  onApply: () => void;
  onOpenCheckInPage: () => void;
  onManageParty: () => void;
  onOpenChat: () => void;
  onBrowsePartyList: () => void;
  onOpenSeatViewGuide: () => void;
  onOpenQrPanel: () => void;
  onShare: () => void;
}

const resolveMateDetailErrorMessage = (error: unknown, fallback: string): string => {
  const technicalErrorPatterns = [
    /request failed with status code \d+/i,
    /^network error$/i,
    /^api error:/i,
    /timeout of \d+ms exceeded/i,
    /failed to fetch/i,
  ];

  if (typeof error === 'object' && error !== null) {
    const data = 'data' in error ? (error as { data?: { message?: string; error?: string } | null }).data : null;
    const serverMessage = typeof data?.message === 'string'
      ? data.message.trim()
      : typeof data?.error === 'string'
        ? data.error.trim()
        : '';

    if (serverMessage && !technicalErrorPatterns.some((pattern) => pattern.test(serverMessage))) {
      return serverMessage;
    }
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message && !technicalErrorPatterns.some((pattern) => pattern.test(message))) {
      return message;
    }
  }

  return fallback;
};

export default function MateDetailContentRuntime({
  party,
  routePartyId,
  currentUserId,
  currentUserHandle,
  isHost,
  isApproved,
  canAccessCheckIn,
  myApplication,
  hostApplications,
  onApply,
  onOpenCheckInPage,
  onManageParty,
  onOpenChat,
  onBrowsePartyList,
  onOpenSeatViewGuide,
  onOpenQrPanel,
  onShare,
}: MateDetailContentRuntimeProps) {
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConvertingToSale, setIsConvertingToSale] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [salePriceError, setSalePriceError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReasonType>('BUYER_CHANGED_MIND');
  const [cancelMemo, setCancelMemo] = useState('');
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ handle: string; name: string } | null>(null);
  const applications = isHost ? hostApplications : [];
  const isCompactHero = useMediaQuery('(max-width: 639px)');
  const todayKey = useTodayKey();
  const currentTime = useCurrentTime(60_000);

  const [approvedApplications, pendingApplications] = useMemo(() => [
    applications.filter((application) => application.isApproved),
    applications.filter((application) => !application.isApproved && !application.isRejected),
  ], [applications]);

  const canCancelApplication = useMemo(() => {
    if (!myApplication) return false;
    if (myApplication.isRejected) return false;
    if (party.status === 'CHECKED_IN' || party.status === 'COMPLETED') return false;
    if (!myApplication.isApproved) return true;

    const daysDiff = getDayDifference(party.gameDate, todayKey);
    return daysDiff >= 1;
  }, [myApplication, party.gameDate, party.status, todayKey]);

  const isGameSoon = useMemo(() => {
    return isMateGameSoon(party.gameDate, currentTime);
  }, [currentTime, party.gameDate]);

  const canConvertToSale = (party.status === 'PENDING' || party.status === 'FAILED') && isGameSoon;

  const isAwaitingApproval = Boolean(myApplication && !myApplication.isApproved && !myApplication.isRejected);
  const summaryPolicyText = isHost
    ? (canConvertToSale ? '경기 임박 시 판매 전환 가능' : '파티 상태를 관리할 수 있습니다')
    : canCancelApplication
      ? (isApproved ? '경기 하루 전까지 취소 가능' : '승인 전에는 자유 취소 가능')
      : (myApplication?.isRejected ? '거절된 신청입니다' : '상태에 따라 취소가 제한됩니다');

  const handleCancelApplication = async () => {
    if (!myApplication || !currentUserId) return;
    const isApprovedApplication = myApplication.isApproved;
    const confirmMessage = isApprovedApplication
      ? '참여를 취소하시겠습니까?\n\n직거래는 당사자 간 채팅 조율 방식이며 플랫폼 결제/환불이 적용되지 않습니다.\n취소는 경기 하루 전까지만 가능합니다.'
      : '신청을 취소하시겠습니까?\n\n직거래는 당사자 간 채팅 조율 방식이며 플랫폼 결제/환불이 적용되지 않습니다.';

    const confirmed = await confirm({
      title: isApprovedApplication ? '참여 취소' : '신청 취소',
      description: confirmMessage,
      confirmLabel: '취소하기',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setSelectedCancelReason(isApprovedApplication ? 'BUYER_CHANGED_MIND' : 'OTHER');
    setCancelMemo('');
    setShowCancelDialog(true);
  };

  const executeCancelApplication = async () => {
    if (!myApplication || !currentUserId) return;

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
      updateMatePartyApplicationsQueryData(queryClient, party.id, (currentApplications) =>
        currentApplications.filter((application) => application.id !== cancelledApplicationId),
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

  const handleOpenSaleDialog = () => {
    setSalePrice('');
    setSalePriceError('');
    setShowSaleDialog(true);
  };

  const handleConfirmSale = async () => {
    const parsedPrice = parseInt(salePrice, 10);
    if (!salePrice || Number.isNaN(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedPrice)) {
      setSalePriceError('양의 정수를 입력해주세요.');
      return;
    }
    if (parsedPrice < 100) {
      setSalePriceError('최소 100원 이상 입력해주세요.');
      return;
    }

    setIsConvertingToSale(true);
    try {
      const updatedParty = await updateParty(party.id, { status: 'SELLING', price: parsedPrice });
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

  const actionContext: MateDetailActionContext = (() => {
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

  const actionButtons: MateDetailActionButton[] = [];

  if (isHost) {
    actionButtons.push({
      key: 'manage',
      label: `신청 관리 (${pendingApplications.length})`,
      onClick: onManageParty,
      className: 'w-full h-14 text-lg font-bold text-white shadow-xl hover:shadow-2xl transition-all bg-primary',
    });
    if (approvedApplications.length > 0) {
      actionButtons.push({
        key: 'chat',
        label: '채팅방 입장',
        onClick: onOpenChat,
        variant: 'outline',
        className: 'w-full h-12 border-primary text-primary hover:bg-primary/10',
      });
    }
    if (canAccessCheckIn) {
      actionButtons.push({
        key: 'checkin',
        label: '체크인 페이지',
        onClick: onOpenCheckInPage,
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
      onClick: onOpenChat,
      className: 'w-full h-14 text-lg font-bold text-white shadow-lg bg-primary',
    });
    if (canAccessCheckIn) {
      actionButtons.push({
        key: 'checkin',
        label: '체크인 페이지',
        onClick: onOpenCheckInPage,
        variant: 'outline',
        className: 'w-full h-12 border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10',
      });
    }
    if (canCancelApplication) {
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
      className: 'w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-[16px]',
    });
  } else if (myApplication?.isRejected) {
    actionButtons.push({
      key: 'back',
      label: '다른 파티 보기',
      onClick: onBrowsePartyList,
      variant: 'outline',
      className: 'w-full h-12 border-primary text-primary hover:bg-primary/10',
    });
  } else if (party.status === 'PENDING') {
    actionButtons.push({
      key: 'apply',
      label: '참여하기',
      onClick: onApply,
      className: 'w-full h-14 text-xl font-bold text-white shadow-xl hover:shadow-2xl hover:bg-primary-hover transition-all bg-primary',
    });
  }

  const primaryMobileAction = actionButtons.find((action) => !action.disabled) ?? actionButtons[0] ?? null;

  return (
    <>
      <div className="mb-[calc(7rem_+_env(safe-area-inset-bottom))] grid grid-cols-1 gap-3.5 sm:gap-4 md:gap-5 lg:mb-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 xl:gap-7">
        <div className="flex min-w-0 flex-col gap-3.5 sm:gap-4 md:gap-5 lg:gap-4">
          <MateDetailHeroBlock party={party} compact={isCompactHero} />
          <Suspense fallback={null}>
            <LazyMateDetailInfoSections
              party={party}
              routePartyId={routePartyId}
              isHost={isHost}
              isApproved={isApproved}
              summaryPolicyText={summaryPolicyText}
              currentUserId={currentUserId}
              currentUserHandle={currentUserHandle}
              onOpenHostProfile={() => setShowHostProfile(true)}
              onOpenSeatViewGuide={onOpenSeatViewGuide}
              onOpenChat={onOpenChat}
              onRequestReview={setReviewTarget}
            />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <LazyMateDetailActionSection
            party={party}
            actionContext={actionContext}
            actionButtons={actionButtons}
            isAwaitingApproval={isAwaitingApproval}
            primaryMobileAction={primaryMobileAction}
            canAccessCheckIn={canAccessCheckIn}
            onOpenQrPanel={onOpenQrPanel}
            onShare={onShare}
            onBrowsePartyList={onBrowsePartyList}
          />
        </Suspense>
      </div>

      {showHostProfile ? (
        <Suspense fallback={null}>
          <LazyUserProfileModal
            handle={party.hostHandle ?? null}
            isOpen={showHostProfile}
            onClose={() => setShowHostProfile(false)}
          />
        </Suspense>
      ) : null}

      {reviewTarget && currentUserId ? (
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
      ) : null}

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
    </>
  );
}
