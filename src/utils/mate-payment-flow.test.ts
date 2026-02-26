import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearPendingPayment,
  isCompatibleFlowAndPaymentType,
  isPendingPaymentSessionValid,
  isValidMateOrderId,
  loadPendingPayment,
  savePendingPayment,
  type PendingPaymentData,
} from './payment';
import { getMatePaymentMode, isDirectTradeMode, isTossTestMode } from './paymentMode';

type SessionStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

type WindowLike = {
  __MATE_PAYMENT_MODE__?: string;
};

const store = new Map<string, string>();
const sessionStorageMock: SessionStorageLike = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => {
    store.set(key, value);
  },
  removeItem: (key) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
};

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
  writable: true,
});

const windowMock: WindowLike = {};
Object.defineProperty(globalThis, 'window', {
  value: windowMock,
  configurable: true,
  writable: true,
});

const depositPending: PendingPaymentData = {
  intentId: 11,
  partyId: 3,
  flowType: 'DEPOSIT',
  message: '함께 관람해요',
  ticketVerified: true,
  ticketImageUrl: null,
  paymentType: 'DEPOSIT',
  amount: 22000,
  orderId: 'MATE-3-22-1735123456789',
  orderName: 'KBO 메이트 결제 - 잠실',
};

const sellingPending: PendingPaymentData = {
  ...depositPending,
  flowType: 'SELLING_FULL',
  paymentType: 'FULL',
  amount: 50000,
  orderId: 'MATE-9-7-1735123456799',
};

beforeEach(() => {
  sessionStorage.clear();
  delete windowMock.__MATE_PAYMENT_MODE__;
});

test('결제 세션 저장/복원/정리', () => {
  savePendingPayment(depositPending);
  assert.deepEqual(loadPendingPayment(), depositPending);

  clearPendingPayment();
  assert.equal(loadPendingPayment(), null);
});

test('orderId 형식 검증: 올바른 MATE orderId만 허용', () => {
  assert.equal(isValidMateOrderId('MATE-10-20-1735123456789'), true);
  assert.equal(isValidMateOrderId('ORDER-10-20-1735123456789'), false);
  assert.equal(isValidMateOrderId('MATE-abc-20-1735123456789'), false);
  assert.equal(isValidMateOrderId('MATE-10-20-bad'), false);
});

test('콜백 orderId가 세션과 다르거나 형식이 틀리면 차단', () => {
  savePendingPayment(depositPending);
  const pending = loadPendingPayment();

  assert.equal(isPendingPaymentSessionValid(pending, 'MATE-3-22-1735123456788'), false);
  assert.equal(isPendingPaymentSessionValid(pending, 'invalid-order-id'), false);
});

test('paymentType 분기 안전성: flowType과 paymentType 조합 검증', () => {
  assert.equal(isCompatibleFlowAndPaymentType('DEPOSIT', 'DEPOSIT'), true);
  assert.equal(isCompatibleFlowAndPaymentType('DEPOSIT', 'FULL'), false);
  assert.equal(isCompatibleFlowAndPaymentType('SELLING_FULL', 'FULL'), true);
  assert.equal(isCompatibleFlowAndPaymentType('SELLING_FULL', 'DEPOSIT'), false);

  savePendingPayment(sellingPending);
  const sellingLoaded = loadPendingPayment();
  assert.equal(isPendingPaymentSessionValid(sellingLoaded, sellingPending.orderId), true);
});

test('결제 모드 분기: window override 기반으로 DIRECT_TRADE/TOSS_TEST를 판별한다', () => {
  windowMock.__MATE_PAYMENT_MODE__ = 'TOSS_TEST';
  assert.equal(getMatePaymentMode(), 'TOSS_TEST');
  assert.equal(isTossTestMode(), true);
  assert.equal(isDirectTradeMode(), false);

  windowMock.__MATE_PAYMENT_MODE__ = 'DIRECT_TRADE';
  assert.equal(getMatePaymentMode(), 'DIRECT_TRADE');
  assert.equal(isTossTestMode(), false);
  assert.equal(isDirectTradeMode(), true);
});

test('결제 모드 분기: 알 수 없는 값은 DIRECT_TRADE로 폴백한다', () => {
  windowMock.__MATE_PAYMENT_MODE__ = 'UNKNOWN_MODE';
  assert.equal(getMatePaymentMode(), 'DIRECT_TRADE');
  assert.equal(isDirectTradeMode(), true);
});
