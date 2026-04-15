import { Suspense, lazy, type ComponentType, type ReactNode, type SVGProps } from 'react';

import {
  MateAlertCircleIcon,
  MateArrowRightCircleIcon,
  MateCheckCircleIcon,
  MateClockIcon,
  MateMessageSquareIcon,
  MatePencilIcon,
  MateShieldIcon,
  MateStarIcon,
  MateTicketIcon,
  MateTrashIcon,
  MateUsersIcon,
  MateXCircleIcon,
} from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { type Application, type BadgeType } from '../types/mate';
import { cn } from '../lib/utils';
import {
  getBadgeMeta,
  mateInsetPanelClass,
  mateMobileBarClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';

const LazyMateManageEditPanel = lazy(() => import('./MateManageEditPanel'));
type MateIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

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
  onEditMaxParticipantsChange: (value: number) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditDescriptionBlur: () => void;
};

const APPLICATION_TABS: ReadonlyArray<{ key: MateManageApplicationTabKey; label: string }> = [
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
];

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: MateIconComponent;
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-[16px] leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

function InlineBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[16px] font-semibold', className)}>
      {children}
    </span>
  );
}

const getDeadlineText = (deadline?: string) => {
  if (!deadline) {
    return null;
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return '기한 만료';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  }
  return `${minutes}분 남음`;
};

const getBadgeIcon = (badge: BadgeType) => {
  if (badge === 'VERIFIED') {
    return <MateShieldIcon className="h-3.5 w-3.5" />;
  }
  if (badge === 'TRUSTED') {
    return <MateStarIcon className="h-3.5 w-3.5" />;
  }
  return null;
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
  onEditMaxParticipantsChange,
  onEditDescriptionChange,
  onEditDescriptionBlur,
}: MateManageContentRuntimeProps) {
  const selectedApplications = selectedApplicationTab === 'pending'
    ? pendingApplications
    : selectedApplicationTab === 'approved'
      ? approvedApplications
      : rejectedApplications;
  const mateManageEditFallback = (
    <Card className={`p-6 ${mateSectionCardClass}`}>
      <p className="text-[16px] text-gray-500 dark:text-gray-300">수정 패널을 준비하고 있습니다.</p>
    </Card>
  );

  const renderApplicationCard = (app: Application, tabKey: MateManageApplicationTabKey) => {
    const badgeMeta = getBadgeMeta(app.applicantBadge);
    const responseDeadline = getDeadlineText(app.responseDeadline);
    const createdAt = new Date(app.createdAt).toLocaleString('ko-KR');
    const tabTone = tabKey === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'
      : tabKey === 'approved'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300';
    const tabLabel = tabKey === 'pending' ? '응답 대기' : tabKey === 'approved' ? '승인 완료' : '거절됨';

    return (
      <Card
        key={app.id}
        className={`gap-0 overflow-hidden p-0 ${mateSectionCardClass}`}
        data-testid={`manage-application-${tabKey}`}
      >
        <div className="border-b border-gray-200/80 px-5 py-5 dark:border-border/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{app.applicantName}</p>
                {badgeMeta && (
                  <InlineBadge className={cn(badgeMeta.className)}>
                    <span className="flex items-center gap-1">
                      {getBadgeIcon(app.applicantBadge)}
                      {badgeMeta.label}
                    </span>
                  </InlineBadge>
                )}
                <InlineBadge className={cn(tabTone)}>{tabLabel}</InlineBadge>
                {app.ticketVerified && (
                  <InlineBadge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                    <span className="flex items-center gap-1">
                      <MateTicketIcon className="h-3.5 w-3.5" />
                      티켓 인증
                    </span>
                  </InlineBadge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[16px] text-gray-500 dark:text-gray-300">
                <span className="inline-flex items-center gap-1">
                  <MateStarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  평점 {app.applicantRating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MateClockIcon className="h-3.5 w-3.5" />
                  신청 {createdAt}
                </span>
                {responseDeadline && tabKey === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[16px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
                    <MateAlertCircleIcon className="h-3.5 w-3.5" />
                    응답 기한 {responseDeadline}
                  </span>
                )}
              </div>
            </div>
            <div className={`${mateInsetPanelClass} min-w-[240px] p-4`}>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                신청 메시지
              </p>
              <p className="mt-2 text-[16px] leading-6 text-gray-700 dark:text-gray-200">
                {app.message || '전달된 메시지가 없습니다.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${mateInsetPanelClass} p-4`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              진행 안내
            </p>
            <div className="mt-2 space-y-2 text-[16px] text-gray-700 dark:text-gray-200">
              <p>채팅에서 전달 일정/장소를 확정하고 체크인 단계로 이어집니다.</p>
            </div>
          </div>

          <div className={`${mateInsetPanelClass} p-4`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              다음 단계
            </p>
            <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
              {tabKey === 'pending'
                ? '이 신청은 승인/거절을 먼저 결정해야 다음 흐름이 열립니다.'
                : tabKey === 'approved'
                  ? '승인된 참여자는 채팅과 체크인 흐름으로 이어집니다.'
                  : '거절된 신청은 기록만 유지되며 추가 액션이 필요하지 않습니다.'}
            </p>

            {tabKey === 'pending' ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => onApprove(app.id)}
                  className="flex-1 bg-primary text-white"
                >
                  <MateCheckCircleIcon className="mr-2 h-4 w-4" />
                  승인
                </Button>
                <Button
                  onClick={() => onReject(app.id)}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <MateXCircleIcon className="mr-2 h-4 w-4" />
                  거절
                </Button>
              </div>
            ) : tabKey === 'approved' ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={onOpenChat} className="flex-1 bg-primary text-white">
                  <MateMessageSquareIcon className="mr-2 h-4 w-4" />
                  채팅방 입장
                </Button>
                <Button
                  onClick={onOpenCheckIn}
                  variant="outline"
                  className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30"
                >
                  <MateArrowRightCircleIcon className="mr-2 h-4 w-4" />
                  체크인 연결
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-3 text-[16px] text-gray-500 dark:border-border/70 dark:bg-card/60 dark:text-gray-300">
                거절 처리된 신청은 보관용 상태입니다. 후속 조치는 필요하지 않습니다.
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

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
            onEditMaxParticipantsChange={onEditMaxParticipantsChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onEditDescriptionBlur={onEditDescriptionBlur}
          />
        </Suspense>
      ) : null}

      <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Decision Queue
            </p>
            <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">신청 검토와 후속 진행</h2>
            <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
              카드마다 신뢰 신호, 금액 기준, 채팅 진행 방식, 응답 기한을 확인한 뒤 바로 액션을 진행합니다.
            </p>
          </div>
          <div className={`${mateInsetPanelClass} p-4 text-[16px] text-gray-600 dark:text-gray-300`}>
            <p className="font-semibold text-gray-900 dark:text-white">지금 우선순위</p>
            <p className="mt-1">
              {pendingApplications.length > 0
                ? `대기 신청 ${pendingApplications.length}건을 먼저 처리하세요.`
                : approvedApplications.length > 0
                  ? '승인된 참여자와 채팅/체크인 준비로 넘어갈 수 있습니다.'
                  : '새 신청을 기다리는 상태입니다.'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-gray-200/70 bg-white p-1.5 dark:border-white/5 dark:bg-[#16181c]">
            {APPLICATION_TABS.map((tab) => {
              const count = tab.key === 'pending'
                ? pendingApplications.length
                : tab.key === 'approved'
                  ? approvedApplications.length
                  : rejectedApplications.length;
              const isActive = selectedApplicationTab === tab.key;

              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => onSelectApplicationTab(tab.key)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-lg px-2 py-2 text-[16px] font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-gray-500 hover:bg-primary/10 hover:text-primary dark:text-zinc-400 dark:hover:text-emerald-300',
                  )}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            {selectedApplicationTab === 'pending' && (
              pendingApplications.length === 0 ? (
                <EmptyState
                  icon={MateUsersIcon}
                  title="대기 중인 신청이 없습니다"
                  description="새 신청이 들어오면 이 탭에서 바로 검토할 수 있습니다. 상세페이지 CTA와 연결된 첫 판단 지점입니다."
                />
              ) : (
                selectedApplications.map((application) => renderApplicationCard(application, 'pending'))
              )
            )}

            {selectedApplicationTab === 'approved' && (
              approvedApplications.length === 0 ? (
                <EmptyState
                  icon={MateCheckCircleIcon}
                  title="승인된 신청이 없습니다"
                  description="참여가 확정되면 여기서 채팅과 체크인 연결 흐름을 이어갈 수 있습니다."
                />
              ) : (
                selectedApplications.map((application) => renderApplicationCard(application, 'approved'))
              )
            )}

            {selectedApplicationTab === 'rejected' && (
              rejectedApplications.length === 0 ? (
                <EmptyState
                  icon={MateXCircleIcon}
                  title="거절된 신청이 없습니다"
                  description="거절된 신청은 기록만 유지됩니다. 이후 다시 검토할 항목은 없습니다."
                />
              ) : (
                selectedApplications.map((application) => renderApplicationCard(application, 'rejected'))
              )
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Next Action
            </p>
            <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 먼저 할 일</h3>
            <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
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
              <ul className="mt-3 space-y-2 text-[16px] text-gray-600 dark:text-gray-300">
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
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Secondary Controls
            </p>
            <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">보조 관리 영역</h3>
            <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
              수정과 삭제는 승인 결정 뒤에 다루는 보조 액션입니다. 주 판단 흐름과 섞이지 않도록 아래에 분리했습니다.
            </p>
            <div className="mt-4 space-y-2">
              {canEdit ? (
                <Button
                  onClick={onStartEdit}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-border dark:text-gray-200 dark:hover:bg-secondary"
                >
                  <MatePencilIcon className="mr-2 h-4 w-4" />
                  파티 정보 수정
                </Button>
              ) : (
                <div className={`${mateInsetPanelClass} p-4 text-[16px] text-gray-500 dark:text-gray-300`}>
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
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
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
