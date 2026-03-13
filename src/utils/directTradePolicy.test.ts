import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDirectTradeApplicationSnapshot } from './directTradePolicy';

test('DIRECT_TRADE 금액 스냅샷: 일반 모집은 ticketPrice와 DEPOSIT을 사용한다', () => {
  const snapshot = resolveDirectTradeApplicationSnapshot({
    isSelling: false,
    ticketPrice: 12000,
    sellingPrice: 50000,
  });

  assert.deepEqual(snapshot, {
    amount: 12000,
    paymentType: 'DEPOSIT',
  });
});

test('DIRECT_TRADE 금액 스냅샷: SELLING은 price와 FULL을 사용한다', () => {
  const snapshot = resolveDirectTradeApplicationSnapshot({
    isSelling: true,
    ticketPrice: 12000,
    sellingPrice: 50000,
  });

  assert.deepEqual(snapshot, {
    amount: 50000,
    paymentType: 'FULL',
  });
});

test('DIRECT_TRADE 금액 스냅샷: 음수/비정상 값은 0으로 정규화한다', () => {
  const pendingSnapshot = resolveDirectTradeApplicationSnapshot({
    isSelling: false,
    ticketPrice: -10,
    sellingPrice: 1000,
  });
  assert.equal(pendingSnapshot.amount, 0);

  const sellingSnapshot = resolveDirectTradeApplicationSnapshot({
    isSelling: true,
    ticketPrice: 1000,
    sellingPrice: Number.NaN,
  });
  assert.equal(sellingSnapshot.amount, 0);
});
