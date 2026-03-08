import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ChevronLeft, MessageSquare, CreditCard, Shield, AlertTriangle, Ticket, CheckCircle, Loader2 } from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import { useAuthStore } from '../store/authStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { useNavigate, useParams } from 'react-router-dom';
import { useMatePartyFromRoute } from '../hooks/useMatePartyFromRoute';
import { api, ApiError } from '../utils/api';
import { formatGameDate } from '../utils/mate';
import { DEPOSIT_AMOUNT } from '../utils/constants';
import { isCompatibleFlowAndPaymentType, savePendingPayment } from '../utils/payment';
import { isTossTestMode } from '../utils/paymentMode';
import {
  getMateApplyAmountSectionTitle,
  getMateApplySummaryAmountLabel,
  resolveDirectTradeApplicationSnapshot,
} from '../utils/directTradePolicy';
import VerificationRequiredDialog from './VerificationRequiredDialog';
import { analyzeTicket, TicketInfo } from '../api/ticket';
import { getApiErrorMessage } from '../utils/errorUtils';
import { AxiosError } from 'axios';
import LoadingSpinner from './LoadingSpinner';

const sanitizeUserFacingMessage = (message: string, fallback: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return fallback;
  }
  if (/^[a-z0-9_:-]+$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
};

export default function MateApply() {
  const { validateMessage } = useMateStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    party: selectedParty,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
      return;
    }

    const fetchUser = async () => {
      try {
        const userData = await api.getCurrentUser();
        setCurrentUserId(userData.data.id);
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        toast.error('사용자 정보를 불러오지 못했습니다.');
      }
    };

    void fetchUser();
  }, [user?.id]);

  if (isPartyLoading && !selectedParty) {
    return <LoadingSpinner text="파티 정보를 불러오는 중입니다..." fullScreen />;
  }

  if (partyError || !selectedParty) {
    return (
      <div className="flex justify-center items-center h-screen bg-background dark:bg-background transition-colors duration-200">
        <OptimizedImage
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
        />
        <div className="text-center z-10">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">{partyError || '파티 정보를 불러오는 중입니다...'}</p>
          <Button onClick={() => navigate('/mate')} variant="outline" className="dark:bg-card dark:text-gray-200 dark:border-border dark:hover:bg-gray-700">
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isSelling = selectedParty.status === 'SELLING';
  const tossTestMode = isTossTestMode();
  const ticketAmount = selectedParty.ticketPrice || 0;
  const totalAmount = ticketAmount + DEPOSIT_AMOUNT;
  const sellingPrice = selectedParty.price || 0;
  const sectionCardClass = 'border border-gray-200/80 bg-white shadow-md ring-1 ring-black/5 dark:border-border/80 dark:bg-card/90 dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] dark:ring-white/10';
  const insetPanelClass = 'rounded-2xl border border-gray-200/80 bg-gray-50/90 dark:border-border/70 dark:bg-secondary/70';
  const primaryAmount = tossTestMode
    ? (isSelling ? sellingPrice : totalAmount)
    : (isSelling ? sellingPrice : ticketAmount);
  const submitLabel = isSubmitting
    ? '신청 중...'
    : tossTestMode
      ? (isSelling
        ? `${sellingPrice.toLocaleString()}원 결제하기`
        : `${totalAmount.toLocaleString()}원 결제하기`)
      : (isSelling ? '직거래 신청하기' : '참여 신청하기');
  const flowBadgeLabel = tossTestMode
    ? (isSelling ? '판매 티켓 구매' : '안전결제/보증금 모드')
    : '직거래 베타';
  const flowDescription = isSelling
    ? (tossTestMode
      ? '결제 후 호스트 승인 대기 상태로 전환되며, 이후 진행 상황은 상세페이지에서 확인할 수 있습니다.'
      : '구매 신청 후 호스트 승인 시 채팅으로 직거래 시간과 장소를 조율합니다.')
    : (tossTestMode
      ? '메시지와 인증 정보를 확인한 뒤 결제를 진행하면, 호스트 승인 후 참여가 확정됩니다.'
      : '호스트에게 메시지를 보내고, 승인 후 채팅으로 직거래 및 관람 일정을 조율합니다.');
  const policyHighlights = tossTestMode
    ? [
      '승인 즉시 정산 요청이 생성됩니다.',
      '단순변심 취소에는 10% 수수료가 적용됩니다.',
      '승인되지 않으면 전액 환불됩니다.',
    ]
    : [
      '현재 베타에서는 앱 내 결제를 제공하지 않습니다.',
      '승인 후 채팅에서 거래 시간과 장소를 조율합니다.',
      '플랫폼 결제/환불 없이 신청 취소만 처리됩니다.',
    ];
  const nextSteps = isSelling
    ? [
      tossTestMode ? '결제 후 호스트 승인 여부를 기다립니다.' : '구매 신청 후 호스트 승인 여부를 기다립니다.',
      '승인되면 상세페이지 또는 채팅방에서 거래 일정을 조율합니다.',
      '경기 당일에는 체크인 또는 전달 상태를 다시 확인하세요.',
    ]
    : [
      '메시지와 티켓 인증(선택)을 제출합니다.',
      '호스트 승인 후 채팅방이 열리고 일정 조율이 시작됩니다.',
      tossTestMode ? '보증금/결제 정책은 승인 이후 상태에 맞춰 적용됩니다.' : '직거래 베타에서는 채팅에서 직접 만남 장소를 확정합니다.',
    ];
  const isSubmitReady = isSelling || message.length >= 10;
  const summaryAmountLabel = tossTestMode
    ? getMateApplySummaryAmountLabel(true)
    : (isSelling ? '구매 신청 금액' : '거래 기준 금액');
  const summaryTrustLabel = selectedParty.ticketVerified ? '호스트 티켓 인증' : '티켓 인증 확인 전';

  // 티켓 인증 핸들러
  const handleTicketUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsScanning(true);
    try {
      const result = await analyzeTicket(file);
      setTicketInfo(result);

      // Only mark as verified if server issued a verification token
      // (requires meaningful OCR data: date or stadium extracted)
      if (result.verificationToken) {
        setTicketVerified(true);

        // 경기 정보 매치 경고
        if (result.date && result.date !== selectedParty.gameDate) {
          toast.warning('티켓의 날짜가 파티의 경기 날짜와 다릅니다. 확인해주세요.');
        }

        toast.success('티켓 인증이 완료되었습니다! 🎫');
      } else {
        toast.warning('티켓에서 충분한 정보를 추출하지 못했습니다. 더 선명한 사진으로 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Ticket OCR error:', error);
      const fallbackMessage = '티켓 분석에 실패했습니다. 다시 시도해주세요.';
      toast.error(
        sanitizeUserFacingMessage(getApiErrorMessage(error, fallbackMessage), fallbackMessage)
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!isSelling) {
      const validationError = validateMessage(message);
      if (validationError) {
        toast.warning(validationError);
        return;
      }
    }

    setIsSubmitting(true);

    const applyMessage = message || (isSelling ? '티켓 구매 신청합니다.' : '함께 즐거운 관람 부탁드립니다!');
    const directTradeSnapshot = resolveDirectTradeApplicationSnapshot({
      isSelling,
      sellingPrice,
      ticketPrice: ticketAmount,
    });

    try {
      if (!tossTestMode) {
        if (isSelling && directTradeSnapshot.amount <= 0) {
          throw new Error('판매 가격 정보가 올바르지 않습니다.');
        }

        await api.createApplication({
          partyId: selectedParty.id,
          message: applyMessage,
          depositAmount: directTradeSnapshot.amount,
          paymentType: directTradeSnapshot.paymentType,
          verificationToken: isSelling ? null : ticketInfo?.verificationToken ?? null,
          ticketVerified: isSelling ? false : ticketVerified,
          ticketImageUrl: null,
        });

        toast.success(isSelling
          ? '구매 신청이 접수되었습니다. 호스트 승인 후 직거래로 진행됩니다.'
          : '참여 신청이 접수되었습니다.');
        navigate(`/mate/${selectedParty.id}`);
        return;
      }

      const preparedPayment = await api.prepareTossPayment({
        partyId: selectedParty.id,
        flowType: isSelling ? 'SELLING_FULL' : 'DEPOSIT',
        cancelPolicyVersion: 'v1',
      });
      if (!isCompatibleFlowAndPaymentType(preparedPayment.flowType, preparedPayment.paymentType)) {
        throw new Error('결제 흐름과 결제 타입이 일치하지 않습니다.');
      }

      savePendingPayment({
        intentId: preparedPayment.intentId,
        partyId: selectedParty.id,
        flowType: preparedPayment.flowType,
        policyVersion: preparedPayment.cancelPolicyVersion,
        priceSnapshot: preparedPayment.amount,
        message: applyMessage,
        verificationToken: isSelling ? null : ticketInfo?.verificationToken ?? null,
        ticketVerified: isSelling ? false : ticketVerified,
        ticketImageUrl: null,
        paymentType: preparedPayment.paymentType,
        amount: preparedPayment.amount,
        orderId: preparedPayment.orderId,
        orderName: preparedPayment.orderName,
      });

      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: String(currentUserId) });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: preparedPayment.currency, value: preparedPayment.amount },
        orderId: preparedPayment.orderId,
        orderName: preparedPayment.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      // Toss가 브라우저를 리다이렉트 — 이후 코드는 실행되지 않음
    } catch (error: unknown) {
      if ((error instanceof AxiosError && error.response?.status === 403) ||
        (error instanceof ApiError && error.status === 403)) {
        setShowVerificationDialog(true);
      } else {
        console.error('결제 초기화 오류:', error);
        toast.error(getApiErrorMessage(error, '결제 중 오류가 발생했습니다.'));
      }
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36 lg:pb-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <div className="mb-8">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10">
            {flowBadgeLabel}
          </Badge>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-primary">
            {isSelling ? '티켓 구매' : '파티 참여 신청'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {flowDescription}
          </p>
        </div>
        {isPartyRevalidating && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        <Card className={`p-6 mb-6 ${sectionCardClass}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-gray-50/90 px-4 py-3 dark:border-border/70 dark:bg-secondary/70">
                <TeamLogo teamId={selectedParty.homeTeam} size="md" />
                <span className="text-lg font-black italic text-primary">VS</span>
                <TeamLogo teamId={selectedParty.awayTeam} size="md" />
              </div>
              <div>
                <h3 className="text-lg font-black text-primary">
                  {selectedParty.stadium}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatGameDate(selectedParty.gameDate)} {selectedParty.gameTime.substring(0, 5)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-right dark:border-primary/20 dark:bg-primary/10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                {summaryAmountLabel}
              </p>
              <p className="mt-2 text-2xl font-black text-primary">
                {primaryAmount.toLocaleString()}원
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">좌석</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{selectedParty.section}</p>
            </div>
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">호스트</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedParty.hostName}</p>
            </div>
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">신뢰 신호</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryTrustLabel}</p>
            </div>
            <div className={`${insetPanelClass} p-3`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">현재 상태</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{isSelling ? '구매 신청 가능' : '참여 신청 가능'}</p>
            </div>
          </div>
        </Card>

        {!isSelling && (
          <Card className={`p-6 mb-6 ${sectionCardClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">소개 메시지</h3>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-300">
              승인 여부를 판단하는 핵심 정보입니다. 관람 스타일과 거래 조율 의사를 간단히 적어주세요.
            </p>
            <Label htmlFor="message" className="mb-2 block">
              호스트에게 전달할 메시지
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="자기소개와 함께 야구를 즐기고 싶은 마음을 전해주세요..."
              className="min-h-[120px] mb-2 border-gray-200 bg-white dark:border-border dark:bg-card/70"
              maxLength={200}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {message.length}/200
            </p>
          </Card>
        )}

        {!isSelling && (
          <Card className={`p-6 mb-6 ${sectionCardClass}`}>
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">티켓 인증 (선택)</h3>
              {ticketVerified && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600 dark:bg-green-950/30 dark:text-green-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  인증 완료
                </span>
              )}
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-300">
              티켓 사진을 올리면 호스트에게 인증 배지가 표시되어 승인율이 높아집니다.
            </p>

            {ticketVerified ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">티켓 인증 완료</span>
                  </div>
                  {ticketInfo && (
                    <div className="space-y-1 text-sm text-green-600">
                      {ticketInfo.date && <p>📅 {ticketInfo.date}</p>}
                      {ticketInfo.stadium && <p>🏟️ {ticketInfo.stadium}</p>}
                      {(ticketInfo.section || ticketInfo.row || ticketInfo.seat) && (
                        <p>💺 {[ticketInfo.section, ticketInfo.row, ticketInfo.seat].filter(Boolean).join(' ')}</p>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className="text-sm text-gray-500 dark:text-gray-300"
                  onClick={() => { setTicketVerified(false); setTicketInfo(null); }}
                >
                  다시 인증하기
                </Button>
              </div>
            ) : (
              <div
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${isScanning
                  ? 'border-primary bg-slate-50 dark:bg-card/60'
                  : 'border-slate-300 dark:border-border hover:border-primary hover:bg-slate-50 dark:hover:bg-secondary'
                  }`}
              >
                <input
                  type="file"
                  id="ticketVerifyFile"
                  accept="image/*"
                  onChange={handleTicketUpload}
                  className="hidden"
                  disabled={isScanning}
                />
                <label htmlFor="ticketVerifyFile" className={`block cursor-pointer ${isScanning ? 'pointer-events-none' : ''}`}>
                  {isScanning ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="font-medium text-primary">AI가 티켓을 분석 중...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Ticket className="w-10 h-10 text-primary" />
                      <p className="font-medium text-primary">티켓 사진 업로드</p>
                      <p className="text-xs text-gray-400">JPG, PNG (최대 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </Card>
        )}

        <Card className={`p-6 mb-6 ${sectionCardClass}`}>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-primary">{getMateApplyAmountSectionTitle(tossTestMode)}</h3>
          </div>

          <div className={`${insetPanelClass} p-4`}>
            {!isSelling && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">티켓 가격</span>
                  <span className="text-gray-900 dark:text-white">
                    {ticketAmount.toLocaleString()}원
                  </span>
                </div>
                {tossTestMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">노쇼 방지 보증금</span>
                    <span className="text-gray-900 dark:text-white">
                      {DEPOSIT_AMOUNT.toLocaleString()}원
                    </span>
                  </div>
                )}
                <Separator className="bg-gray-200 dark:bg-border" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {getMateApplySummaryAmountLabel(tossTestMode)}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {(tossTestMode ? totalAmount : ticketAmount).toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            {isSelling && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">티켓 판매가</span>
                <span className="text-lg font-bold text-primary">
                  {sellingPrice.toLocaleString()}원
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className={`${insetPanelClass} p-4`}>
              <div className="mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">정책 안내</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
                <AlertTriangle className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">다음 단계</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                메시지를 10자 이상 입력해주세요
              </p>
            )}
          </div>
        </Card>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/90 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-border dark:bg-card/95 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              {summaryAmountLabel}
            </p>
            <p className="mt-1 truncate text-lg font-black text-primary">
              {primaryAmount.toLocaleString()}원
            </p>
            {!isSelling && !isSubmitReady && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                메시지를 10자 이상 입력해주세요
              </p>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!isSubmitReady || isSubmitting}
            className="min-w-[150px] bg-primary text-white"
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
