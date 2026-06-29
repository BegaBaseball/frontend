import type { ReactNode } from 'react';

import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';
import { mateSectionCardClass } from '../utils/mateFlowUi';
import type { MateManageEditFormState } from './MateManageContentRuntime';

type MateManageEditPanelProps = {
  editForm: MateManageEditFormState;
  descriptionError: string;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditSectionChange: (value: string) => void;
  onEditSeatDetailChange: (value: string) => void;
  onEditTicketPriceChange: (value: string) => void;
  onEditReservationDepositAmountChange: (value: string) => void;
  onEditMaxParticipantsChange: (value: number) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditDescriptionBlur: () => void;
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-body leading-none font-semibold text-gray-900 select-none dark:text-white"
    >
      {children}
    </label>
  );
}

export default function MateManageEditPanel({
  editForm,
  descriptionError,
  onSaveEdit,
  onCancelEdit,
  onEditSectionChange,
  onEditSeatDetailChange,
  onEditTicketPriceChange,
  onEditReservationDepositAmountChange,
  onEditMaxParticipantsChange,
  onEditDescriptionChange,
  onEditDescriptionBlur,
}: MateManageEditPanelProps) {
  return (
    <Card className={`p-6 ${mateSectionCardClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
            Edit Draft
          </p>
          <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">파티 정보 수정</h2>
          <p className="mt-2 text-body text-gray-600 dark:text-white">
            승인 완료 전까지 좌석, 모집 인원, 가격, 소개를 정리할 수 있습니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-body font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
          승인 완료 전 수정 가능
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="manage-section">좌석</FieldLabel>
          <Input
            id="manage-section"
            value={editForm.section}
            onChange={(event) => onEditSectionChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="manage-seat-detail">좌석 상세</FieldLabel>
          <Input
            id="manage-seat-detail"
            value={editForm.seatDetail}
            maxLength={100}
            placeholder="예: 305블록 12열 15번"
            onChange={(event) => onEditSeatDetailChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="manage-ticket-price">티켓 가격 (원)</FieldLabel>
          <Input
            id="manage-ticket-price"
            type="number"
            value={editForm.ticketPrice}
            onChange={(event) => onEditTicketPriceChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="manage-reservation-deposit">예약금 (원, 선택)</FieldLabel>
          <Input
            id="manage-reservation-deposit"
            type="number"
            min="0"
            value={editForm.reservationDepositAmount}
            onChange={(event) => onEditReservationDepositAmountChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="manage-max-participants">모집 인원</FieldLabel>
          <select
            id="manage-max-participants"
            value={editForm.maxParticipants}
            onChange={(event) => onEditMaxParticipantsChange(parseInt(event.target.value, 10))}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-body dark:border-border dark:bg-input/30"
          >
            <option value={2}>2명</option>
            <option value={3}>3명</option>
            <option value={4}>4명</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <FieldLabel htmlFor="manage-description">소개글</FieldLabel>
        <Textarea
          id="manage-description"
          value={editForm.description}
          onChange={(event) => onEditDescriptionChange(event.target.value)}
          onBlur={onEditDescriptionBlur}
          className={cn(descriptionError && 'border-red-400 focus-visible:ring-red-200')}
        />
        {descriptionError && (
          <p className="text-body text-red-500">{descriptionError}</p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onSaveEdit} className="bg-primary text-white">
          저장
        </Button>
        <Button onClick={onCancelEdit} variant="outline">
          취소
        </Button>
      </div>
    </Card>
  );
}
