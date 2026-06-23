import { lazy, Suspense } from 'react';

import type { Application } from '../types/mate';
import { cn } from '../lib/utils';
import {
  mateInsetPanelClass,
  mateMobileBarClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import {
  MateArrowRightCircleIcon,
  MateMessageSquareIcon,
  MatePencilIcon,
  MateTrashIcon,
} from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';

const LazyMateManageEditPanel = lazy(() => import('./MateManageEditPanel'));
const LazyMateManageApplicationsRuntime = lazy(() => import('./MateManageApplicationsRuntime'));

export type MateManageApplicationTabKey = 'pending' | 'approved' | 'rejected';

export type MateManageMobileAction = {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
  className: string;
};

export type MateManageEditFormState = {
  section: string;
  maxParticipants: number;
  ticketPrice: number;
  reservationDepositAmount: number;
  description: string;
};

export type MateManageContentRuntimeProps = {
  isEditing: boolean;
  editForm: MateManageEditFormState;
  descriptionError: string;
  pendingApplications: Application[];
  approvedApplications: Application[];
  rejectedApplications: Application[];
  selectedApplicationTab: MateManageApplicationTabKey;
  canEdit: boolean;
  canReviewCheckIn: boolean;
  isDeleting: boolean;
  nextStepSummary: string;
  primaryMobileAction: MateManageMobileAction | null;
  secondaryMobileAction: MateManageMobileAction | null;
  onSelectApplicationTab: (tab: MateManageApplicationTabKey) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteParty: () => void;
  onApprove: (applicationId: string | number) => void;
  onReject: (applicationId: string | number) => void;
  onOpenChat: () => void;
  onOpenCheckIn: () => void;
  onEditSectionChange: (value: string) => void;
  onEditTicketPriceChange: (value: string) => void;
  onEditReservationDepositAmountChange: (value: string) => void;
  onEditMaxParticipantsChange: (value: number) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditDescriptionBlur: () => void;
};

export default function MateManageContentRuntime({
  isEditing,
  editForm,
  descriptionError,
  pendingApplications,
  approvedApplications,
  rejectedApplications,
  selectedApplicationTab,
  canEdit,
  canReviewCheckIn,
  isDeleting,
  nextStepSummary,
  primaryMobileAction,
  secondaryMobileAction,
  onSelectApplicationTab,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteParty,
  onApprove,
  onReject,
  onOpenChat,
  onOpenCheckIn,
  onEditSectionChange,
  onEditTicketPriceChange,
  onEditReservationDepositAmountChange,
  onEditMaxParticipantsChange,
  onEditDescriptionChange,
  onEditDescriptionBlur,
}: MateManageContentRuntimeProps) {
  const mateManageEditFallback = (
    <Card className={`p-6 ${mateSectionCardClass}`}>
      <div className="space-y-4">
        <p className="text-[16px] font-semibold text-gray-800 dark:text-white">수정 패널을 준비하고 있습니다.</p>
        <div className="space-y-3 animate-pulse">
          <div className="h-11 rounded-2xl bg-muted/70" />
          <div className="h-24 rounded-2xl bg-muted/60" />
          <div className="h-11 w-40 rounded-full bg-muted" />
        </div>
      </div>
    </Card>
  );

  return (
    <>
      {isEditing ? (
        <Suspense fallback={mateManageEditFallback}>
          <LazyMateManageEditPanel
            editForm={editForm}
            descriptionError={descriptionError}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onEditSectionChange={onEditSectionChange}
            onEditTicketPriceChange={onEditTicketPriceChange}
            onEditReservationDepositAmountChange={onEditReservationDepositAmountChange}
            onEditMaxParticipantsChange={onEditMaxParticipantsChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onEditDescriptionBlur={onEditDescriptionBlur}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={(
        <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
          <div className="space-y-4">
            <div>
              <p className="text-[16px] font-semibold text-gray-800 dark:text-white">신청 현황을 불러오고 있습니다.</p>
              <p className="mt-1 text-[14px] text-gray-500 dark:text-white">승인, 거절, 채팅 액션을 곧 사용할 수 있습니다.</p>
            </div>
            <div className="space-y-4 animate-pulse">
              <div className="flex gap-2">
                <div className="h-9 w-20 rounded-full bg-muted" />
                <div className="h-9 w-20 rounded-full bg-muted/70" />
                <div className="h-9 w-20 rounded-full bg-muted/70" />
              </div>
              <div className="h-28 rounded-2xl bg-muted/70" />
              <div className="h-32 rounded-2xl bg-muted/60" />
            </div>
          </div>
        </Card>
      )}>
        <LazyMateManageApplicationsRuntime
          pendingApplications={pendingApplications}
          approvedApplications={approvedApplications}
          rejectedApplications={rejectedApplications}
          selectedApplicationTab={selectedApplicationTab}
          onSelectApplicationTab={onSelectApplicationTab}
          onApprove={onApprove}
          onReject={onReject}
          onOpenChat={onOpenChat}
          onOpenCheckIn={onOpenCheckIn}
        />
      </Suspense>

      <div className="space-y-4">
        <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              Next Action
            </p>
            <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 먼저 할 일</h3>
            <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-white">
              {pendingApplications.length > 0
                ? `응답 필요 ${pendingApplications.length}건이 있어 승인/거절이 최우선입니다.`
                : approvedApplications.length > 0
                  ? '승인된 참여자와 채팅을 열고 체크인 준비까지 이어서 확인하세요.'
                  : '새 신청을 기다리면서 파티 정보와 가격 구성을 점검할 수 있습니다.'}
            </p>

            <div className="mt-4 space-y-2">
              {approvedApplications.length > 0 && (
                <Button onClick={onOpenChat} className="w-full bg-primary text-white">
                  <MateMessageSquareIcon className="mr-2 h-4 w-4" />
                  채팅방 입장
                </Button>
              )}
              {canReviewCheckIn && (
                <Button
                  onClick={onOpenCheckIn}
                  variant="outline"
                  className="w-full border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30"
                >
                  <MateArrowRightCircleIcon className="mr-2 h-4 w-4" />
                  체크인 현황
                </Button>
              )}
              {canEdit && (
                <Button
                  onClick={onStartEdit}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                >
                  <MatePencilIcon className="mr-2 h-4 w-4" />
                  정보 수정
                </Button>
              )}
            </div>

            <div className={`${mateInsetPanelClass} mt-4 p-4`}>
              <p className="text-[16px] font-semibold text-gray-900 dark:text-white">관리 기준</p>
              <ul className="mt-3 space-y-2 text-[16px] text-gray-600 dark:text-white">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>상태와 신뢰 배지를 먼저 보고, 그 다음 금액과 메시지를 확인합니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>응답 기한이 있는 신청은 같은 세션에서 바로 처리하는 편이 좋습니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>승인 뒤에는 채팅과 체크인 흐름이 열리므로 후속 단계까지 같이 확인합니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className={`hidden p-5 lg:flex ${mateSectionCardClass}`}>
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              Secondary Controls
            </p>
            <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">보조 관리 영역</h3>
            <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-white">
              수정과 삭제는 승인 결정 뒤에 다루는 보조 액션입니다. 주 판단 흐름과 섞이지 않도록 아래에 분리했습니다.
            </p>
            <div className="mt-4 space-y-2">
              {canEdit ? (
                <Button
                  onClick={onStartEdit}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-border dark:text-white dark:hover:bg-secondary"
                >
                  <MatePencilIcon className="mr-2 h-4 w-4" />
                  파티 정보 수정
                </Button>
              ) : (
                <div className={`${mateInsetPanelClass} p-4 text-[16px] text-gray-500 dark:text-white`}>
                  승인 완료 이후에는 파티 정보를 수정할 수 없습니다.
                </div>
              )}
              <Button
                onClick={onDeleteParty}
                disabled={isDeleting}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                <MateTrashIcon className="mr-2 h-4 w-4" />
                {isDeleting ? '삭제 중...' : '파티 삭제'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {(primaryMobileAction || secondaryMobileAction) && (
        <div className={`${mateMobileBarClass} lg:hidden`}>
          <div className="mx-auto max-w-6xl">
            <div className="min-w-0">
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
                관리 요약
              </p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white">
                {pendingApplications.length > 0
                  ? `응답 필요 ${pendingApplications.length}건`
                  : `다음 단계: ${nextStepSummary}`}
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {secondaryMobileAction && (
                <Button
                  onClick={secondaryMobileAction.onClick}
                  variant={secondaryMobileAction.variant ?? 'outline'}
                  className={cn('w-full sm:flex-1', secondaryMobileAction.className)}
                >
                  {secondaryMobileAction.label}
                </Button>
              )}
              {primaryMobileAction && (
                <Button
                  onClick={primaryMobileAction.onClick}
                  variant={primaryMobileAction.variant}
                  className={cn('w-full sm:flex-1', primaryMobileAction.className)}
                >
                  {primaryMobileAction.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
