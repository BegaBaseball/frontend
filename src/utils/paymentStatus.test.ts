import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPaymentStatusLabel,
  getRefundPolicyMessage,
  getSettlementStatusLabel,
} from './paymentStatus';

test('결제 상태 라벨 표준화', () => {
  assert.equal(getPaymentStatusLabel('PAID'), '결제 완료');
  assert.equal(getPaymentStatusLabel('REFUND_REQUESTED'), '환불 요청');
  assert.equal(getPaymentStatusLabel('CANCELED'), '환불 완료');
  assert.equal(getPaymentStatusLabel('REFUND_FAILED'), '환불 실패');
});

test('정산 상태 라벨 표준화', () => {
  assert.equal(getSettlementStatusLabel('PENDING'), '정산 대기');
  assert.equal(getSettlementStatusLabel('REQUESTED'), '정산 요청');
  assert.equal(getSettlementStatusLabel('COMPLETED'), '정산 완료');
  assert.equal(getSettlementStatusLabel('FAILED'), '정산 실패');
  assert.equal(getSettlementStatusLabel('SKIPPED'), '정산 스킵');
  assert.equal(getSettlementStatusLabel('REFUNDED_AFTER_SETTLEMENT'), '정산 후 환불');
});

test('환불 정책 문구 분기', () => {
  assert.match(
    getRefundPolicyMessage('PARTIAL_REFUND_WITH_FEE', 9000, 1000),
    /부분환불\(수수료 차감\)/,
  );
  assert.match(getRefundPolicyMessage('FULL_REFUND', 10000, 0), /전액환불/);
  assert.match(getRefundPolicyMessage('NO_PAYMENT', 0, 0), /결제 없이 신청만 취소/);
});
