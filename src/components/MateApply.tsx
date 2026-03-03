import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
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
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <h1 className="mb-2 text-primary">
          {isSelling ? '티켓 구매' : '파티 참여 신청'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isSelling
            ? (tossTestMode
              ? '결제 정보를 입력하고 티켓을 구매하세요'
              : '신청 후 호스트 승인 시 직거래로 진행됩니다')
            : (tossTestMode
              ? '호스트에게 전달할 메시지를 작성해주세요'
              : '신청 후 호스트와 직거래로 관람을 조율합니다')}
        </p>
        {isPartyRevalidating && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Party Summary */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <TeamLogo teamId={selectedParty.teamId} size="md" />
            <div className="flex-1">
              <h3 className="mb-1 text-primary">
                {selectedParty.stadium}
              </h3>
              <p className="text-sm text-gray-600">
                {formatGameDate(selectedParty.gameDate)} {selectedParty.gameTime.substring(0, 5)}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">좌석</p>
              <p>{selectedParty.section}</p>
            </div>
            <div>
              <p className="text-gray-500">호스트</p>
              <p>{selectedParty.hostName}</p>
            </div>
          </div>
        </Card>

        {/* Message Section */}
        {!isSelling && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="text-primary">소개 메시지</h3>
            </div>
            <Label htmlFor="message" className="mb-2 block">
              호스트에게 전달할 메시지
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="자기소개와 함께 야구를 즐기고 싶은 마음을 전해주세요..."
              className="min-h-[120px] mb-2"
              maxLength={200}
            />
            <p className="text-sm text-gray-500">
              {message.length}/200
            </p>
          </Card>
        )}

        {/* Ticket Verification Section (선택) */}
        {!isSelling && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-primary" />
              <h3 className="text-primary">티켓 인증 (선택)</h3>
              {ticketVerified && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" />
                  인증 완료
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              티켓 사진을 올리면 호스트에게 인증 배지가 표시되어 승인율이 높아집니다.
            </p>

            {ticketVerified ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">티켓 인증 완료</span>
                  </div>
                  {ticketInfo && (
                    <div className="text-sm text-green-600 space-y-1">
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
                  className="text-sm text-gray-500"
                  onClick={() => { setTicketVerified(false); setTicketInfo(null); }}
                >
                  다시 인증하기
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isScanning
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
                <label htmlFor="ticketVerifyFile" className={`cursor-pointer block ${isScanning ? 'pointer-events-none' : ''}`}>
                  {isScanning ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-primary font-medium">AI가 티켓을 분석 중...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Ticket className="w-10 h-10 text-primary" />
                      <p className="text-primary font-medium">티켓 사진 업로드</p>
                      <p className="text-xs text-gray-400">JPG, PNG (최대 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </Card>
        )}

        {/* Payment Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="text-primary">{getMateApplyAmountSectionTitle(tossTestMode)}</h3>
          </div>

          {!isSelling && (
            <>
              <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-700">티켓 가격</span>
                  <span className="text-gray-900">
                    {ticketAmount.toLocaleString()}원
                  </span>
                </div>
                {tossTestMode && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">노쇼 방지 보증금</span>
                    <span className="text-gray-900">
                      {DEPOSIT_AMOUNT.toLocaleString()}원
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-900" style={{ fontWeight: 'bold' }}>
                    {getMateApplySummaryAmountLabel(tossTestMode)}
                  </span>
                  <span className="text-lg text-primary font-bold">
                    {(tossTestMode ? totalAmount : ticketAmount).toLocaleString()}원
                  </span>
                </div>
              </div>

              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  {tossTestMode ? (
                    <ul className="list-disc list-inside space-y-1">
                      <li>승인 즉시 정산 요청이 생성됩니다</li>
                      <li>단순변심 취소에만 10% 수수료가 적용됩니다</li>
                      <li>단순변심 취소 시 수수료가 차감 환불됩니다</li>
                      <li>승인되지 않으면 전액 환불됩니다</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      <li>현재 베타에서는 앱 내 결제를 제공하지 않습니다</li>
                      <li>신청 승인 후 채팅을 통해 직거래로 진행됩니다</li>
                      <li>플랫폼 결제/환불 없이 취소만 처리됩니다</li>
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            </>
          )}

          {isSelling && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-orange-700">티켓 판매가</span>
                <span className="text-lg text-orange-900" style={{ fontWeight: 'bold' }}>
                  {sellingPrice.toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Security Notice */}
        <Alert className="mb-6">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{tossTestMode ? '결제는 BEGA 안전거래를 통해 진행됩니다' : '현재는 승인 후 채팅으로 직거래 조율을 안내합니다'}</li>
              <li>호스트 승인 후 채팅으로 소통할 수 있습니다</li>
              <li>노쇼 시 패널티가 부여될 수 있습니다</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Warning for selling tickets */}
        {isSelling && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {tossTestMode
                ? '단순변심 취소 시 수수료 차감 환불 정책이 적용됩니다.'
                : '직거래 모드에서는 플랫폼 결제/환불 없이 신청 취소만 처리됩니다.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={(!isSelling && message.length < 10) || isSubmitting}
          className="w-full text-white bg-primary"
          size="lg"
        >
          {isSubmitting
            ? '신청 중...'
            : tossTestMode
              ? (isSelling
                ? `${sellingPrice.toLocaleString()}원 결제하기`
                : `${totalAmount.toLocaleString()}원 결제하기`)
              : (isSelling ? '직거래 신청하기' : '참여 신청하기')}
        </Button>

        {!isSelling && message.length < 10 && (
          <p className="text-sm text-gray-500 text-center mt-2">
            메시지를 10자 이상 입력해주세요
          </p>
        )}
      </div>

      <VerificationRequiredDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
      />
    </div>
  );
}
