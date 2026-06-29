import { lazy, Suspense, type ChangeEvent, type FormEvent, type MutableRefObject } from 'react';

import {
  MateAlertCircleIcon,
  MateUsersIcon,
  MateWifiIcon,
  MateWifiOffIcon,
} from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { type ChatMessage } from '../types/mate';
import { cn } from '../lib/utils';
import {
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';

const MateChatComposerPanel = lazy(() => import('./MateChatComposerPanel'));

type GroupedMessages = {
  date: string;
  messages: ChatMessage[];
};

type MateChatConversationPanelProps = {
  currentUserId: number;
  isHost: boolean;
  isConnected: boolean;
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
  onRefetchMessages: () => void;
  formatMessageTime: (dateString: string) => string;
};

function ChatEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <MateUsersIcon className="h-8 w-8 text-gray-400 dark:text-white" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-md text-body leading-6 text-gray-500 dark:text-white">{description}</p>
    </div>
  );
}

function SectionDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-gray-200 dark:bg-border ${className}`} aria-hidden="true" />;
}

export default function MateChatConversationPanel({
  currentUserId,
  isHost,
  isConnected,
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
  onRefetchMessages,
  formatMessageTime,
}: MateChatConversationPanelProps) {
  return (
    <>
      {chatLoadError && (
        <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <MateAlertCircleIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-200">
            <span>{chatLoadError}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
              onClick={onRefetchMessages}
            >
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className={`mt-4 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`} data-testid="mate-chat-shell">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              Conversation
            </p>
            <h2 className="mt-2 text-lg font-black text-gray-900 dark:text-white">대화 기록</h2>
            <p className="mt-1 text-body text-gray-600 dark:text-white">
              공용 일정, 전달 시간, 체크인 준비는 이 대화 흐름을 기준으로 정리합니다.
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-body font-semibold',
              isConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
            )}
          >
            {isConnected ? (
              <>
                <MateWifiIcon className="mr-1.5 h-3.5 w-3.5" />
                실시간 연결
              </>
            ) : (
              <>
                <MateWifiOffIcon className="mr-1.5 h-3.5 w-3.5" />
                재연결 중
              </>
            )}
          </span>
        </div>

        <div ref={scrollAreaRef} className="min-h-[360px] flex-1 overflow-y-auto pr-2 sm:min-h-[420px] sm:pr-4">
          {groupedMessages.length === 0 ? (
            <ChatEmptyState
              title="아직 대화가 시작되지 않았습니다"
              description={
                isHost
                  ? '승인된 참여자에게 먼저 인사를 건네고, 만날 시간과 장소를 선점하세요.'
                  : '호스트에게 인사하고, 경기장 도착 동선과 체크인 준비를 먼저 맞춰두세요.'
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="mb-4 flex items-center gap-4">
                    <SectionDivider className="flex-1" />
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-body text-gray-500 dark:bg-secondary/80 dark:text-white">
                      {group.date}
                    </span>
                    <SectionDivider className="flex-1" />
                  </div>

                  <div className="space-y-3">
                    {group.messages.map((message) => {
                      const isMyMessage = Number(message.senderId) === Number(currentUserId);
                      return (
                        <div
                          key={message.id}
                          className={cn('flex', isMyMessage ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'flex max-w-[84%] flex-col sm:max-w-[78%]',
                              isMyMessage ? 'items-end' : 'items-start',
                            )}
                          >
                            {!isMyMessage && (
                              <span className="mb-1 text-body text-gray-600 dark:text-white">
                                {message.senderName}
                              </span>
                            )}
                            <div
                              className={cn(
                                'rounded-3xl px-4 py-3 shadow-sm',
                                isMyMessage
                                  ? 'bg-primary text-white'
                                  : 'border border-gray-200/80 bg-gray-100 text-gray-900 dark:border-border/70 dark:bg-secondary/80 dark:text-white',
                              )}
                            >
                              {message.imageUrl && (
                                <div className="mb-2 -mx-1 -mt-1 overflow-hidden rounded-2xl border border-black/5 bg-white/20 dark:border-white/10">
                                  <img
                                    src={message.imageUrl}
                                    alt="Attachment"
                                    className="h-auto w-full max-w-[240px] rounded-xl object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">
                                {message.message}
                              </p>
                            </div>
                            <span className="mt-1 text-body text-gray-400 dark:text-white">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-4">
        <Suspense fallback={(
          <>
            <Card className={`p-3 sm:p-4 ${mateSectionCardClass}`}>
              <div className="flex items-end gap-2">
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
                <Skeleton className="h-10 w-16 shrink-0 rounded-md" />
              </div>
            </Card>
            <Card className={`mt-4 p-4 ${mateSectionCardClass}`}>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <Skeleton className="mt-2 h-4 w-4/6" />
            </Card>
          </>
        )}>
          <MateChatComposerPanel
            chatImageInputId="mate-chat-image-upload"
            fileInputRef={fileInputRef}
            messageText={messageText}
            imagePreviewUrl={imagePreviewUrl}
            isUploadingImage={isUploadingImage}
            isConnected={isConnected}
            onMessageTextChange={onMessageTextChange}
            onImageSelect={onImageSelect}
            onOpenImagePicker={onOpenImagePicker}
            onCancelImageSelection={onCancelImageSelection}
            onSubmit={onSubmit}
          />
        </Suspense>
      </div>
    </>
  );
}
