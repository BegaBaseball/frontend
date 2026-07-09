import {
  lazy,
  Suspense,
  type ChangeEvent,
  type ComponentType,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
  type SVGProps,
} from 'react';

import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import TeamLogo from './TeamLogo';
import {
  MateArrowRightCircleIcon,
  MateCalendarIcon,
  MateChevronLeftIcon,
  MateMapPinIcon,
  MateMessageSquareIcon,
  MateShieldIcon,
  MateTicketIcon,
  MateWifiIcon,
  MateWifiOffIcon,
} from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';
import { type ChatMessage, type Party } from '../types/mate';
import { cn } from '../lib/utils';
import {
  getPartyFlowLabel,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMetaLabelClass,
  matePageShellClass,
  mateSectionCardClass,
  mateSummaryGridClass,
} from '../utils/mateFlowUi';
import { formatGameDate, getMatePartyDisplayTeamId } from '../utils/mate';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { getMateStatusBadgeMeta } from '../utils/statusBadgeMeta';

const MateChatConversationPanel = lazy(() => import('./MateChatConversationPanel'));

type GroupedMessages = {
  date: string;
  messages: ChatMessage[];
};

type MateChatViewRuntimeProps = {
  party: Party;
  currentUserId: number;
  isHost: boolean;
  isConnected: boolean;
  isPartyRevalidating: boolean;
  canAccessCheckIn: boolean;
  groupedMessages: GroupedMessages[];
  chatLoadError: string | null;
  messageText: string;
  imagePreviewUrl: string | null;
  isUploadingImage: boolean;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  scrollAreaRef: MutableRefObject<HTMLDivElement | null>;
  onMessageTextChange: (value: string) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImagePicker: () => void;
  onCancelImageSelection: () => void;
  onSubmit: (event: FormEvent) => void;
  onNavigateBack: () => void;
  onNavigateDetail: () => void;
  onNavigateManage: () => void;
  onNavigateCheckIn: () => void;
  onRefetchMessages: () => void;
  formatMessageTime: (dateString: string) => string;
};

type SummaryItemProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  detail: string;
};

function SummaryItem({ icon: Icon, label, value, detail }: SummaryItemProps) {
  return (
    <div className={`${mateInsetPanelClass} p-4`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm dark:border-border/70 dark:bg-card/80">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className={mateMetaLabelClass}>
            {label}
          </p>
          <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-body text-gray-500 dark:text-white">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-body font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function MateChatViewRuntime({
  party,
  currentUserId,
  isHost,
  isConnected,
  isPartyRevalidating,
  canAccessCheckIn,
  groupedMessages,
  chatLoadError,
  messageText,
  imagePreviewUrl,
  isUploadingImage,
  fileInputRef,
  scrollAreaRef,
  onMessageTextChange,
  onImageSelect,
  onOpenImagePicker,
  onCancelImageSelection,
  onSubmit,
  onNavigateBack,
  onNavigateDetail,
  onNavigateManage,
  onNavigateCheckIn,
  onRefetchMessages,
  formatMessageTime,
}: MateChatViewRuntimeProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const flowLabel = getPartyFlowLabel(party.status);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const headerTitle = isHost ? '호스트 채팅' : '메이트 채팅';
  const heroHeading = isHost ? '채팅과 체크인 조율' : '호스트와 만남 조율 채팅';
  const headerDescription = isHost
    ? '승인된 참여자와 만날 시간, 전달 방식, 체크인 준비를 한 곳에서 조율합니다.'
    : '호스트와 만날 시간과 장소를 조율하고 체크인 전까지 필요한 정보를 정리합니다.';
  const roleLabel = isHost ? '호스트' : '승인 참여자';
  const approvalLabel = isHost ? '참여자 응답 관리 가능' : '승인 완료로 대화 열림';
  const nextActionLabel = canAccessCheckIn ? '체크인 준비 가능' : '대화 조율 단계';
  const summaryItems = [
    {
      icon: MateMessageSquareIcon,
      label: '대화 권한',
      value: roleLabel,
      detail: approvalLabel,
    },
    {
      icon: MateTicketIcon,
      label: '거래 흐름',
      value: flowLabel,
      detail: '채팅 중심으로 전달 일정을 조율합니다.',
    },
    {
      icon: MateShieldIcon,
      label: '티켓 신뢰',
      value: party.ticketVerified ? '호스트 인증 완료' : '티켓 인증 전',
      detail: party.ticketVerified ? '상세페이지와 동일한 인증 신호가 유지됩니다.' : '추가 인증이 필요한 상태일 수 있습니다.',
    },
    {
      icon: isConnected ? MateWifiIcon : MateWifiOffIcon,
      label: '연결 상태',
      value: isConnected ? '실시간 연결됨' : '재연결 중',
      detail: isConnected ? nextActionLabel : '메시지 전송은 HTTP 폴백으로 계속 시도됩니다.',
    },
  ] satisfies ReadonlyArray<SummaryItemProps>;

  return (
    <div className={`${matePageShellClass} flex flex-col`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.10),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%)]" />
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 pb-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="mb-2 -ml-2"
          >
            <MateChevronLeftIcon className="mr-2 h-4 w-4" />
            뒤로
          </Button>

          <Card className={`status-badge-hover-scope p-0 ${mateHeroCardClass}`}>
            <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-5 py-5 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(0,0,0,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-6 sm:py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                    <TeamLogo teamId={getMatePartyDisplayTeamId(party)} size="md" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-13 font-semibold text-primary/80 dark:text-emerald-300">
                      {headerTitle}
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                      {heroHeading}
                    </h1>
                    <p className="mt-3 max-w-2xl text-body leading-6 text-gray-600 dark:text-white">
                      {headerDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge {...statusMeta} size="md" />
                      <MatePill className="border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                        {flowLabel}
                      </MatePill>
                      <MatePill className="border border-gray-200 bg-white/90 text-gray-700 dark:border-border dark:bg-card/70 dark:text-white">
                        {roleLabel}
                      </MatePill>
                      {party.ticketVerified && (
                        <MatePill className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                          <span className="flex items-center gap-1">
                            <MateTicketIcon className="h-3.5 w-3.5" />
                            티켓 인증
                          </span>
                        </MatePill>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${mateInsetPanelClass} min-w-full p-4 sm:min-w-[280px] lg:max-w-[320px]`}>
                  <div className="grid gap-3 text-body text-gray-600 dark:text-white">
                    <div className="flex items-start gap-3">
                      <MateCalendarIcon className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className={mateMetaLabelClass}>일정</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {formatGameDate(party.gameDate)} {party.gameTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MateMapPinIcon className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className={mateMetaLabelClass}>경기장 / 좌석</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{stadiumDisplayName}</p>
                        <p className="text-body text-gray-500 dark:text-white">{party.section}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      {isConnected ? (
                        <MateWifiIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                      ) : (
                        <MateWifiOffIcon className="mt-0.5 h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className={mateMetaLabelClass}>실시간 상태</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {isConnected ? '실시간 연결됨' : '재연결 중'}
                        </p>
                        <p className="text-body text-gray-500 dark:text-white">
                          {isConnected ? '읽음 처리와 메시지 수신이 활성화된 상태입니다.' : '전송은 계속 가능하며 연결이 복구되면 동기화됩니다.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button
                      variant="outline"
                      className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto"
                      onClick={onNavigateDetail}
                    >
                      상세 보기
                    </Button>
                    {isHost && (
                      <Button
                        variant="outline"
                        className="w-full justify-center border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-border dark:text-white dark:hover:bg-secondary sm:w-auto"
                        onClick={onNavigateManage}
                      >
                        신청 관리
                      </Button>
                    )}
                    {canAccessCheckIn && (
                      <Button
                        variant="outline"
                        className="w-full justify-center border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30 sm:w-auto"
                        onClick={onNavigateCheckIn}
                      >
                        <MateArrowRightCircleIcon className="mr-2 h-4 w-4" />
                        체크인
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={mateSummaryGridClass} data-testid="chat-summary-strip">
          {summaryItems.map((item) => (
            <SummaryItem key={item.label} {...item} />
          ))}
        </div>

        {isPartyRevalidating && (
          <Alert className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
            <AlertDescription className="text-body text-blue-700 dark:text-blue-300">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        <Suspense fallback={null}>
          <MateChatConversationPanel
            currentUserId={currentUserId}
            isHost={isHost}
            isConnected={isConnected}
            groupedMessages={groupedMessages}
            chatLoadError={chatLoadError}
            messageText={messageText}
            imagePreviewUrl={imagePreviewUrl}
            isUploadingImage={isUploadingImage}
            fileInputRef={fileInputRef}
            scrollAreaRef={scrollAreaRef}
            onMessageTextChange={onMessageTextChange}
            onImageSelect={onImageSelect}
            onOpenImagePicker={onOpenImagePicker}
            onCancelImageSelection={onCancelImageSelection}
            onSubmit={onSubmit}
            onRefetchMessages={onRefetchMessages}
            formatMessageTime={formatMessageTime}
          />
        </Suspense>
      </div>
    </div>
  );
}
