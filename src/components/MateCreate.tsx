import { lazy, Suspense } from 'react';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { MateChevronLeftIcon, MateChevronRightIcon } from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useMateCreateController } from '../hooks/useMateCreateController';
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
  const {
    createStep,
    canGoNext,
    canGoPrev,
    isScanning,
    isSubmitting,
    isSubmitDisabled,
    isLoadingMatches,
    isConfirming,
    availableMatches,
    errorType,
    formData,
    formErrors,
    updateFormData,
    goNext,
    goPrev,
    confirmSubmit,
    cancelSubmit,
    retry,
    availableCategoryKeys,
    blockedStepMessage,
    fileErrorMessage,
    handleBack,
    handleDescriptionBlur,
    handleDescriptionChange,
    handleFileUpload,
    handleSubmit,
    knownStadiumNames,
    matchLoadErrorMessage,
    progressValue,
    selectMatch,
    setShowVerificationDialog,
    showVerificationDialog,
  } = useMateCreateController();

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
            <MateChevronLeftIcon className="w-4 h-4 mr-2" />
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
                <MateChevronRightIcon className="w-4 h-4 ml-2" />
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
