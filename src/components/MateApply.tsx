import { lazy, Suspense, type ReactNode, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import {
  MateAlertTriangleIcon,
  MateChevronLeftIcon,
  MateMessageSquareIcon,
  MateShieldIcon,
  MateWalletIcon,
} from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import {
  setMatePartyMyApplicationQueryData,
  updateMatePartyApplicationsQueryData,
  useMatePartyFromRoute,
} from '../hooks/mateApplyRoute';
import { useAuthAccessActions, useAuthSession } from '../store/authStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { useNavigate, useParams } from 'react-router-dom';
import { createApplication } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { formatGameDate } from '../utils/mate';
import VerificationRequiredDialog from './VerificationRequiredDialog';
import type { TicketInfo } from '../api/ticket';
import { getApiErrorMessage } from '../utils/errorUtils';
import LoadingSpinner from './LoadingSpinner';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
  clearMateApplyDraft,
  loadMateApplyDraft,
  saveMateApplyDraft,
} from '../utils/mateApplyDraft';
import { mateMobileBarClass } from '../utils/mateFlowUi';
import { validateMateApplyMessage } from '../utils/mateValidation';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';

const MateApplyTicketVerificationPanel = lazy(() => import('./MateApplyTicketVerificationPanel'));

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[16px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SectionDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-gray-200 dark:bg-border ${className}`} aria-hidden="true" />;
}

export default function MateApply() {
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const { logout } = useAuthAccessActions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const restoredDraftPartyIdRef = useRef<string | null>(null);
  const previousPartyIdRef = useRef<string | null>(null);

  const redirectToLogin = (replace = false) => {
    logout(true);
    navigate(buildLoginPath(getCurrentRelativeUrl()), replace ? { replace: true } : undefined);
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    if (previousPartyIdRef.current && previousPartyIdRef.current !== id) {
      clearMateApplyDraft(previousPartyIdRef.current);
    }

    previousPartyIdRef.current = id;
  }, [id]);

  useEffect(() => {
    setIsDraftHydrated(false);
    setMessage('');
    setTicketVerified(false);
    setTicketInfo(null);

    if (!id) {
      restoredDraftPartyIdRef.current = null;
      setIsDraftHydrated(true);
      return;
    }

    const draft = loadMateApplyDraft(id);
    if (!draft) {
      restoredDraftPartyIdRef.current = null;
      setIsDraftHydrated(true);
      return;
    }

    setMessage(draft.message);
    setTicketVerified(draft.ticketVerified);
    setTicketInfo(draft.ticketInfo);

    if (restoredDraftPartyIdRef.current !== id) {
      restoredDraftPartyIdRef.current = id;
      toast.info('이전 신청 내용을 복원했습니다. 필요한 정보만 다시 확인해주세요.');
    }

    setIsDraftHydrated(true);
  }, [id]);

  useEffect(() => {
    if (!id || !isDraftHydrated) {
      return;
    }

    saveMateApplyDraft(id, {
      message,
      ticketVerified,
      ticketInfo,
    });
  }, [id, isDraftHydrated, message, ticketInfo, ticketVerified]);

  if (isAuthLoading || (isPartyLoading && !party)) {
    return <LoadingSpinner text="파티 정보를 불러오는 중입니다..." fullScreen />;
  }

  if (partyError || !party) {
    return (
      <div className="flex justify-center items-center h-screen bg-background dark:bg-background transition-colors duration-200">
        <OptimizedImage
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
        />
        <div className="text-center z-10">
          <p className="text-lg text-gray-600 dark:text-white mb-4">{partyError || '파티 정보를 불러오는 중입니다...'}</p>
          <Button onClick={() => navigate('/mate')} variant="outline" className="dark:bg-card dark:text-white dark:border-border dark:hover:bg-gray-700">
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isSelling = party.status === 'SELLING';
  const reservationDepositAmount = party.reservationDepositAmount || 0;
  const ticketAmount = party.ticketPrice || 0;
  const sellingPrice = party.price || 0;
  const sectionCardClass = 'border border-gray-200/80 bg-white shadow-md ring-1 ring-black/5 dark:border-border/80 dark:bg-card/90 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] dark:ring-white/10';
  const insetPanelClass = 'rounded-2xl border border-gray-200/80 bg-gray-50/90 dark:border-border/70 dark:bg-secondary/70';
  const primaryAmount = isSelling ? sellingPrice : (reservationDepositAmount > 0 ? reservationDepositAmount : ticketAmount);
  const submitLabel = isSubmitting
    ? '신청 중...'
    : (isSelling ? '직거래 신청하기' : '참여 신청하기');
  const flowBadgeLabel = '직거래 베타';
  const flowDescription = isSelling
    ? '구매 신청 후 호스트 승인 시 채팅으로 직거래 시간과 장소를 조율합니다.'
    : '호스트에게 메시지를 보내고, 승인 후 채팅으로 직거래 및 관람 일정을 조율합니다.';
  const policyHighlights = [
    '현재 베타에서는 앱 내 결제를 제공하지 않습니다.',
    '승인 후 채팅에서 거래 시간과 장소를 조율합니다.',
    '플랫폼 결제/환불 없이 신청 취소만 처리됩니다.',
  ];
  const nextSteps = isSelling
    ? [
      '구매 신청 후 호스트 승인 여부를 기다립니다.',
      '승인되면 상세페이지 또는 채팅방에서 거래 일정을 조율합니다.',
      '경기 당일에는 체크인 또는 전달 상태를 다시 확인하세요.',
    ]
    : [
      '메시지와 티켓 인증(선택)을 제출합니다.',
      '호스트 승인 후 채팅방이 열리고 일정 조율이 시작됩니다.',
      '직거래 베타에서는 채팅에서 직접 만남 장소를 확정합니다.',
    ];
  const isSubmitReady = isSelling || message.length >= 10;
  const summaryAmountLabel = isSelling ? '구매 신청 금액' : (reservationDepositAmount > 0 ? '예약금' : '거래 기준 금액');
  const summaryTrustLabel = party.ticketVerified ? '호스트 티켓 인증' : '티켓 인증 확인 전';
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);

  const handleSubmit = async () => {
    if (!currentUserId) {
      redirectToLogin();
      return;
    }

    if (!isSelling) {
      const validationError = validateMateApplyMessage(message);
      if (validationError) {
        toast.warning(validationError);
        return;
      }
    }

    setIsSubmitting(true);

    const applyMessage = message || (isSelling ? '티켓 구매 신청합니다.' : '함께 즐거운 관람 부탁드립니다!');

    try {
      if (isSelling && primaryAmount <= 0) {
        throw new Error('판매 가격 정보가 올바르지 않습니다.');
      }

      const createdApplication = await createApplication({
        partyId: party.id,
        message: applyMessage,
        verificationToken: isSelling ? null : ticketInfo?.verificationToken ?? null,
        ticketVerified: isSelling ? false : ticketVerified,
        ticketImageUrl: null,
      });

      if (id) {
        clearMateApplyDraft(id);
      }
      setMatePartyMyApplicationQueryData(queryClient, party.id, currentUserId, createdApplication);
      updateMatePartyApplicationsQueryData(queryClient, party.id, (applications) => (
        applications.some((application) => application.id === createdApplication.id)
          ? applications
          : [createdApplication, ...applications]
      ));
      toast.success(isSelling
        ? '구매 신청이 접수되었습니다. 호스트 승인 후 직거래로 진행됩니다.'
        : '참여 신청이 접수되었습니다.');
      navigate(`/mate/${party.id}`);
    } catch (error: unknown) {
      const status = getApiErrorStatus(error);

      if (status === 401) {
        redirectToLogin();
        return;
      }

      if (status === 403) {
        setShowVerificationDialog(true);
      } else {
        console.error('신청 처리 오류:', error);
        toast.error(getApiErrorMessage(error, '신청 처리 중 오류가 발생했습니다.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-background transition-colors duration-200">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.08),_transparent_58%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_46%)]" />
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 pb-44 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
        <Button
          variant="ghost"
          onClick={() => {
            if (id) {
              clearMateApplyDraft(id);
            }
            navigate(`/mate/${id}`);
          }}
          className="mb-3 -ml-2 sm:mb-4"
        >
          <MateChevronLeftIcon className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <div className="mb-6 sm:mb-8">
          <MatePill className="border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10">
            {flowBadgeLabel}
          </MatePill>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-primary sm:text-3xl">
            {isSelling ? '티켓 구매' : '파티 참여 신청'}
          </h1>
          <p className="mt-2 max-w-2xl text-[16px] text-gray-600 dark:text-white sm:text-base">
            {flowDescription}
          </p>
        </div>
        {isPartyRevalidating && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-[16px]">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        <Card className={`mb-6 p-5 sm:p-6 ${sectionCardClass}`}>
          <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/90 px-3 py-3 dark:border-border/70 dark:bg-secondary/70 sm:w-auto sm:gap-3 sm:px-4">
                <div className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                  <TeamLogo teamId={party.homeTeam} size="full" />
                </div>
                <span className="text-base font-black italic text-primary sm:text-lg">VS</span>
                <div className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                  <TeamLogo teamId={party.awayTeam} size="full" />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black leading-tight text-primary sm:text-lg">
                  {stadiumDisplayName}
                </h3>
                <p className="mt-1 text-[16px] text-gray-600 dark:text-white">
                  {formatGameDate(party.gameDate)} {party.gameTime.substring(0, 5)}
                </p>
              </div>
            </div>
            <div className="w-full rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-left dark:border-primary/20 dark:bg-primary/10 sm:w-auto sm:min-w-[170px] sm:text-right">
              <div className="flex items-center justify-between gap-4 sm:block">
                <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-white">
                  {summaryAmountLabel}
                </p>
                <p className="text-xl font-black text-primary sm:mt-2 sm:text-2xl">
                  {primaryAmount.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
            <div className={`${insetPanelClass} col-span-2 p-3 md:col-span-1`}>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">좌석</p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white line-clamp-2">{party.section}</p>
            </div>
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">호스트</p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white">{party.hostName}</p>
            </div>
            <div className={`${insetPanelClass} col-span-2 p-3 md:col-span-1`}>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">신뢰 신호</p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white">{summaryTrustLabel}</p>
            </div>
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">현재 상태</p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white">{isSelling ? '구매 신청 가능' : '참여 신청 가능'}</p>
            </div>
          </div>
        </Card>

        {!isSelling && (
          <Card className={`mb-6 p-5 sm:p-6 ${sectionCardClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <MateMessageSquareIcon className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">소개 메시지</h3>
            </div>
            <p className="mb-4 text-[16px] text-gray-500 dark:text-white">
              승인 여부를 판단하는 핵심 정보입니다. 관람 스타일과 거래 조율 의사를 간단히 적어주세요.
            </p>
            <label htmlFor="message" className="mb-2 block text-[16px] font-semibold text-gray-900 dark:text-white">
              호스트에게 전달할 메시지
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="자기소개와 함께 야구를 즐기고 싶은 마음을 전해주세요..."
              className="min-h-[120px] mb-2 border-gray-200 bg-white dark:border-border dark:bg-card/70"
              maxLength={200}
            />
            <p className="text-[16px] text-gray-500 dark:text-white">
              {message.length}/200
            </p>
          </Card>
        )}

        {!isSelling && (
          <Card className={`mb-6 p-5 sm:p-6 ${sectionCardClass}`}>
            <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted/70" />}>
              <MateApplyTicketVerificationPanel
                gameDate={party.gameDate}
                ticketVerified={ticketVerified}
                ticketInfo={ticketInfo}
                onVerified={(nextTicketInfo) => {
                  setTicketInfo(nextTicketInfo);
                  setTicketVerified(Boolean(nextTicketInfo.verificationToken));
                }}
                onReset={() => {
                  setTicketVerified(false);
                  setTicketInfo(null);
                }}
              />
            </Suspense>
          </Card>
        )}

          <Card className={`mb-6 p-5 sm:p-6 ${sectionCardClass}`}>
          <div className="flex items-center gap-2 mb-4">
            <MateWalletIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-primary">거래 기준 금액</h3>
          </div>

          <div className={`${insetPanelClass} p-4 sm:p-5`}>
            {!isSelling && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-white">티켓 가격</span>
                  <span className="text-gray-900 dark:text-white">
                    {ticketAmount.toLocaleString()}원
                  </span>
                </div>
                <SectionDivider />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">
                    거래 기준 금액
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {ticketAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            {isSelling && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-white">티켓 판매가</span>
                <span className="text-lg font-bold text-primary">
                  {sellingPrice.toLocaleString()}원
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className={`${insetPanelClass} p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <MateShieldIcon className="w-4 h-4 text-primary" />
                <h4 className="text-[16px] font-bold text-gray-900 dark:text-white">정책 안내</h4>
              </div>
              <ul className="space-y-2 text-[16px] text-gray-600 dark:text-white">
                {policyHighlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${insetPanelClass} p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <MateAlertTriangleIcon className="w-4 h-4 text-primary" />
                <h4 className="text-[16px] font-bold text-gray-900 dark:text-white">다음 단계</h4>
              </div>
              <ul className="space-y-2 text-[16px] text-gray-600 dark:text-white">
                {nextSteps.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 hidden lg:block">
            <Button
              onClick={handleSubmit}
              disabled={!isSubmitReady || isSubmitting}
              className="w-full bg-primary text-white"
              size="lg"
            >
              {submitLabel}
            </Button>

            {!isSelling && !isSubmitReady && (
              <p className="mt-2 text-center text-[16px] text-gray-500 dark:text-white">
                메시지를 10자 이상 입력해주세요
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className={`${mateMobileBarClass} lg:hidden`}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1 basis-[180px]">
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              {summaryAmountLabel}
            </p>
            <p className="mt-1 text-lg font-black text-primary">
              {primaryAmount.toLocaleString()}원
            </p>
            {!isSelling && !isSubmitReady && (
              <p className="mt-1 text-[16px] text-gray-500 dark:text-white">
                메시지를 10자 이상 입력해주세요
              </p>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!isSubmitReady || isSubmitting}
            className="w-full bg-primary text-white sm:w-auto sm:min-w-[150px]"
            size="lg"
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      <VerificationRequiredDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
      />
    </div>
  );
}
