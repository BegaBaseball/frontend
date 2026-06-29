import { lazy, Suspense } from 'react';

import type { PartyFormData } from '../utils/mateCreateDraft';
import type { SeatCategory } from '../utils/stadiumData';

const MateCreateSeatSelectionFields = lazy(() => import('./MateCreateSeatSelectionFields'));
const MateCreateSeatPricingFields = lazy(() => import('./MateCreateSeatPricingFields'));

interface MateCreateSeatStepProps {
  formData: PartyFormData;
  availableCategoryKeys: SeatCategory[];
  updateFormData: (data: Partial<PartyFormData>) => void;
}

function SeatStepFallback({ label = '좌석 정보를 준비하고 있습니다.' }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="mb-4 text-15 font-semibold text-gray-700 dark:text-white">{label}</p>
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-xl bg-muted/70" />
        <div className="h-36 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

export default function MateCreateSeatStep({
  formData,
  availableCategoryKeys,
  updateFormData,
}: MateCreateSeatStepProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <h2 className="mb-4 text-lg font-bold text-primary sm:mb-6 sm:text-xl">
        좌석 정보
      </h2>

      <Suspense fallback={<SeatStepFallback label="좌석 선택 UI를 준비하고 있습니다." />}>
        <MateCreateSeatSelectionFields
          formData={formData}
          availableCategoryKeys={availableCategoryKeys}
          updateFormData={updateFormData}
        />
      </Suspense>

      <Suspense fallback={<SeatStepFallback label="가격과 예약금 입력 UI를 준비하고 있습니다." />}>
        <MateCreateSeatPricingFields
          formData={formData}
          updateFormData={updateFormData}
        />
      </Suspense>
    </div>
  );
}
