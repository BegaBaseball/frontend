import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { analyzeTicket, type TicketInfo } from '../api/ticket';
import { createParty, getKboSchedule, type KboScheduleItem } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import {
  invalidateMateCollectionQueries,
  setMatePartyDetailQueryData,
} from './mateQueryCache';
import { useMateCreateDraft } from './useMateCreateDraft';
import { mapBackendPartyToFrontend } from '../utils/mate';
import { STADIUMS, TEAMS } from '../utils/constants';
import { getApiErrorMessage } from '../utils/errorUtils';
import type { MateCreateFormErrors, PartyFormData } from '../utils/mateCreateDraft';

export interface MatchInfo {
  id: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
}

export type MateCreateErrorType = 'scan' | 'matches' | 'submit' | null;

export interface MateCreateState {
  context: {
    activeStep: 1 | 2 | 3 | 4;
    availableMatches: MatchInfo[];
    errorType: MateCreateErrorType;
    errorMessage: string;
    submitErrorStatus: number | null;
    createdPartyId: number | null;
  };
  matches: (stateValue: string) => boolean;
}

export interface UseMateCreateMachineReturn {
  state: MateCreateState;
  createStep: 1 | 2 | 3 | 4;
  formData: PartyFormData;
  formErrors: MateCreateFormErrors;
  canGoNext: boolean;
  canGoPrev: boolean;
  isScanning: boolean;
  isSubmitting: boolean;
  isLoadingMatches: boolean;
  isConfirming: boolean;
  isSubmittingError: boolean;
  isErrorState: boolean;
  isMatchLoadError: boolean;
  availableMatches: MatchInfo[];
  errorType: MateCreateErrorType;
  errorMessage: string;
  submitErrorStatus: number | null;
  createdPartyId: number | null;
  uploadTicket: (file: File) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  setFormError: (field: keyof MateCreateFormErrors, error: string) => void;
  goNext: () => void;
  goPrev: () => void;
  loadMatches: () => void;
  submit: () => void;
  confirmSubmit: () => void;
  cancelSubmit: () => void;
  retry: () => void;
  reset: () => void;
}

const canGoNextByStep = (
  step: 1 | 2 | 3 | 4,
  formData: PartyFormData,
) => {
  if (step === 1) {
    return formData.ticketFile !== null;
  }
  if (step === 2) {
    return Boolean(
      formData.gameDate &&
      formData.homeTeam &&
      formData.awayTeam &&
      formData.stadium
    );
  }
  if (step === 3) {
    return Boolean(
      (formData.seatDetail || formData.section) &&
      formData.maxParticipants > 0 &&
      formData.ticketPrice > 0
    );
  }
  return false;
};

const mapTicketTeam = (team: string): string => {
  const matchedTeam = TEAMS.find(
    (item) => item.name.includes(team) || team.includes(item.name)
  );
  return matchedTeam?.id || '';
};

const mapTeamId = (backendId: string): string => {
  if (!backendId) return '';
  const code = backendId.toUpperCase();
  const mapping: Record<string, string> = {
    LG: 'lg',
    KT: 'kt',
    NC: 'nc',
    SSG: 'ssg',
    SK: 'ssg',
    DB: 'doosan',
    OB: 'doosan',
    DO: 'doosan',
    SS: 'samsung',
    LT: 'lotte',
    KIA: 'kia',
    HT: 'kia',
    HH: 'hanwha',
    KH: 'kiwoom',
    WO: 'kiwoom',
    KI: 'kiwoom',
    NX: 'kiwoom',
    KW: 'kiwoom',
  };
  return mapping[code] || backendId.toLowerCase();
};

const normalizeStadium = (value: string): string => {
  const matched = STADIUMS.find(
    (stadium) => stadium.includes(value) || value.includes(stadium)
  );
  return matched || value;
};

const getTicketPatch = (ticketInfo: TicketInfo): Partial<PartyFormData> => {
  const updates: Partial<PartyFormData> = {};

  if (ticketInfo.date) {
    updates.gameDate = ticketInfo.date;
  }
  if (ticketInfo.time) {
    updates.gameTime = ticketInfo.time.substring(0, 5);
  }
  if (ticketInfo.stadium) {
    updates.stadium = normalizeStadium(ticketInfo.stadium);
  }
  if (ticketInfo.homeTeam) {
    updates.homeTeam = mapTicketTeam(ticketInfo.homeTeam);
  }
  if (ticketInfo.awayTeam) {
    updates.awayTeam = mapTicketTeam(ticketInfo.awayTeam);
  }
  if (ticketInfo.section || ticketInfo.row || ticketInfo.seat) {
    updates.section = [ticketInfo.section, ticketInfo.row, ticketInfo.seat]
      .filter(Boolean)
      .join(' ');
    updates.seatDetail = updates.section;
  }
  if (typeof ticketInfo.peopleCount === 'number') {
    updates.maxParticipants = ticketInfo.peopleCount;
  }
  if (typeof ticketInfo.price === 'number') {
    updates.ticketPrice = ticketInfo.price;
  }
  if (ticketInfo.reservationNumber) {
    updates.reservationNumber = ticketInfo.reservationNumber;
  }

  return updates;
};

const composeSection = (formData: PartyFormData): string =>
  formData.seatDetail
    ? [
      formData.cheeringSide === 'HOME'
        ? '[홈응원]'
        : formData.cheeringSide === 'AWAY'
          ? '[원정응원]'
          : formData.cheeringSide === 'NEUTRAL'
            ? '[중립]'
            : '',
      formData.seatCategory,
      formData.seatDetail,
    ]
      .filter(Boolean)
      .join(' ')
    : formData.section;

const sanitizeUserFacingMessage = (message: string, fallback: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return fallback;
  }
  if (/^[a-z0-9_:-]+$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
};

export function useMateCreateMachine(): UseMateCreateMachineReturn {
  const queryClient = useQueryClient();
  const {
    createStep,
    formData,
    formErrors,
    setCreateStep,
    updateFormData,
    setFormError,
    resetForm,
  } = useMateCreateDraft();
  const [availableMatches, setAvailableMatches] = useState<MatchInfo[]>([]);
  const [errorType, setErrorType] = useState<MateCreateErrorType>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitErrorStatus, setSubmitErrorStatus] = useState<number | null>(null);
  const [createdPartyId, setCreatedPartyId] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const errorTypeRef = useRef<MateCreateErrorType>(null);

  const setStep = (step: 1 | 2 | 3 | 4) => {
    setCreateStep(step);
  };

  const clearError = () => {
    setErrorType(null);
    setErrorMessage('');
    setSubmitErrorStatus(null);
  };

  const clearMatchError = () => {
    if (errorTypeRef.current !== 'matches') {
      return;
    }
    setErrorType(null);
    setErrorMessage('');
  };

  const clearSubmitError = () => {
    setSubmitErrorStatus(null);
    if (errorTypeRef.current !== 'submit') {
      return;
    }
    setErrorType(null);
    setErrorMessage('');
  };

  const uploadTicket = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setFormError('ticketFile', '파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('ticketFile', '이미지 파일만 업로드 가능합니다.');
      return;
    }

    setStep(1);
    setIsScanning(true);
    clearError();
    setCreatedPartyId(null);
    updateFormData({ ticketFile: file });
    setFormError('ticketFile', '');

    try {
      const ticketInfo = await analyzeTicket(file);
      updateFormData(getTicketPatch(ticketInfo));
      setStep(2);
    } catch (error) {
      setErrorType('scan');
      const fallbackMessage = '이미지 분석에 실패했습니다. 다른 파일로 다시 시도해주세요. (티켓 업로드는 필수)';
      setErrorMessage(
        sanitizeUserFacingMessage(getApiErrorMessage(error, fallbackMessage), fallbackMessage)
      );
    } finally {
      setIsScanning(false);
    }
  };

  const goNext = () => {
    const isMachineBusy = isScanning || isSubmitting;
    if (isMachineBusy) return;

    if (createStep === 1 && canGoNextByStep(1, formData)) {
      setStep(2);
      return;
    }
    if (createStep === 2 && canGoNextByStep(2, formData)) {
      setStep(3);
      return;
    }
    if (createStep === 3 && canGoNextByStep(3, formData)) {
      setStep(4);
    }
  };

  const goPrev = () => {
    const isMachineBusy = isScanning || isSubmitting;
    if (createStep > 1 && !isMachineBusy && !isConfirming) {
      setStep((createStep - 1) as 1 | 2 | 3 | 4);
    }
  };

  const loadMatches = async () => {
    if (!formData.gameDate) {
      return;
    }

    setStep(2);
    setIsLoadingMatches(true);
    clearMatchError();

    try {
      const response = await getKboSchedule(formData.gameDate);
      const matches = (response || []).map((game: KboScheduleItem) => ({
        id: game.gameId,
        gameTime: game.time,
        stadium: game.stadium,
        homeTeam: mapTeamId(game.homeTeam),
        awayTeam: mapTeamId(game.awayTeam),
      }));
      setAvailableMatches(matches);
    } catch {
      setAvailableMatches([]);
      setErrorType('matches');
      setErrorMessage('경기 조회에 실패했습니다. 직접 입력으로 진행해주세요.');
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const submit = () => {
    clearSubmitError();
    setStep(4);
    setIsConfirming(true);
  };

  const confirmSubmit = async () => {
    if (!formData.ticketFile) {
      setErrorType('submit');
      setSubmitErrorStatus(400);
      setErrorMessage('예매내역 인증이 필요합니다.');
      setIsConfirming(false);
      return;
    }
    if (!formData.description || formData.description.length < 10) {
      setErrorType('submit');
      setSubmitErrorStatus(400);
      setErrorMessage('소개글은 10자 이상 입력해주세요.');
      setIsConfirming(false);
      return;
    }

    setIsConfirming(false);
    setIsSubmitting(true);
    clearSubmitError();
    setStep(4);

    try {
      const partyData = {
        teamId: formData.homeTeam,
        gameDate: formData.gameDate,
        gameTime: formData.gameTime || '18:30',
        stadium: formData.stadium,
        homeTeam: formData.homeTeam,
        awayTeam: formData.awayTeam,
        section: composeSection(formData),
        maxParticipants: formData.maxParticipants,
        description: formData.description,
        ticketImageUrl: null,
        ticketPrice: formData.ticketPrice,
        reservationNumber: formData.reservationNumber,
      };

      const createdParty = await createParty(partyData);
      const frontendParty = mapBackendPartyToFrontend(createdParty);
      setMatePartyDetailQueryData(queryClient, frontendParty);
      void invalidateMateCollectionQueries(queryClient);
      resetForm();

      setCreatedPartyId(frontendParty.id ?? null);
      clearError();
    } catch (error) {
      setErrorType('submit');
      setSubmitErrorStatus(getApiErrorStatus(error) ?? 500);
      setErrorMessage(
        getApiErrorMessage(error, '파티 생성 중 오류가 발생했습니다.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubmit = () => {
    setIsConfirming(false);
    clearSubmitError();
  };

  const retry = () => {
    if (errorType === 'scan' && formData.ticketFile) {
      void uploadTicket(formData.ticketFile);
      return;
    }
    if (errorType === 'matches' && formData.gameDate) {
      void loadMatches();
      return;
    }
    if (errorType === 'submit') {
      void confirmSubmit();
    }
  };

  const reset = () => {
    setIsScanning(false);
    setIsSubmitting(false);
    setIsLoadingMatches(false);
    setIsConfirming(false);
    setAvailableMatches([]);
    setCreatedPartyId(null);
    clearError();
    resetForm();
    setStep(1);
  };

  const currentTag = useMemo(() => {
    if (isScanning) return 'step1_scanning';
    if (isSubmitting) return 'submitting';
    if (isLoadingMatches) return 'step2_loading_matches';
    if (isConfirming) return 'confirming';
    if (errorType) return 'error';
    if (createStep === 1) return 'step1_idle';
    if (createStep === 2) return 'step2_idle';
    if (createStep === 3) return 'step3_idle';
    return 'step4_idle';
  }, [createStep, errorType, isConfirming, isLoadingMatches, isScanning, isSubmitting]);

  errorTypeRef.current = errorType;

  const state = useMemo<MateCreateState>(
    () => ({
      context: {
        activeStep: createStep,
        availableMatches,
        errorType,
        errorMessage,
        submitErrorStatus,
        createdPartyId,
      },
      matches: (stateValue: string) => stateValue === currentTag,
    }),
    [
      availableMatches,
      createStep,
      createdPartyId,
      currentTag,
      errorMessage,
      errorType,
      submitErrorStatus,
    ]
  );

  const isMachineBusy = isScanning || isSubmitting;
  const canGoNext = canGoNextByStep(createStep, formData) && !isMachineBusy;

  return {
    state,
    createStep,
    formData,
    formErrors,
    canGoNext,
    canGoPrev: createStep > 1 && !isMachineBusy && !isConfirming,
    isScanning,
    isSubmitting,
    isLoadingMatches,
    isConfirming,
    isSubmittingError: errorType === 'submit',
    isErrorState: errorType !== null,
    isMatchLoadError: errorType === 'matches',
    availableMatches,
    errorType,
    errorMessage,
    submitErrorStatus,
    createdPartyId,
    uploadTicket: (file: File) => {
      void uploadTicket(file);
    },
    updateFormData,
    setFormError,
    goNext,
    goPrev,
    loadMatches: () => {
      void loadMatches();
    },
    submit,
    confirmSubmit: () => {
      void confirmSubmit();
    },
    cancelSubmit,
    retry,
    reset,
  };
}
