import { lazy, Suspense, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthAccessActions, useAuthSession } from '../store/authStore';
import { checkSocialVerified } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { useMateCreateMachine, type MatchInfo } from '../hooks/useMateCreateMachine';
import { SeatCategory, KBO_STADIUMS } from '../utils/stadiumData';
import { getEstimatedPrice } from '../utils/priceHelper';
import { validateMateDescription } from '../utils/mateValidation';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import type { PartyFormData } from '../utils/mateCreateDraft';

const MateCreateTicketStep = lazy(() => import('./MateCreateTicketStep'));
const MateCreateMatchStep = lazy(() => import('./MateCreateMatchStep'));
const MateCreateSeatStep = lazy(() => import('./MateCreateSeatStep'));
const MateCreateDescriptionStep = lazy(() => import('./MateCreateDescriptionStep'));
const MateCreateConfirmDialog = lazy(() => import('./MateCreateConfirmDialog'));
const VerificationRequiredDialog = lazy(() => import('./VerificationRequiredDialog'));

function MateCreateStepFallback() {
  return (
    <div className="py-16 text-center text-[16px] text-gray-500">
      단계 로딩 중...
    </div>
  );
}

export default function MateCreate() {
  const navigate = useNavigate();
  const requireSocialVerification = import.meta.env.VITE_MATE_REQUIRE_SOCIAL_VERIFICATION !== 'false';
  const {
    createStep,
    canGoNext,
    canGoPrev,
    isScanning,
    isSubmitting,
    isLoadingMatches,
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
    goNext,
    goPrev,
    loadMatches,
    submit,
    confirmSubmit,
    cancelSubmit,
    reset,
    retry,
  } = useMateCreateMachine();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const { logout } = useAuthAccessActions();

  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const lastSubmitErrorRef = useRef('');
  const loadedMatchDateRef = useRef('');

  const redirectToLogin = (replace = false) => {
    logout(true);
    navigate(buildLoginPath(getCurrentRelativeUrl()), replace ? { replace: true } : undefined);
  };

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
  }, [currentUserId, isAuthLoading, requireSocialVerification]);

  // Price Automation
  useEffect(() => {
    if (createStep === 3 && formData.stadium && formData.seatCategory && formData.gameDate) {
      const estimated = getEstimatedPrice(formData.stadium, formData.seatCategory as SeatCategory, formData.gameDate);
      if (estimated) {
        updateFormData({ ticketPrice: estimated });
      }
    }
  }, [createStep, formData.stadium, formData.seatCategory, formData.gameDate]);

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

  const handleDescriptionChange = (text: string) => {
    updateFormData({ description: text });
    const error = validateMateDescription(text);
    setFormError('description', error);
  };

  // Step 1: 티켓 업로드 + OCR
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadTicket(file);
  };

  const handleBack = () => {
    if (createStep === 1) {
      reset();
      navigate('/mate');
    } else {
      goPrev();
    }
  };

  const handleSubmit = () => {
    if (!currentUserId) {
      redirectToLogin();
      return;
    }

    submit();
  };

  const selectMatch = (match: MatchInfo) => {
    updateFormData({
      gameTime: match.gameTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stadium: match.stadium
    });
  };

  const fileErrorMessage = errorType === 'scan' ? errorMessage : formErrors.ticketFile;
  const matchLoadErrorMessage = isMatchLoadError ? errorMessage : '';
  const knownStadiumNames = Array.from(new Set(Object.values(KBO_STADIUMS).map((stadium) => stadium.name)));
  const shouldShowManualMatchInput = createStep === 2
    && Boolean(formData.gameDate)
    && !isLoadingMatches
    && (isMatchLoadError || availableMatches.length === 0);

  useEffect(() => {
    if (createStep !== 2 || !formData.gameDate) {
      if (createStep !== 2) {
        loadedMatchDateRef.current = '';
      } else if (!formData.gameDate) {
        loadedMatchDateRef.current = '';
      }
      return;
    }

    if (loadedMatchDateRef.current === formData.gameDate) {
      return;
    }

    loadedMatchDateRef.current = formData.gameDate;
    loadMatches();
  }, [createStep, formData.gameDate]);

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
  }, [createdPartyId, isSubmittingError, errorMessage, submitErrorStatus, navigate]);


  const getAvailableCategoryKeys = (): SeatCategory[] => {
    const stadiumConfig = Object.values(KBO_STADIUMS).find(
      (s) => s.name === formData.stadium
    );

    if (stadiumConfig) {
      return Array.from(new Set(stadiumConfig.zones.map((z) => z.category)));
    }

    return ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD'];
  };

  const availableCategoryKeys = getAvailableCategoryKeys();

  const progressValue = (createStep / 4) * 100;
  const isSubmitDisabled = isSubmitting || !formData.description || formData.description.length < 10 || !formData.ticketFile;

  const handleDescriptionBlur = () => {
    const error = validateMateDescription(formData.description);
    setFormError('description', error);
  };

  const blockedStepMessage = (() => {
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
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:py-8 relative z-10">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="-ml-2 mb-3 sm:mb-4 sm:ml-0"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 className="mb-2 text-3xl sm:text-4xl text-primary">
            직관메이트 파티 만들기
          </h1>
          <p className="text-[16px] text-gray-600 sm:text-base">단계별로 파티 정보를 입력해주세요</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-[16px] text-gray-600">단계 {createStep} / 4</span>
            <span className="text-[16px] text-primary">
              {progressValue.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        <Card className="p-5 sm:p-8">
          {createStep === 1 && (
            <Suspense fallback={<MateCreateStepFallback />}>
              <MateCreateTicketStep
                isScanning={isScanning}
                ticketFile={formData.ticketFile}
                fileErrorMessage={fileErrorMessage}
                errorType={errorType}
                retry={retry}
                onFileUpload={handleFileUpload}
                updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
                goNext={goNext}
              />
            </Suspense>
          )}

          {createStep === 2 && (
            <Suspense fallback={<MateCreateStepFallback />}>
              <MateCreateMatchStep
                formData={formData}
                matchLoadErrorMessage={matchLoadErrorMessage}
                isLoadingMatches={isLoadingMatches}
                availableMatches={availableMatches}
                retry={retry}
                selectMatch={selectMatch}
                updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
                knownStadiumNames={knownStadiumNames}
              />
            </Suspense>
          )}

          {createStep === 3 && (
            <Suspense fallback={<MateCreateStepFallback />}>
              <MateCreateSeatStep
                formData={formData}
                availableCategoryKeys={availableCategoryKeys}
                updateFormData={updateFormData as (data: Partial<PartyFormData>) => void}
              />
            </Suspense>
          )}

          {createStep === 4 && (
            <Suspense fallback={<MateCreateStepFallback />}>
              <MateCreateDescriptionStep
                formData={formData}
                formErrors={formErrors}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionBlur={handleDescriptionBlur}
              />
            </Suspense>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {createStep > 1 && (
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={!canGoPrev}
                className="flex-1"
              >
                이전
              </Button>
            )}
            {createStep < 4 ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex-1 text-white bg-primary"
              >
                다음
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex-1 text-white bg-primary"
              >
                파티 만들기
              </Button>
            )}
          </div>
          {blockedStepMessage && (
            <p className={`mt-3 text-[16px] text-center ${createStep === 4 ? 'text-red-500' : 'text-amber-600'}`}>
              {blockedStepMessage}
            </p>
          )}
        </Card>
      </div>

      {isConfirming && (
        <Suspense fallback={null}>
          <MateCreateConfirmDialog
            formData={formData}
            isSubmitting={isSubmitting}
            onCancel={cancelSubmit}
            onConfirm={confirmSubmit}
          />
        </Suspense>
      )}

      {showVerificationDialog && (
        <Suspense fallback={null}>
          <VerificationRequiredDialog
            isOpen={showVerificationDialog}
            onClose={() => setShowVerificationDialog(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
