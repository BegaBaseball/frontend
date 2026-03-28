export type CheeringSide = 'HOME' | 'AWAY' | 'NEUTRAL' | '';

export interface PartyFormData {
  gameDate: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  section: string;
  cheeringSide: CheeringSide;
  seatCategory: string;
  seatDetail: string;
  maxParticipants: number;
  ticketPrice: number;
  description: string;
  ticketFile: File | null;
  reservationNumber?: string;
}

export interface MateCreateFormErrors {
  description: string;
  ticketFile: string;
}

type PersistedMateCreateDraftState = {
  createStep?: number;
  formData?: Partial<Omit<PartyFormData, 'ticketFile'>> & {
    ticketFile?: null;
  };
};

type PersistedMateCreateDraftPayload = {
  state?: PersistedMateCreateDraftState;
  version?: number;
};

export const MATE_CREATE_DRAFT_STORAGE_KEY = 'mate-storage';

export const createInitialPartyFormData = (): PartyFormData => ({
  gameDate: '',
  gameTime: '',
  homeTeam: '',
  awayTeam: '',
  stadium: '',
  section: '',
  cheeringSide: '',
  seatCategory: '',
  seatDetail: '',
  maxParticipants: 2,
  ticketPrice: 0,
  description: '',
  ticketFile: null,
  reservationNumber: '',
});

export const createInitialMateCreateFormErrors = (): MateCreateFormErrors => ({
  description: '',
  ticketFile: '',
});

export const normalizeMateCreateStep = (rawStep: number): 1 | 2 | 3 | 4 => {
  if (rawStep === 2 || rawStep === 3 || rawStep === 4) {
    return rawStep;
  }
  return 1;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toStringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const toNumberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const restoreMateCreateFormData = (
  value: unknown,
): PartyFormData => {
  const initial = createInitialPartyFormData();

  if (!isRecord(value)) {
    return initial;
  }

  return {
    gameDate: toStringOr(value.gameDate, initial.gameDate),
    gameTime: toStringOr(value.gameTime, initial.gameTime),
    homeTeam: toStringOr(value.homeTeam, initial.homeTeam),
    awayTeam: toStringOr(value.awayTeam, initial.awayTeam),
    stadium: toStringOr(value.stadium, initial.stadium),
    section: toStringOr(value.section, initial.section),
    cheeringSide:
      value.cheeringSide === 'HOME'
      || value.cheeringSide === 'AWAY'
      || value.cheeringSide === 'NEUTRAL'
      ? value.cheeringSide
      : initial.cheeringSide,
    seatCategory: toStringOr(value.seatCategory, initial.seatCategory),
    seatDetail: toStringOr(value.seatDetail, initial.seatDetail),
    maxParticipants: toNumberOr(value.maxParticipants, initial.maxParticipants),
    ticketPrice: toNumberOr(value.ticketPrice, initial.ticketPrice),
    description: toStringOr(value.description, initial.description),
    ticketFile: null,
    reservationNumber: toStringOr(value.reservationNumber, initial.reservationNumber || ''),
  };
};

export const readMateCreateDraft = (
  raw: string | null | undefined,
): {
  createStep: 1 | 2 | 3 | 4;
  formData: PartyFormData;
} => {
  const fallback = {
    createStep: 1 as const,
    formData: createInitialPartyFormData(),
  };

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedMateCreateDraftPayload | PersistedMateCreateDraftState;
    const state = isRecord(parsed) && isRecord(parsed.state) ? parsed.state : parsed;
    if (!isRecord(state)) {
      return fallback;
    }

    return {
      createStep: normalizeMateCreateStep(toNumberOr(state.createStep, fallback.createStep)),
      formData: restoreMateCreateFormData(state.formData),
    };
  } catch {
    return fallback;
  }
};

export const isMateCreateDraftEmpty = (
  createStep: 1 | 2 | 3 | 4,
  formData: PartyFormData,
): boolean => {
  const initial = createInitialPartyFormData();

  return createStep === 1
    && formData.gameDate === initial.gameDate
    && formData.gameTime === initial.gameTime
    && formData.homeTeam === initial.homeTeam
    && formData.awayTeam === initial.awayTeam
    && formData.stadium === initial.stadium
    && formData.section === initial.section
    && formData.cheeringSide === initial.cheeringSide
    && formData.seatCategory === initial.seatCategory
    && formData.seatDetail === initial.seatDetail
    && formData.maxParticipants === initial.maxParticipants
    && formData.ticketPrice === initial.ticketPrice
    && formData.description === initial.description
    && formData.ticketFile === initial.ticketFile
    && (formData.reservationNumber || '') === (initial.reservationNumber || '');
};

export const serializeMateCreateDraft = (
  createStep: 1 | 2 | 3 | 4,
  formData: PartyFormData,
): string => JSON.stringify({
  state: {
    createStep,
    formData: {
      ...formData,
      ticketFile: null,
    },
  },
  version: 0,
});
