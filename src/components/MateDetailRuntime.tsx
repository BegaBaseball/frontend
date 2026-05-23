import { lazy, Suspense, type CSSProperties, type ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyMyApplicationQueryOptions,
  useMatePartyFromRoute,
} from '../hooks/mateDetailRoute';
import {
  MateAlertTriangleIcon,
  MateCheckCircleIcon,
  MateChevronLeftIcon,
  MateMapIcon,
  MateQrCodeIcon,
  MateRefreshIcon,
  MateShareIcon,
  MateShieldIcon,
  MateUsersIcon,
} from './MateIcons';
import { useAuthStore } from '../store/authStore';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { getTeamColorByAnyKey } from '../constants/teams';
import {
  formatGameDate,
  isPartyHostedByUser,
} from '../utils/mate';
import ViewportDeferred from './ViewportDeferred';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const LazyMateDetailQrRuntime = lazy(() => import('./MateDetailQrRuntime'));
const LazyMateDetailSeatPanel = lazy(() => import('./MateDetailSeatPanel'));
const LazyMateDetailContentRuntime = lazy(() => import('./MateDetailContentRuntime'));

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
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[16px] font-semibold',
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
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false); // For Seat View toggle
  const missingPartyRedirectRef = useRef<string | null>(null);
  const partyId = party?.id;
  const isHost = isPartyHostedByUser(party, { id: currentUserId, handle: currentUserHandle });
  const myApplicationQuery = useQuery({
    ...(partyId != null
      ? getMatePartyMyApplicationQueryOptions(partyId, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: Boolean(partyId && currentUserId && !isHost),
  });
  useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(partyId && isHost),
    refetchOnMount: 'always',
  });
  const myApplication = myApplicationQuery.data ?? null;

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
  }, [partyId]);

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
            <MateAlertTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            파티를 불러오지 못했습니다
          </h2>
          <p className="text-gray-500 dark:text-gray-300 mb-4 text-[16px]">
            {partyError || '파티 정보를 찾을 수 없습니다.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/mate')}>
              <MateChevronLeftIcon className="w-4 h-4 mr-1" /> 목록으로
            </Button>
            <Button className="bg-primary text-white" onClick={() => window.location.reload()}>
              <MateRefreshIcon className="w-4 h-4 mr-1" /> 다시 시도
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
  const handleApply = () => navigate(`/mate/${id}/apply`);
  const handleBrowsePartyList = () => navigate('/mate');
  const handleCheckIn = (targetUrl?: string) => {
    const fallbackPath = `/mate/${id}/checkin`;
    try {
      const parsedUrl = new URL(targetUrl || fallbackCheckInUrl || fallbackPath, window.location.origin);
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
            <Button variant="ghost" className="pl-0 text-[16px] hover:bg-transparent sm:text-base" onClick={() => navigate('/mate')}>
              <MateChevronLeftIcon className="w-5 h-5 mr-1" /> 목록으로
            </Button>
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleShare}>
              <MateShareIcon className="w-4 h-4 mr-1.5" />
              공유
            </Button>
          </div>
          {isPartyRevalidating && (
            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <AlertDescription className="text-blue-700 dark:text-blue-300 text-[16px]">
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
                  <span className="w-full break-keep text-[16px] font-bold sm:w-auto sm:text-[16px]">
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
                      className="min-h-11 text-[16px] text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-primary"
                      onClick={() => setShowSeatViewGuide(true)}
                    >
                      <MateMapIcon className="w-3 h-3 mr-1" /> 좌석/구역 보기
                    </Button>
                  </div>
                  <h2 className="mb-2 text-2xl font-black text-gray-900 dark:text-gray-100 sm:text-3xl">
                    {party.section}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-gray-500 dark:text-gray-300 md:justify-start md:gap-4">
                    <div className="flex items-center gap-1">
                      <MateUsersIcon className="w-4 h-4" />
                      <span>{party.currentParticipants}/{party.maxParticipants}명</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {party.ticketVerified ? (
                        <>
                          <MateCheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-400">티켓 인증됨</span>
                        </>
                      ) : (
                        <>
                          <MateShieldIcon className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-amber-600 dark:text-amber-300">티켓 확인 전</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR CTA - 모바일: 중앙 정렬 / 데스크톱: 우측 구분선 포함 */}
                <div className="mt-2 flex flex-col items-center md:mt-0 md:border-l md:border-gray-200 md:dark:border-border/80 md:pl-8">
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-border/70 dark:bg-secondary/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:h-[132px] sm:w-[132px]">
                    <MateQrCodeIcon className="h-10 w-10 text-[#5b21b6]" />
                  </div>
                  <p className="text-[16px] text-center text-gray-400 dark:text-gray-500 mt-1">CHECK-IN QR</p>
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
                    <p className="mt-3 max-w-[11rem] text-center text-[16px] text-gray-500 dark:text-gray-400">
                      참여 확정 후 체크인 패널을 열 수 있습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <ViewportDeferred
            rootMargin="0px 0px 220px 0px"
            fallback={<div className="min-h-[560px] rounded-xl border border-dashed border-gray-200 bg-gray-50/80 dark:border-border/70 dark:bg-secondary/60 mb-20" />}
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
                sectionCardClass={sectionCardClass}
                insetPanelClass={insetPanelClass}
                getSeatBadgeColor={getSeatBadgeColor}
                onApply={handleApply}
                onOpenCheckInPage={handleCheckIn}
                onManageParty={handleManageParty}
                onOpenChat={handleOpenChat}
                onBrowsePartyList={handleBrowsePartyList}
                onOpenSeatViewGuide={() => setShowSeatViewGuide(true)}
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
