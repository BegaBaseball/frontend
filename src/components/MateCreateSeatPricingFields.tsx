import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateSeatPricingFieldsProps {
  formData: PartyFormData;
  updateFormData: (data: Partial<PartyFormData>) => void;
}

export default function MateCreateSeatPricingFields({
  formData,
  updateFormData,
}: MateCreateSeatPricingFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <FieldLabel htmlFor="maxParticipants" className="text-base font-bold sm:text-lg">모집 인원 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <select
          id="maxParticipants"
          value={formData.maxParticipants.toString()}
          onChange={(event) => updateFormData({ maxParticipants: parseInt(event.target.value, 10) })}
          className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-[16px] dark:border-border dark:bg-input/30"
        >
          <option value="2">2명 (본인 포함)</option>
          <option value="3">3명 (본인 포함)</option>
          <option value="4">4명 (본인 포함)</option>
        </select>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="ticketPrice" className="text-base font-bold sm:text-lg">티켓 가격 (1인당) <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div className="relative">
          <Input
            id="ticketPrice"
            type="number"
            min="0"
            step="1000"
            value={formData.ticketPrice || ''}
            onChange={(event) => updateFormData({ ticketPrice: parseInt(event.target.value) || 0 })}
            placeholder="예: 12000"
            className="h-12 pr-12 text-base sm:text-lg"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            원
          </span>
        </div>
        <p className="text-[16px] text-gray-500 mt-2 px-1">
          * 선택하신 <span className="font-bold text-primary">{formData.seatCategory}</span> 기준 예상 가격입니다. 실제 예매 가격과 다를 수 있습니다.
        </p>
        {formData.ticketPrice > 0 && (
          <Alert>
            <AlertDescription className="text-[16px]">
              참여자는 호스트 승인 후 채팅에서 티켓 가격 <span className="text-primary">{formData.ticketPrice.toLocaleString()}원</span> 기준으로 직거래를 조율합니다.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="reservationDepositAmount" className="text-base font-bold sm:text-lg">예약금 (선택)</FieldLabel>
        <div className="relative">
          <Input
            id="reservationDepositAmount"
            type="number"
            min="0"
            step="1000"
            value={formData.reservationDepositAmount || ''}
            onChange={(event) => updateFormData({ reservationDepositAmount: parseInt(event.target.value, 10) || 0 })}
            placeholder="예: 5000"
            className="h-12 pr-12 text-base sm:text-lg"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            원
          </span>
        </div>
        <p className="text-[16px] text-gray-500 mt-2 px-1">
          비워두면 상세 페이지에는 예약금 대신 승인 후 직거래 안내가 표시됩니다.
        </p>
      </div>
    </>
  );
}
