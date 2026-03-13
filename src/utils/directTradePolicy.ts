type DirectTradeSnapshotInput = {
  isSelling: boolean;
  sellingPrice: number;
  ticketPrice: number;
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

  return {
    amount: sanitizeAmount(input.ticketPrice),
    paymentType: 'DEPOSIT',
  };
};
