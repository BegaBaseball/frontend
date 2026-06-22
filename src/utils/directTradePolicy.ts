type DirectTradeSnapshotInput = {
  isSelling: boolean;
  sellingPrice: number;
  ticketPrice: number;
  reservationDepositAmount?: number | null;
};

type DirectTradeSnapshot = {
  amount: number;
  paymentType: 'DEPOSIT' | 'FULL';
};

const sanitizeAmount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : 0;
};

export const resolveDirectTradeApplicationSnapshot = (
  input: DirectTradeSnapshotInput,
): DirectTradeSnapshot => {
  if (input.isSelling) {
    return {
      amount: sanitizeAmount(input.sellingPrice),
      paymentType: 'FULL',
    };
  }

  const reservationDepositAmount = sanitizeAmount(input.reservationDepositAmount ?? 0);
  return {
    amount: reservationDepositAmount > 0 ? reservationDepositAmount : sanitizeAmount(input.ticketPrice),
    paymentType: 'DEPOSIT',
  };
};
