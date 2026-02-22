import type { PaymentFlowType } from '../types/mate';

/**
 * Toss Payments 결제 흐름 관련 유틸리티
 * - prepare 응답 기반 결제 데이터 임시 저장 (sessionStorage)
 */

const PAYMENT_SESSION_KEY = 'toss_payment_pending';
const MATE_ORDER_ID_PATTERN = /^MATE-\d+-\d+-\d{13,}$/;

export interface PendingPaymentData {
  intentId?: number;
  partyId: number;
  flowType: PaymentFlowType;
  policyVersion?: string;
  priceSnapshot?: number;
  message: string;
  verificationToken?: string | null;
  ticketVerified: boolean;
  ticketImageUrl: string | null;
  paymentType: 'DEPOSIT' | 'FULL';
  amount: number;
  orderId: string;
  orderName: string;
}

export const isValidMateOrderId = (orderId: string | null | undefined): orderId is string =>
  typeof orderId === 'string' && MATE_ORDER_ID_PATTERN.test(orderId);

export const isCompatibleFlowAndPaymentType = (
  flowType: PaymentFlowType,
  paymentType: PendingPaymentData['paymentType'],
): boolean => {
  if (flowType === 'SELLING_FULL') {
    return paymentType === 'FULL';
  }
  return paymentType === 'DEPOSIT';
};

export const isPendingPaymentSessionValid = (
  pending: PendingPaymentData | null,
  callbackOrderId: string | null | undefined,
): pending is PendingPaymentData => {
  if (!pending || !isValidMateOrderId(callbackOrderId)) {
    return false;
  }
  if (!isValidMateOrderId(pending.orderId)) {
    return false;
  }
  if (pending.orderId !== callbackOrderId) {
    return false;
  }
  if (pending.partyId <= 0 || pending.amount <= 0) {
    return false;
  }
  return isCompatibleFlowAndPaymentType(pending.flowType, pending.paymentType);
};

/** 결제 리다이렉트 전 신청 데이터를 sessionStorage에 저장 */
export const savePendingPayment = (data: PendingPaymentData): void => {
  sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(data));
};

/** sessionStorage에서 결제 전 신청 데이터 복원 */
export const loadPendingPayment = (): PendingPaymentData | null => {
  const raw = sessionStorage.getItem(PAYMENT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPaymentData;
  } catch {
    return null;
  }
};

/** 결제 완료 또는 실패 후 임시 데이터 삭제 */
export const clearPendingPayment = (): void => {
  sessionStorage.removeItem(PAYMENT_SESSION_KEY);
};
