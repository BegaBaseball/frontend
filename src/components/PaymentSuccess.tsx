import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { loadPendingPayment, clearPendingPayment, isPendingPaymentSessionValid, isValidMateOrderId } from '../utils/payment';
import type { Application } from '../types/mate';
import { getPaymentStatusLabel, getSettlementStatusLabel } from '../utils/paymentStatus';
import { isDirectTradeMode } from '../utils/paymentMode';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const directTradeMode = isDirectTradeMode();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [directTradePartyId, setDirectTradePartyId] = useState<number | null>(null);
  const [result, setResult] = useState<{
    partyId: number;
    policyVersion?: string;
    application: Application;
  } | null>(null);

  useEffect(() => {
    if (directTradeMode) {
      const pending = loadPendingPayment();
      if (pending) {
        setDirectTradePartyId(pending.partyId);
      }
      clearPendingPayment();
      setErrorMessage('직거래 모드에서는 결제 콜백을 사용하지 않습니다. 신청 화면에서 다시 진행해주세요.');
      setIsProcessing(false);
      return;
    }

    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');

    if (!paymentKey || !orderId) {
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      setIsProcessing(false);
      return;
    }
    if (!isValidMateOrderId(orderId)) {
      setErrorMessage('허용되지 않는 주문번호 형식입니다.');
      setIsProcessing(false);
      return;
    }

    const pending = loadPendingPayment();
    if (!isPendingPaymentSessionValid(pending, orderId)) {
      setErrorMessage('결제 세션을 찾을 수 없습니다. 다시 시도해주세요.');
      setIsProcessing(false);
      return;
    }

    const confirmPayment = async () => {
      try {
        const application = await api.confirmTossPayment({
          paymentKey,
          orderId,
          intentId: pending.intentId,
          flowType: pending.flowType,
          cancelPolicyVersion: pending.policyVersion,
          partyId: pending.partyId,
          message: pending.message,
          verificationToken: pending.verificationToken,
          ticketVerified: pending.ticketVerified,
          ticketImageUrl: pending.ticketImageUrl,
          paymentType: pending.paymentType,
        });

        clearPendingPayment();
        setResult({
          partyId: pending.partyId,
          policyVersion: pending.policyVersion,
          application,
        });
        setIsProcessing(false);
      } catch (error) {
        console.error('[PaymentSuccess] 결제 승인 오류:', error);
        clearPendingPayment();
        setErrorMessage('결제 승인 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
        setIsProcessing(false);
      }
    };

    void confirmPayment();
  }, [directTradeMode, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">결제를 처리하고 있습니다...</p>
      </div>
    );
  }

  if (directTradeMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-lg font-medium text-gray-800">직거래 모드 안내</p>
        <p className="text-gray-600 text-center">{errorMessage}</p>
        <div className="flex gap-3 mt-2">
          {directTradePartyId && (
            <button
              onClick={() => navigate(`/mate/${directTradePartyId}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              신청한 파티로 이동
            </button>
          )}
          <button
            onClick={() => navigate('/mate')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            메이트 목록으로
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const { application, partyId, policyVersion } = result;
    const paidAmount = application.depositAmount ?? 0;
    const feeAmount = application.feeAmount ?? 0;
    const netAmount = application.netSettlementAmount ?? paidAmount;
    const policyGuide = policyVersion === 'v1'
      ? '환불 규칙(v1): BUYER/SELLER_CHANGED_MIND는 수수료 차감 부분환불, 그 외 사유는 전액환불'
      : '환불 규칙은 취소 사유에 따라 전액 또는 부분 환불로 적용됩니다.';

    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">결제가 완료되었습니다</h1>
          <p className="text-sm text-gray-600">신청과 결제 상태가 서버에 반영되었습니다.</p>

          <div className="rounded-lg border bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">결제금액</span>
              <span className="font-medium">{paidAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">수수료</span>
              <span className="font-medium">{feeAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">순정산액</span>
              <span className="font-medium">{netAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">결제상태</span>
              <span className="font-medium">{getPaymentStatusLabel(application.paymentStatus)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">정산상태</span>
              <span className="font-medium">{getSettlementStatusLabel(application.settlementStatus)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">{policyGuide}</p>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/mate/${partyId}`)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              상세로 이동
            </button>
            <button
              onClick={() => navigate('/mate')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p className="text-red-600 text-lg font-medium">{errorMessage}</p>
      <button
        onClick={() => navigate('/mate')}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        메이트 목록으로
      </button>
    </div>
  );
}
