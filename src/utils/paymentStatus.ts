import type { Application } from '../types/mate';

type PaymentStatus = Application['paymentStatus'];
type SettlementStatus = Application['settlementStatus'];

const paymentStatusLabels: Record<NonNullable<PaymentStatus>, string> = {
  PAID: '결제 완료',
  REFUND_REQUESTED: '환불 요청',
  CANCELED: '환불 완료',
  REFUND_FAILED: '환불 실패',
};

const settlementStatusLabels: Record<NonNullable<SettlementStatus>, string> = {
  PENDING: '정산 대기',
  REQUESTED: '정산 요청',
  COMPLETED: '정산 완료',
  FAILED: '정산 실패',
  SKIPPED: '정산 스킵',
  REFUNDED_AFTER_SETTLEMENT: '정산 후 환불',
};

export const getPaymentStatusLabel = (status?: PaymentStatus): string => {
  if (!status) return '결제 완료';
  return paymentStatusLabels[status] ?? status;
};

export const getSettlementStatusLabel = (status?: SettlementStatus): string => {
  if (!status) return '정산 대기';
  return settlementStatusLabels[status] ?? status;
};

export const getRefundPolicyMessage = (
  refundPolicyApplied: string | undefined | null,
  refundAmount: number,
  feeCharged: number,
): string => {
  if (refundPolicyApplied === 'NO_PAYMENT') {
    return '결제 없이 신청만 취소되었습니다.';
  }

  if (refundPolicyApplied === 'PARTIAL_REFUND_WITH_FEE') {
    return `부분환불(수수료 차감): 수수료 ${feeCharged.toLocaleString()}원 차감 후 `
      + `환불금 ${refundAmount.toLocaleString()}원이 적용됩니다.`;
  }

  if (refundPolicyApplied === 'FULL_REFUND') {
    return `전액환불: 환불금 ${refundAmount.toLocaleString()}원이 적용됩니다.`;
  }

  return `환불금 ${refundAmount.toLocaleString()}원이 적용됩니다.`;
};
