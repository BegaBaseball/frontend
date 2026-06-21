export const DEFAULT_BUDGET_GRACE_BYTES = 64;
export const DEFAULT_BUDGET_GRACE_RATIO = 0.005;

export const getBudgetOverageBytes = ({ sizeBytes, maxBytes }) => Math.max(0, sizeBytes - maxBytes);

export const getBudgetMissingStatus = ({ optionalMissing = false } = {}) =>
  optionalMissing ? 'skipped_optional' : 'missing';

export const getBudgetGraceLimitBytes = ({
  maxBytes,
  graceBytes = DEFAULT_BUDGET_GRACE_BYTES,
  graceRatio = DEFAULT_BUDGET_GRACE_RATIO,
}) => Math.min(graceBytes, Math.floor(maxBytes * graceRatio));

export const isBudgetWithinLimit = ({
  sizeBytes,
  maxBytes,
  graceBytes = DEFAULT_BUDGET_GRACE_BYTES,
  graceRatio = DEFAULT_BUDGET_GRACE_RATIO,
}) => getBudgetOverageBytes({ sizeBytes, maxBytes }) <= getBudgetGraceLimitBytes({
  maxBytes,
  graceBytes,
  graceRatio,
});
