import { lazy, Suspense } from 'react';
import { toast } from 'sonner';

import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';
import { StatusBadge } from './ui/status-badge';
import { useMateDetailController } from '../hooks/useMateDetailController';
import {
  MateAlertTriangleIcon,
  MateChevronLeftIcon,
  MateRefreshIcon,
  MateShareIcon,
} from './MateIcons';
import { getMateStatusBadgeMeta } from '../utils/statusBadgeMeta';
import ViewportDeferred from './ViewportDeferred';

const LazyMateDetailQrRuntime = lazy(() => import('./MateDetailQrRuntime'));
const LazyMateDetailSeatPanel = lazy(() => import('./MateDetailSeatPanel'));
const LazyMateDetailContentRuntime = lazy(() => import('./MateDetailContentRuntime'));

export default function MateDetailRuntime({
  id: idProp,
  variant = 'page',
  onClose,
}: {
  id?: string;
  variant?: 'page' | 'panel';
  onClose?: () => void;
} = {}) {
  const {
    canAccessCheckIn,
    currentUserHandle,
    currentUserId,
    fallbackCheckInUrl,
    handleApply,
    handleBrowsePartyList,
    handleCheckIn,
    handleClose,
    handleManageParty,
    handleOpenChat,
    hostApplications,
    id,
    isApproved,
    isHost,
    isPanel,
    isPartyLoading,
    isPartyRevalidating,
    myApplication,
    party,
    partyError,
    setShowQrPanel,
    setShowSeatViewGuide,
    showQrPanel,
    showSeatViewGuide,
  } = useMateDetailController({ id: idProp, variant, onClose });

  if (isPartyLoading && !party) {
    return (
      <div className={isPanel ? 'bg-gray-50 pb-10 dark:bg-background' : 'min-h-screen bg-gray-50 pb-[calc(7rem_+_env(safe-area-inset-bottom))] dark:bg-background lg:pb-16'}>
        <div className={isPanel ? 'w-full px-4 py-5' : 'mx-auto w-full max-w-full px-3 py-4 sm:max-w-[720px] sm:px-5 sm:py-5 lg:max-w-[1080px] lg:px-6 xl:max-w-[1120px]'}>
          <Skeleton className="mb-4 h-8 w-24" />
          <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <div className="space-y-4 md:space-y-5 lg:space-y-4">
              <Skeleton className="h-48 rounded-[18px]" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
            <Card className="hidden h-80 p-5 lg:block">
              <Skeleton className="mb-4 h-6 w-28" />
              <Skeleton className="mb-3 h-20 w-full" />
              <Skeleton className="mb-3 h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (partyError || !party) {
    return (
      <div className={isPanel ? 'flex items-center justify-center bg-gray-50 py-20 dark:bg-background' : 'flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background'}>
        <div className="max-w-md px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <MateAlertTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">파티를 불러오지 못했습니다</h2>
          <p className="mb-4 text-[16px] text-gray-500 dark:text-white">
            {partyError || '파티 정보를 찾을 수 없습니다.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              <MateChevronLeftIcon className="mr-1 h-4 w-4" /> {isPanel ? '닫기' : '목록으로'}
            </Button>
            <Button className="bg-primary text-white" onClick={() => window.location.reload()}>
              <MateRefreshIcon className="mr-1 h-4 w-4" /> 다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const statusMeta = getMateStatusBadgeMeta(party.status);

  return (
    <div className={isPanel ? 'relative bg-gray-50 pb-10 dark:bg-background' : 'relative min-h-screen bg-gray-50 pb-[calc(7.5rem_+_env(safe-area-inset-bottom))] dark:bg-background lg:pb-16'}>
      <div className={isPanel ? 'w-full px-4 py-5' : 'mx-auto w-full max-w-full px-3 py-4 sm:max-w-[720px] sm:px-5 sm:py-5 lg:max-w-[1080px] lg:px-6 xl:max-w-[1120px]'}>
        <div className="mb-[18px] flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" className="h-auto px-0 py-2 text-[15px] font-bold text-gray-700 hover:bg-transparent dark:text-white dark:hover:text-white" onClick={handleClose}>
              <MateChevronLeftIcon className="mr-1 h-[18px] w-[18px]" /> {isPanel ? '닫기' : '목록으로'}
            </Button>
            <StatusBadge {...statusMeta} size="xs" />
          </div>
          <Button variant="outline" size="sm" className="h-auto shrink-0 rounded-[10px] border-gray-200 bg-white px-3.5 py-2 text-[14px] font-bold text-gray-700 dark:border-white/10 dark:bg-[#000000] dark:text-white dark:hover:bg-white/10" onClick={handleShare}>
            <MateShareIcon className="mr-1.5 h-4 w-4" />
            공유
          </Button>
        </div>

        {isPartyRevalidating && (
          <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-[16px] text-blue-700 dark:text-blue-300">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        <ViewportDeferred
          rootMargin="0px 0px 220px 0px"
          fallback={<div className="mb-20 min-h-[560px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60" />}
        >
          <Suspense fallback={null}>
            <LazyMateDetailContentRuntime
              party={party}
              routePartyId={id}
              currentUserId={currentUserId}
              currentUserHandle={currentUserHandle}
              isHost={isHost}
              isApproved={isApproved}
              canAccessCheckIn={canAccessCheckIn}
              myApplication={myApplication}
              hostApplications={hostApplications}
              onApply={handleApply}
              onOpenCheckInPage={handleCheckIn}
              onManageParty={handleManageParty}
              onOpenChat={handleOpenChat}
              onBrowsePartyList={handleBrowsePartyList}
              onOpenSeatViewGuide={() => setShowSeatViewGuide(true)}
              onOpenQrPanel={() => setShowQrPanel(true)}
              onShare={handleShare}
            />
          </Suspense>
        </ViewportDeferred>
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
    </div>
  );
}
