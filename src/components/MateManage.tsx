import { lazy, useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import LoadingSpinner from './LoadingSpinner';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { MateAlertCircleIcon, MateRefreshIcon } from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  approveApplication,
  deleteParty,
  normalizeMateParty,
  rejectApplication,
  updateParty,
} from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import {
  getMatePartyApplicationsQueryOptions,
  removeMatePartyFromCollections,
  removeMatePartyQueries,
  syncMatePartyQueryData,
  updateMatePartyApplicationQueryData,
  updateMatePartyCollectionQueryData,
  useMatePartyFromRoute,
} from '../hooks/mateManageRoute';
import { useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { getApiErrorMessage } from '../utils/errorUtils';
import {
  matePageShellClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';
import { isPartyHostedByUser } from '../utils/mate';
import { validateMateDescription } from '../utils/mateValidation';
import type {
  MateManageApplicationTabKey,
  MateManageContentRuntimeProps,
  MateManageEditFormState,
  MateManageMobileAction,
} from './MateManageContentRuntime';

const LazyMateManageOverviewRuntime = lazy(() => import('./MateManageOverviewRuntime'));
type MateIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const resolveDefaultApplicationTab = (
  pendingCount: number,
  approvedCount: number,
  rejectedCount: number,
): MateManageApplicationTabKey => {
  if (pendingCount > 0) {
    return 'pending';
  }

  if (approvedCount > 0) {
    return 'approved';
  }

  if (rejectedCount > 0) {
    return 'rejected';
  }

  return 'pending';
};

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
        <Icon className="h-8 w-8 text-gray-400 dark:text-white" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-[16px] leading-6 text-gray-500 dark:text-white">{description}</p>
    </div>
  );
}

export default function MateManage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { confirm } = useConfirmDialog();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const { userHandle: currentUserHandle } = useAuthProfileSnapshot();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const { logout, requireLogin } = useAuthAccessActions();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<MateManageEditFormState>({
    section: '',
    maxParticipants: 2,
    ticketPrice: 0,
    reservationDepositAmount: 0,
    description: '',
  });
  const [descriptionError, setDescriptionError] = useState('');
  const [applicationActionError, setApplicationActionError] = useState('');

  useEffect(() => {
    if (isAuthLoading || currentUserId !== null) {
      return;
    }

    logout(true);
    requireLogin();
  }, [currentUserId, isAuthLoading, logout, requireLogin]);

  const isHost = party
    ? isPartyHostedByUser(party, { id: currentUserId, handle: currentUserHandle })
    : false;
  const applicationsQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyApplicationsQueryOptions(party.id)
      : getMatePartyApplicationsQueryOptions('unknown')),
    enabled: Boolean(party?.id && currentUserId && isHost),
  });
  const applications = applicationsQuery.data ?? [];
  const isLoading = applicationsQuery.isPending;
  const isHostAccessDenied = getApiErrorStatus(applicationsQuery.error) === 403;
  const fetchError = Boolean(applicationsQuery.error) && !isHostAccessDenied;
  const [pendingApplications, approvedApplications, rejectedApplications] = useMemo(() => [
    applications.filter((app) => !app.isApproved && !app.isRejected),
    applications.filter((app) => app.isApproved),
    applications.filter((app) => app.isRejected),
  ], [applications]);
  const defaultApplicationTab = resolveDefaultApplicationTab(
    pendingApplications.length,
    approvedApplications.length,
    rejectedApplications.length,
  );
  const [activeApplicationTab, setActiveApplicationTab] = useState<MateManageApplicationTabKey | null>(null);
  const selectedApplicationTab = activeApplicationTab ?? defaultApplicationTab;

  const handleApprove = async (applicationId: string | number) => {
    setApplicationActionError('');
    try {
      const approvedApplication = await approveApplication(applicationId);
      updateMatePartyApplicationQueryData(
        queryClient,
        party!.id,
        approvedApplication.id,
        () => approvedApplication,
      );
      updateMatePartyCollectionQueryData(queryClient, party!.id, (currentParty) => {
        const nextParticipants = Math.min(
          currentParty.maxParticipants,
          currentParty.currentParticipants + 1,
        );

        return {
          ...currentParty,
          currentParticipants: nextParticipants,
          status: nextParticipants >= currentParty.maxParticipants
            ? 'MATCHED'
            : currentParty.status,
        };
      });
      toast.success('신청이 승인되었습니다!');
    } catch (error: unknown) {
      console.error('신청 승인 중 오류:', error);
      const errorMessage = getApiErrorMessage(error, '신청 승인에 실패했습니다.');
      setApplicationActionError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleReject = async (applicationId: string | number) => {
    setApplicationActionError('');
    try {
      const rejectedApplication = await rejectApplication(applicationId);
      updateMatePartyApplicationQueryData(
        queryClient,
        party!.id,
        rejectedApplication.id,
        () => rejectedApplication,
      );
      toast.success('신청이 거절되었습니다.');
    } catch (error: unknown) {
      console.error('신청 거절 중 오류:', error);
      const errorMessage = getApiErrorMessage(error, '신청 거절에 실패했습니다.');
      setApplicationActionError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteParty = async () => {
    if (!party || !currentUserId) {
      if (!currentUserId) {
        logout(true);
        requireLogin();
      }
      return;
    }

    const approvedCount = applications.filter((app) => app.isApproved).length;
    if (approvedCount > 0) {
      toast.warning('승인된 참여자가 있어 파티를 삭제할 수 없습니다.', {
        description: '참여자가 취소하거나 거절된 뒤 다시 시도해주세요.',
      });
      return;
    }

    const pendingCount = applications.filter((app) => !app.isApproved && !app.isRejected).length;

    let confirmMessage = '파티를 삭제하시겠습니까?\n\n';
    if (pendingCount > 0) {
      confirmMessage += `⚠️ 대기 중인 신청 ${pendingCount}건도 함께 삭제됩니다.`;
    } else {
      confirmMessage += '이 작업은 되돌릴 수 없습니다.';
    }

    const confirmed = await confirm({
      title: '파티 삭제',
      description: confirmMessage,
      confirmLabel: '삭제',
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteParty(party.id);
      removeMatePartyFromCollections(queryClient, party.id);
      removeMatePartyQueries(queryClient, party.id);
      toast.success('파티가 삭제되었습니다.');
      navigate('/mate');
    } catch (error: unknown) {
      console.error('파티 삭제 중 오류:', error);
      toast.error(getApiErrorMessage(error, '파티 삭제에 실패했습니다.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChat = () => {
    navigate(`/mate/${id}/chat`);
  };

  const handleOpenCheckIn = () => {
    navigate(`/mate/${id}/checkin`);
  };

  const handleStartEdit = () => {
    if (!party) {
      return;
    }

    setEditForm({
      section: party.section,
      maxParticipants: party.maxParticipants,
      ticketPrice: party.ticketPrice || 0,
      reservationDepositAmount: party.reservationDepositAmount || 0,
      description: party.description,
    });
    setDescriptionError('');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!party) {
      return;
    }

    const error = validateMateDescription(editForm.description);
    if (error) {
      setDescriptionError(error);
      return;
    }

    try {
      const updatedParty = await updateParty(party.id, editForm);
      syncMatePartyQueryData(queryClient, normalizeMateParty(updatedParty));
      toast.success('파티 정보가 수정되었습니다.');
      setDescriptionError('');
      setIsEditing(false);
    } catch (error: unknown) {
      console.error('파티 수정 중 오류:', error);
      toast.error(getApiErrorMessage(error, '파티 수정에 실패했습니다.'));
    }
  };

  if (isAuthLoading || (isPartyLoading && !party)) {
    return <LoadingSpinner text="파티 정보를 불러오는 중..." fullScreen />;
  }

  if (partyError || !party) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {partyError || '파티 정보를 찾을 수 없습니다.'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/mate')} className="mt-4 w-fit">
              목록으로 이동
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  if (!isHost || isHostAccessDenied) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              Access
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">호스트 전용 관리 화면</h1>
            <p className="mt-3 text-[16px] leading-6 text-gray-600 dark:text-white">
              신청 검토, 승인, 후속 진행은 호스트만 처리할 수 있습니다. 상세페이지로 돌아가 현재 파티 상태를 확인하세요.
            </p>
            <Button onClick={() => navigate(`/mate/${id}`)} className="mt-6 w-fit">
              상세로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const canEdit = party.status === 'PENDING' && approvedApplications.length === 0;
  const canReviewCheckIn = approvedApplications.length > 0 || ['MATCHED', 'CHECKED_IN', 'COMPLETED'].includes(party.status);
  const nextStepSummary = pendingApplications.length > 0
    ? '대기 신청 검토'
    : approvedApplications.length > 0
      ? '채팅과 체크인 준비'
      : canEdit
        ? '파티 정보 정리'
        : '새 신청 대기';
  const primaryMobileAction: MateManageMobileAction | null = approvedApplications.length > 0
    ? {
      label: '채팅방 입장',
      onClick: handleOpenChat,
      variant: 'default' as const,
      className: 'bg-primary text-white',
    }
    : canEdit
      ? {
        label: isEditing ? '수정 저장' : '정보 수정',
        onClick: isEditing ? handleSaveEdit : handleStartEdit,
        variant: isEditing ? 'default' as const : 'outline' as const,
        className: isEditing ? 'bg-primary text-white' : 'border-primary text-primary hover:bg-primary/10',
      }
      : null;
  const secondaryMobileAction: MateManageMobileAction | null = canReviewCheckIn
    ? {
      label: '체크인 현황',
      onClick: handleOpenCheckIn,
      variant: 'outline' as const,
      className: 'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30',
    }
      : null;
  const contentProps: MateManageContentRuntimeProps = {
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
    onSelectApplicationTab: setActiveApplicationTab,
    onStartEdit: handleStartEdit,
    onSaveEdit: handleSaveEdit,
    onCancelEdit: () => setIsEditing(false),
    onDeleteParty: handleDeleteParty,
    onApprove: handleApprove,
    onReject: handleReject,
    onOpenChat: handleOpenChat,
    onOpenCheckIn: handleOpenCheckIn,
    onEditSectionChange: (value) => setEditForm((current) => ({ ...current, section: value })),
    onEditTicketPriceChange: (value) =>
      setEditForm((current) => ({ ...current, ticketPrice: parseInt(value, 10) || 0 })),
    onEditReservationDepositAmountChange: (value) =>
      setEditForm((current) => ({ ...current, reservationDepositAmount: parseInt(value, 10) || 0 })),
    onEditMaxParticipantsChange: (value) => setEditForm((current) => ({ ...current, maxParticipants: value })),
    onEditDescriptionChange: (value) => {
      setEditForm((current) => ({ ...current, description: value }));
      if (descriptionError) {
        setDescriptionError(validateMateDescription(value));
      }
    },
    onEditDescriptionBlur: () => setDescriptionError(validateMateDescription(editForm.description)),
  };

  if (isLoading) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <LoadingSpinner size="lg" text="신청 목록을 불러오는 중..." fullScreen={false} />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <EmptyState
              icon={MateAlertCircleIcon}
              title="신청 목록을 불러오지 못했습니다"
              description="네트워크 연결을 확인한 뒤 다시 시도해주세요. 목록과 상세는 유지되고 신청 관리 데이터만 다시 불러옵니다."
            />
            <Button variant="outline" className="mt-4 w-fit" onClick={() => void applicationsQuery.refetch()}>
              <MateRefreshIcon className="mr-1.5 h-4 w-4" />
              다시 시도
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <LazyMateManageOverviewRuntime
      party={party}
      approvedApplications={approvedApplications}
      pendingApplications={pendingApplications}
      isPartyRevalidating={isPartyRevalidating}
      applicationActionError={applicationActionError}
      contentProps={contentProps}
      onNavigateBack={() => navigate(`/mate/${id}`)}
    />
  );
}
