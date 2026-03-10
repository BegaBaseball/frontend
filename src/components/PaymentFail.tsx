import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, AlertCircle } from 'lucide-react';
import { clearPendingPayment, loadPendingPayment } from '../utils/payment';
import { isDirectTradeMode } from '../utils/paymentMode';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

/**
 * Toss 에러 코드별 한국어 안내 메시지.
 * 공식 문서 기준: https://docs.tosspayments.com/reference/error-codes
 */
const TOSS_ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: '결제를 취소하셨습니다. 필요하시면 다시 시도해주세요.',
  PAY_PROCESS_ABORTED: '결제 도중 오류가 발생해 중단되었습니다. 잠시 후 다시 시도해주세요.',
  REJECT_CARD_COMPANY: '카드사에서 결제를 거절했습니다. 다른 카드를 사용하거나 카드사에 문의해주세요.',
  INVALID_CARD_EXPIRATION: '카드 유효기간이 올바르지 않습니다. 확인 후 다시 시도해주세요.',
  INVALID_STOPPED_CARD: '정지된 카드입니다. 다른 카드를 사용해주세요.',
  EXCEED_MAX_DAILY_PAYMENT_COUNT: '오늘 결제 가능 횟수를 초과했습니다. 내일 다시 시도해주세요.',
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_COMPANY: '해당 카드는 할부를 지원하지 않습니다.',
  EXCEED_MAX_PAYMENT_AMOUNT: '결제 한도를 초과했습니다. 한도 조정 후 다시 시도해주세요.',
  INVALID_CARD_LOST_OR_STOLEN: '분실 또는 도난 신고된 카드입니다. 카드사에 문의해주세요.',
  INVALID_CARD_NUMBER: '카드 번호가 올바르지 않습니다. 확인 후 다시 시도해주세요.',
  INVALID_CARD_INSTALLMENT_PLAN: '할부 개월 수가 올바르지 않습니다.',
  NOT_ENOUGH_STOCK: '잔여 수량이 부족합니다.',
  PROVIDER_ERROR: '결제 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  FAILED_INTERNAL_SYSTEM_PROCESSING: '내부 시스템 오류가 발생했습니다. 고객센터에 문의해주세요.',
  UNKNOWN_PAYMENT_ERROR: '알 수 없는 결제 오류가 발생했습니다. 고객센터에 문의해주세요.',
};

const getKoreanErrorMessage = (code: string | null, fallback: string | null): string => {
  if (code && Object.prototype.hasOwnProperty.call(TOSS_ERROR_MESSAGES, code)) {
    return TOSS_ERROR_MESSAGES[code];
  }
  return fallback ?? '결제가 취소되었거나 오류가 발생했습니다.';
};

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const directTradeMode = isDirectTradeMode();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  // partyId를 state에 저장해 세션 정리 후에도 "다시 시도" 버튼에서 사용 가능하게 함.
  const [retryPartyId, setRetryPartyId] = useState<number | null>(null);

  useEffect(() => {
    const pending = loadPendingPayment();
    if (!pending) return;

    // 결제 모드: orderId가 일치할 때만 세션 정리.
    // 직거래 모드: 남아있는 세션을 항상 정리.
    if (directTradeMode || pending.orderId === orderId) {
      setRetryPartyId(pending.partyId);
      clearPendingPayment();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayMessage = directTradeMode
    ? '직거래 모드에서는 앱 내 결제 실패 화면을 사용하지 않습니다. 신청 화면에서 다시 진행해주세요.'
    : getKoreanErrorMessage(code, message);

  const handleRetry = () => {
    if (retryPartyId) {
      navigate(`/mate/${retryPartyId}/apply`);
    } else {
      navigate('/mate');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          {directTradeMode ? (
            <AlertCircle className="w-12 h-12 text-blue-500" />
          ) : (
            <XCircle className="w-12 h-12 text-red-500" />
          )}

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {directTradeMode ? '직거래 모드 안내' : '결제에 실패했습니다'}
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center text-sm">{displayMessage}</p>

          {code && !directTradeMode && (
            <p className="text-xs text-gray-400 dark:text-gray-300 bg-gray-100 dark:bg-secondary/80 rounded px-2 py-1 font-mono">
              오류 코드: {code}
            </p>
          )}

          <div className="flex gap-3 mt-2 w-full">
            <Button className="flex-1" variant="outline" onClick={() => navigate('/mate')}>
              목록으로
            </Button>
            <Button className="flex-1" onClick={handleRetry}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
