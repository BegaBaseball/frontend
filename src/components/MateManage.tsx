import { type ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRightCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  LucideIcon,
  MapPin,
  MessageSquare,
  Pencil,
  RefreshCw,
  Shield,
  Star,
  Ticket,
  Trash2,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo from './TeamLogo';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
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
import { Application, BadgeType } from '../types/mate';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../utils/errorUtils';
import {
  getBadgeMeta,
  getPartyFlowLabel,
  getPartyStatusMeta,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMobileBarClass,
  matePageShellClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';
import { formatGameDate, isPartyHostedByUser } from '../utils/mate';
import { validateMateDescription } from '../utils/mateValidation';

type SummaryItemProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
};

const APPLICATION_TABS = [
  { key: 'pending', label: '대기' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
] as const;

type ApplicationTabKey = typeof APPLICATION_TABS[number]['key'];

const resolveDefaultApplicationTab = (
  pendingCount: number,
  approvedCount: number,
  rejectedCount: number,
): ApplicationTabKey => {
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

function SummaryItem({ icon: Icon, label, value, detail }: SummaryItemProps) {
  return (
    <div className={`${mateInsetPanelClass} p-4`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm dark:border-border/70 dark:bg-card/80">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

function InlineBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', className)}>
      {children}
    </span>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-sm leading-none font-medium text-gray-900 select-none dark:text-white"
    >
      {children}
    </label>
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
  const [editForm, setEditForm] = useState({
    section: '',
    maxParticipants: 2,
    ticketPrice: 0,
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
  const pendingApplications = applications.filter((app) => !app.isApproved && !app.isRejected);
  const approvedApplications = applications.filter((app) => app.isApproved);
  const rejectedApplications = applications.filter((app) => app.isRejected);
  const defaultApplicationTab = resolveDefaultApplicationTab(
    pendingApplications.length,
    approvedApplications.length,
    rejectedApplications.length,
  );
  const [activeApplicationTab, setActiveApplicationTab] = useState<ApplicationTabKey | null>(null);
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
      return <Shield className="h-3.5 w-3.5" />;
    }
    if (badge === 'TRUSTED') {
      return <Star className="h-3.5 w-3.5" />;
    }
    return null;
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
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Access
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">호스트 전용 관리 화면</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
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

  const statusMeta = getPartyStatusMeta(party.status);
  const hostBadgeMeta = getBadgeMeta(party.hostBadge);
  const canEdit = party.status === 'PENDING' && approvedApplications.length === 0;
  const canReviewCheckIn = approvedApplications.length > 0 || ['MATCHED', 'CHECKED_IN', 'COMPLETED'].includes(party.status);
  const flowLabel = getPartyFlowLabel(party.status);
  const responseSummary = pendingApplications.length > 0 ? `${pendingApplications.length}건` : '없음';
  const nextStepSummary = pendingApplications.length > 0
    ? '대기 신청 검토'
    : approvedApplications.length > 0
      ? '채팅과 체크인 준비'
      : canEdit
        ? '파티 정보 정리'
        : '새 신청 대기';
  const primaryMobileAction = approvedApplications.length > 0
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
  const secondaryMobileAction = canReviewCheckIn
    ? {
      label: '체크인 현황',
      onClick: handleOpenCheckIn,
      className: 'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30',
    }
      : null;
  const selectedApplications = selectedApplicationTab === 'pending'
    ? pendingApplications
    : selectedApplicationTab === 'approved'
      ? approvedApplications
      : rejectedApplications;

  const summaryItems = [
    {
      icon: Wallet,
      label: '거래 방식',
      value: flowLabel,
      detail: '승인 후 채팅으로 전달을 조율합니다.',
    },
    {
      icon: Ticket,
      label: '티켓 상태',
      value: party.ticketVerified ? '호스트 인증 완료' : '티켓 인증 전',
      detail: party.ticketVerified ? '상세페이지와 동일한 신뢰 배지가 노출됩니다.' : '참여자에게 인증 배지가 아직 보이지 않습니다.',
    },
    {
      icon: CheckCircle,
      label: '승인 완료',
      value: `${approvedApplications.length}명`,
      detail: approvedApplications.length > 0 ? '채팅방과 체크인 흐름을 바로 열 수 있습니다.' : '아직 확정된 참여자가 없습니다.',
    },
    {
      icon: Clock,
      label: '응답 필요',
      value: responseSummary,
      detail: pendingApplications.length > 0 ? '빠른 승인/거절이 전환율에 직접 영향을 줍니다.' : '새 신청이 들어오면 여기서 바로 대응합니다.',
    },
  ];

  const renderApplicationCard = (app: Application, tabKey: 'pending' | 'approved' | 'rejected') => {
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
                      <Ticket className="h-3.5 w-3.5" />
                      티켓 인증
                    </span>
                  </InlineBadge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  평점 {app.applicantRating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  신청 {createdAt}
                </span>
                {responseDeadline && tabKey === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" />
                    응답 기한 {responseDeadline}
                  </span>
                )}
              </div>
            </div>
            <div className={`${mateInsetPanelClass} min-w-[240px] p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                신청 메시지
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
                {app.message || '전달된 메시지가 없습니다.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${mateInsetPanelClass} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              진행 안내
            </p>
            <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <p>채팅에서 전달 일정/장소를 확정하고 체크인 단계로 이어집니다.</p>
            </div>
          </div>

          <div className={`${mateInsetPanelClass} p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              다음 단계
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {tabKey === 'pending'
                ? '이 신청은 승인/거절을 먼저 결정해야 다음 흐름이 열립니다.'
                : tabKey === 'approved'
                  ? '승인된 참여자는 채팅과 체크인 흐름으로 이어집니다.'
                  : '거절된 신청은 기록만 유지되며 추가 액션이 필요하지 않습니다.'}
            </p>

            {tabKey === 'pending' ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => handleApprove(app.id)}
                  className="flex-1 bg-primary text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인
                </Button>
                <Button
                  onClick={() => handleReject(app.id)}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  거절
                </Button>
              </div>
            ) : tabKey === 'approved' ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleOpenChat} className="flex-1 bg-primary text-white">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  채팅방 입장
                </Button>
                <Button
                  onClick={handleOpenCheckIn}
                  variant="outline"
                  className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30"
                >
                  <ArrowRightCircle className="mr-2 h-4 w-4" />
                  체크인 연결
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-500 dark:border-border/70 dark:bg-card/60 dark:text-gray-300">
                거절 처리된 신청은 보관용 상태입니다. 후속 조치는 필요하지 않습니다.
              </div>
            )}
          </div>
        </div>
      </Card>
    );
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
              icon={AlertCircle}
              title="신청 목록을 불러오지 못했습니다"
              description="네트워크 연결을 확인한 뒤 다시 시도해주세요. 목록과 상세는 유지되고 신청 관리 데이터만 다시 불러옵니다."
            />
            <Button variant="outline" className="mt-4 w-fit" onClick={() => void applicationsQuery.refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              다시 시도
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`${matePageShellClass} pb-40 lg:pb-10`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%)]" />
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-3 -ml-2 sm:mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          뒤로
        </Button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className={`p-0 ${mateHeroCardClass}`}>
              <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-6 py-6 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(10,15,20,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                      <TeamLogo teamId={party.teamId} size="md" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80 dark:text-emerald-300">
                        Host Control
                      </p>
                      <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        파티 관리
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        신청 검토, 승인 결정, 채팅 연결, 체크인 준비까지 한 흐름으로 정리합니다.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <InlineBadge className={cn(statusMeta.className)}>
                          {statusMeta.label}
                        </InlineBadge>
                        <InlineBadge className="border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                          {flowLabel}
                        </InlineBadge>
                        {party.ticketVerified && (
                          <InlineBadge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                            <span className="flex items-center gap-1">
                              <Ticket className="h-3.5 w-3.5" />
                              티켓 인증
                            </span>
                          </InlineBadge>
                        )}
                        {hostBadgeMeta && (
                          <InlineBadge className={cn(hostBadgeMeta.className)}>
                            {hostBadgeMeta.label}
                          </InlineBadge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`${mateInsetPanelClass} min-w-full p-4 sm:min-w-[280px] lg:max-w-[320px]`}>
                    <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">일정</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {formatGameDate(party.gameDate)} {party.gameTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">경기장 / 좌석</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {party.stadium}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{party.section}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">참여 현황</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {party.currentParticipants}/{party.maxParticipants}명
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">승인 {approvedApplications.length}명, 대기 {pendingApplications.length}건</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="manage-summary-strip">
              {summaryItems.map((item) => (
                <SummaryItem key={item.label} {...item} />
              ))}
            </div>

            {isPartyRevalidating && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  최신 파티 정보를 다시 확인하고 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {applicationActionError && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {applicationActionError}
                </AlertDescription>
              </Alert>
            )}

            {isEditing ? (
              <Card className={`p-6 ${mateSectionCardClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      Edit Draft
                    </p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">파티 정보 수정</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      승인 완료 전까지 좌석, 모집 인원, 가격, 소개를 정리할 수 있습니다.
                    </p>
                  </div>
                  <InlineBadge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
                    승인 완료 전 수정 가능
                  </InlineBadge>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="manage-section">좌석</FieldLabel>
                    <Input
                      id="manage-section"
                      value={editForm.section}
                      onChange={(event) => setEditForm({ ...editForm, section: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="manage-ticket-price">티켓 가격 (원)</FieldLabel>
                    <Input
                      id="manage-ticket-price"
                      type="number"
                      value={editForm.ticketPrice}
                      onChange={(event) => setEditForm({ ...editForm, ticketPrice: parseInt(event.target.value, 10) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="manage-max-participants">모집 인원</FieldLabel>
                    <select
                      id="manage-max-participants"
                      value={editForm.maxParticipants}
                      onChange={(event) => setEditForm({ ...editForm, maxParticipants: parseInt(event.target.value, 10) })}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-border dark:bg-input/30"
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
                    onChange={(event) => {
                      const nextDescription = event.target.value;
                      setEditForm({ ...editForm, description: nextDescription });
                      if (descriptionError) {
                        setDescriptionError(validateMateDescription(nextDescription));
                      }
                    }}
                    onBlur={() => setDescriptionError(validateMateDescription(editForm.description))}
                    className={cn(descriptionError && 'border-red-400 focus-visible:ring-red-200')}
                  />
                  {descriptionError && (
                    <p className="text-sm text-red-500">{descriptionError}</p>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleSaveEdit} className="bg-primary text-white">
                    저장
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    취소
                  </Button>
                </div>
              </Card>
            ) : null}

            <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    Decision Queue
                  </p>
                  <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">신청 검토와 후속 진행</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    카드마다 신뢰 신호, 금액 기준, 채팅 진행 방식, 응답 기한을 확인한 뒤 바로 액션을 진행합니다.
                  </p>
                </div>
                <div className={`${mateInsetPanelClass} p-4 text-sm text-gray-600 dark:text-gray-300`}>
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
                        onClick={() => setActiveApplicationTab(tab.key)}
                        aria-pressed={isActive}
                        className={cn(
                          'rounded-lg px-2 py-2 text-[11px] font-medium transition-colors sm:text-sm',
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
                        icon={Users}
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
                        icon={CheckCircle}
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
                        icon={XCircle}
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
          </div>

          <div className="space-y-4">
            <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  Next Action
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 먼저 할 일</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {pendingApplications.length > 0
                    ? `응답 필요 ${pendingApplications.length}건이 있어 승인/거절이 최우선입니다.`
                    : approvedApplications.length > 0
                      ? '승인된 참여자와 채팅을 열고 체크인 준비까지 이어서 확인하세요.'
                      : '새 신청을 기다리면서 파티 정보와 가격 구성을 점검할 수 있습니다.'}
                </p>

                <div className="mt-4 space-y-2">
                  {approvedApplications.length > 0 && (
                    <Button onClick={handleOpenChat} className="w-full bg-primary text-white">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      채팅방 입장
                    </Button>
                  )}
                  {canReviewCheckIn && (
                    <Button
                      onClick={handleOpenCheckIn}
                      variant="outline"
                      className="w-full border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30"
                    >
                      <ArrowRightCircle className="mr-2 h-4 w-4" />
                      체크인 현황
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      onClick={handleStartEdit}
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary/10"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      정보 수정
                    </Button>
                  )}
                </div>

                <div className={`${mateInsetPanelClass} mt-4 p-4`}>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">관리 기준</p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  Secondary Controls
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">보조 관리 영역</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  수정과 삭제는 승인 결정 뒤에 다루는 보조 액션입니다. 주 판단 흐름과 섞이지 않도록 아래에 분리했습니다.
                </p>
                <div className="mt-4 space-y-2">
                  {canEdit ? (
                    <Button
                      onClick={handleStartEdit}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-border dark:text-gray-200 dark:hover:bg-secondary"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      파티 정보 수정
                    </Button>
                  ) : (
                    <div className={`${mateInsetPanelClass} p-4 text-sm text-gray-500 dark:text-gray-300`}>
                      승인 완료 이후에는 파티 정보를 수정할 수 없습니다.
                    </div>
                  )}
                  <Button
                    onClick={handleDeleteParty}
                    disabled={isDeleting}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? '삭제 중...' : '파티 삭제'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {(primaryMobileAction || secondaryMobileAction) && (
          <div
            className={`${mateMobileBarClass} lg:hidden`}
          >
            <div className="mx-auto max-w-6xl">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  관리 요약
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {pendingApplications.length > 0
                    ? `응답 필요 ${pendingApplications.length}건`
                    : `다음 단계: ${nextStepSummary}`}
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                {secondaryMobileAction && (
                  <Button
                    onClick={secondaryMobileAction.onClick}
                    variant="outline"
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
      </div>
    </div>
  );
}
