export const QR_REFRESH_LEAD_MS = 120_000;
export const QR_REFRESH_MIN_RETRY_MS = 10_000;

export function resolveQrRefreshDelayMs(
  expiresAt: string | null | undefined,
  nowMs: number,
  leadMs = QR_REFRESH_LEAD_MS,
  minRetryMs = QR_REFRESH_MIN_RETRY_MS,
): number {
  const safeLeadMs = Number.isFinite(leadMs) && leadMs >= 0 ? leadMs : QR_REFRESH_LEAD_MS;
  const safeMinRetryMs = Number.isFinite(minRetryMs) && minRetryMs > 0 ? minRetryMs : QR_REFRESH_MIN_RETRY_MS;
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();

  if (!expiresAt) {
    return safeMinRetryMs;
  }

  const parsedExpiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(parsedExpiresAtMs)) {
    return safeMinRetryMs;
  }

  const candidateDelayMs = parsedExpiresAtMs - safeNowMs - safeLeadMs;
  return candidateDelayMs > 0 ? candidateDelayMs : safeMinRetryMs;
}
