import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { checkSocialVerified } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { useAuthAccessActions, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { validateMateDescription } from '../utils/mateValidation';
import { getEstimatedPrice } from '../utils/priceHelper';
import { KBO_STADIUMS, SeatCategory } from '../utils/stadiumData';
import { useMateCreateMachine, type MatchInfo } from './useMateCreateMachine';

export function useMateCreateController() {
  const navigate = useNavigate();
  const requireSocialVerification = import.meta.env.VITE_MATE_REQUIRE_SOCIAL_VERIFICATION !== 'false';
  const machine = useMateCreateMachine();
  const {
    createStep,
    canGoNext,
    isSubmitting,
    isConfirming,
    isSubmittingError,
    isMatchLoadError,
    availableMatches,
    errorMessage,
    submitErrorStatus,
    errorType,
    createdPartyId,
    formData,
    formErrors,
    uploadTicket,
    updateFormData,
    setFormError,
    goPrev,
    loadMatches,
    submit,
    cancelSubmit,
    reset,
  } = machine;
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const { logout } = useAuthAccessActions();
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const lastSubmitErrorRef = useRef('');
  const loadedMatchDateRef = useRef('');

  const redirectToLogin = useCallback((replace = false) => {
    logout(true);
    navigate(buildLoginPath(getCurrentRelativeUrl()), replace ? { replace: true } : undefined);
  }, [logout, navigate]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!currentUserId) {
      redirectToLogin(true);
      return;
    }

    if (!requireSocialVerification) {
      return;
    }

    let isMounted = true;

    const verifySocialAccount = async () => {
      try {
        const socialResult = await checkSocialVerified(currentUserId);
        if (isMounted && socialResult.data === false) {
          setShowVerificationDialog(true);
        }
      } catch (error: unknown) {
        if (getApiErrorStatus(error) === 401) {
          redirectToLogin(true);
        }
      }
    };

    void verifySocialAccount();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, isAuthLoading, redirectToLogin, requireSocialVerification]);

  useEffect(() => {
    if (createStep === 3 && formData.stadium && formData.seatCategory && formData.gameDate) {
      const estimated = getEstimatedPrice(formData.stadium, formData.seatCategory as SeatCategory, formData.gameDate);
      if (estimated && estimated !== formData.ticketPrice) {
        updateFormData({ ticketPrice: estimated });
      }
    }
  }, [createStep, formData.stadium, formData.seatCategory, formData.gameDate, formData.ticketPrice, updateFormData]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [createStep]);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelSubmit();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelSubmit, isConfirming]);

  const handleDescriptionChange = useCallback((text: string) => {
    updateFormData({ description: text });
    const error = validateMateDescription(text);
    setFormError('description', error);
  }, [setFormError, updateFormData]);

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadTicket(file);
  }, [uploadTicket]);

  const handleBack = useCallback(() => {
    if (createStep === 1) {
      reset();
      navigate('/mate');
    } else {
      goPrev();
    }
  }, [createStep, goPrev, navigate, reset]);

  const handleSubmit = useCallback(() => {
    if (!currentUserId) {
      redirectToLogin();
      return;
    }

    submit();
  }, [currentUserId, redirectToLogin, submit]);

  const selectMatch = useCallback((match: MatchInfo) => {
    updateFormData({
      gameTime: match.gameTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stadium: match.stadium,
    });
  }, [updateFormData]);

  const fileErrorMessage = errorType === 'scan' ? errorMessage : formErrors.ticketFile;
  const matchLoadErrorMessage = isMatchLoadError ? errorMessage : '';
  const knownStadiumNames = useMemo(
    () => Array.from(new Set(Object.values(KBO_STADIUMS).map((stadium) => stadium.name))),
    [],
  );
  const shouldShowManualMatchInput = createStep === 2
    && Boolean(formData.gameDate)
    && !machine.isLoadingMatches
    && (isMatchLoadError || availableMatches.length === 0);

  useEffect(() => {
    if (createStep !== 2 || !formData.gameDate) {
      loadedMatchDateRef.current = '';
      return;
    }

    if (loadedMatchDateRef.current === formData.gameDate) {
      return;
    }

    loadedMatchDateRef.current = formData.gameDate;
    loadMatches();
  }, [createStep, formData.gameDate, loadMatches]);

  useEffect(() => {
    if (createdPartyId) {
      toast.success('파티가 생성되었습니다!');
      navigate(`/mate/${createdPartyId}`);
      return;
    }

    if (!isSubmittingError) {
      if (lastSubmitErrorRef.current) {
        lastSubmitErrorRef.current = '';
      }
      return;
    }

    if (submitErrorStatus === 403) {
      setShowVerificationDialog(true);
      return;
    }

    if (submitErrorStatus === 401) {
      redirectToLogin();
      return;
    }

    if (submitErrorStatus && submitErrorStatus !== 403) {
      const errorKey = `${submitErrorStatus}:${errorMessage}`;
      if (lastSubmitErrorRef.current !== errorKey) {
        lastSubmitErrorRef.current = errorKey;
        console.error('파티 생성 중 오류:', errorMessage || 'unknown');
        toast.error(errorMessage || '파티 생성 중 오류가 발생했습니다.');
      }
      return;
    }

    if (errorMessage && lastSubmitErrorRef.current !== errorMessage) {
      lastSubmitErrorRef.current = errorMessage;
      toast.error(errorMessage);
    }
  }, [
    createdPartyId,
    errorMessage,
    isSubmittingError,
    navigate,
    redirectToLogin,
    submitErrorStatus,
  ]);

  const availableCategoryKeys = useMemo<SeatCategory[]>(() => {
    const stadiumConfig = Object.values(KBO_STADIUMS).find(
      (stadium) => stadium.name === formData.stadium,
    );

    if (stadiumConfig) {
      return Array.from(new Set(stadiumConfig.zones.map((zone) => zone.category)));
    }

    return ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD'];
  }, [formData.stadium]);

  const progressValue = (createStep / 4) * 100;
  const isSubmitDisabled = isSubmitting || !formData.description || formData.description.length < 10 || !formData.ticketFile;

  const handleDescriptionBlur = useCallback(() => {
    const error = validateMateDescription(formData.description);
    setFormError('description', error);
  }, [formData.description, setFormError]);

  const blockedStepMessage = useMemo(() => {
    if (createStep === 1 && !formData.ticketFile) {
      return '티켓 이미지를 업로드해야 다음 단계로 진행할 수 있습니다.';
    }
    if (createStep === 2 && !canGoNext) {
      if (!formData.gameDate) {
        return '경기 날짜를 선택해주세요.';
      }
      if (shouldShowManualMatchInput) {
        return '경기 정보(시간/팀/구장)를 수동 입력해주세요.';
      }
      return '경기 목록에서 관람할 경기를 선택해주세요.';
    }
    if (createStep === 3 && !canGoNext) {
      if (!(formData.seatDetail || formData.section)) {
        return '좌석 상세 정보를 입력해주세요.';
      }
      if (formData.maxParticipants <= 0) {
        return '모집 인원을 선택해주세요.';
      }
      if (formData.ticketPrice <= 0) {
        return '티켓 가격을 입력해주세요.';
      }
      return '필수 항목을 모두 입력해주세요.';
    }
    if (createStep === 4 && isSubmitDisabled) {
      if (!formData.ticketFile) {
        return '티켓 이미지를 업로드해야 파티를 만들 수 있습니다.';
      }
      if (!formData.description || formData.description.length < 10) {
        return '소개글을 10자 이상 입력해주세요.';
      }
      if (formErrors.description) {
        return formErrors.description;
      }
    }
    return '';
  }, [canGoNext, createStep, formData, formErrors.description, isSubmitDisabled, shouldShowManualMatchInput]);

  return {
    ...machine,
    availableCategoryKeys,
    blockedStepMessage,
    fileErrorMessage,
    handleBack,
    handleDescriptionBlur,
    handleDescriptionChange,
    handleFileUpload,
    handleSubmit,
    isSubmitDisabled,
    knownStadiumNames,
    matchLoadErrorMessage,
    progressValue,
    selectMatch,
    setShowVerificationDialog,
    shouldShowManualMatchInput,
    showVerificationDialog,
    updateFormData: updateFormData as (data: Partial<PartyFormData>) => void,
  };
}

export type UseMateCreateControllerReturn = ReturnType<typeof useMateCreateController>;
