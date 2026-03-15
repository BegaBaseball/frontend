import type { TicketInfo } from '../api/ticket';

const MATE_APPLY_DRAFT_PREFIX = 'mateApplyDraft:';

export interface MateApplyDraft {
  partyId: string;
  message: string;
  ticketVerified: boolean;
  ticketInfo: TicketInfo | null;
  updatedAt: string;
}

const normalizePartyId = (partyId: string): string => partyId.trim();

const hasDraftContent = (draft: {
  message: string;
  ticketVerified: boolean;
  ticketInfo: TicketInfo | null;
}): boolean => (
  Boolean(draft.message.trim())
  || draft.ticketVerified
  || draft.ticketInfo !== null
);

export const getMateApplyDraftStorageKey = (partyId: string): string =>
  `${MATE_APPLY_DRAFT_PREFIX}${normalizePartyId(partyId)}`;

export const loadMateApplyDraft = (partyId: string): MateApplyDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getMateApplyDraftStorageKey(normalizedPartyId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MateApplyDraft>;
    if (parsed?.partyId !== normalizedPartyId) {
      return null;
    }

    return {
      partyId: normalizedPartyId,
      message: typeof parsed.message === 'string' ? parsed.message : '',
      ticketVerified: parsed.ticketVerified === true,
      ticketInfo: parsed.ticketInfo ?? null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
};

export const saveMateApplyDraft = (
  partyId: string,
  draft: Pick<MateApplyDraft, 'message' | 'ticketVerified' | 'ticketInfo'>,
): MateApplyDraft | null => {
  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) {
    return null;
  }

  if (typeof window === 'undefined') {
    return {
      partyId: normalizedPartyId,
      message: draft.message,
      ticketVerified: draft.ticketVerified,
      ticketInfo: draft.ticketInfo,
      updatedAt: new Date().toISOString(),
    };
  }

  if (!hasDraftContent(draft)) {
    clearMateApplyDraft(normalizedPartyId);
    return null;
  }

  const payload: MateApplyDraft = {
    partyId: normalizedPartyId,
    message: draft.message,
    ticketVerified: draft.ticketVerified,
    ticketInfo: draft.ticketInfo,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(
      getMateApplyDraftStorageKey(normalizedPartyId),
      JSON.stringify(payload),
    );
  } catch {
    return payload;
  }

  return payload;
};

export const clearMateApplyDraft = (partyId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedPartyId = normalizePartyId(partyId);
  if (!normalizedPartyId) {
    return;
  }

  try {
    window.sessionStorage.removeItem(getMateApplyDraftStorageKey(normalizedPartyId));
  } catch {
    // Ignore storage failures and continue without draft persistence.
  }
};
