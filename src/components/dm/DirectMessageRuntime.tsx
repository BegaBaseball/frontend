import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bootstrapDirectMessageRoom, deleteDirectMessage, fetchDirectMessages, sendDirectMessage } from '../../api/dm';
import { useDmSocket } from '../../hooks/useDmSocket';
import { useAuthProfileSnapshot, useAuthSession } from '../../store/authStore';
import type { DirectMessage } from '../../types/dm';
import { parseError, type ParsedError } from '../../utils/errorUtils';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { TrashIcon } from '../icons/CheerIcons';
import { ArrowLeftIcon, MessageCircleIcon, SpinnerIcon, XCircleIcon } from '../icons/PublicShellIcons';

const DM_QUERY_KEYS = {
  roomBootstrap: (handle: string) => ['dmRoomBootstrap', handle] as const,
  messages: (roomId: number) => ['dmMessages', roomId] as const,
};

const normalizeHandle = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.startsWith('@') ? value : `@${value}`;
};

const sortMessages = (messages: DirectMessage[]) => (
  [...messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
);

const buildProfilePath = (handle?: string): string => {
  if (!handle) {
    return '/home';
  }
  return `/profile/${encodeURIComponent(handle.replace(/^@/, ''))}`;
};

export default function DirectMessageRuntime() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId: currentUserId } = useAuthSession();
  const {
    userName: currentUserName,
    userHandle: currentUserHandle,
  } = useAuthProfileSnapshot();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inlineAccessError, setInlineAccessError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const normalizedHandle = normalizeHandle(handle);

  const bootstrapQuery = useQuery({
    queryKey: normalizedHandle ? DM_QUERY_KEYS.roomBootstrap(normalizedHandle) : ['dmRoomBootstrap', 'missing'],
    queryFn: () => bootstrapDirectMessageRoom(normalizedHandle!),
    enabled: Boolean(normalizedHandle),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const roomId = bootstrapQuery.data?.roomId ?? null;
  const targetUser = bootstrapQuery.data?.targetUser ?? null;
  const profilePath = buildProfilePath(targetUser?.handle ?? normalizedHandle);

  const messagesQuery = useQuery({
    queryKey: roomId ? DM_QUERY_KEYS.messages(roomId) : ['dmMessages', 'missing'],
    queryFn: () => fetchDirectMessages(roomId!),
    enabled: roomId != null,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const messages = messagesQuery.data ?? [];

  const mergeMessage = (current: DirectMessage[], incoming: DirectMessage): DirectMessage[] => {
    let replaced = false;
    const next = current.map((message) => {
      const sameId = String(message.id) === String(incoming.id);
      const sameClientMessage = Boolean(
        incoming.clientMessageId
        && message.clientMessageId
        && incoming.clientMessageId === message.clientMessageId
        && Number(incoming.senderId) === Number(message.senderId),
      );

      if (!sameId && !sameClientMessage) {
        return message;
      }

      replaced = true;
      return {
        ...message,
        ...incoming,
        isPending: false,
      };
    });

    if (!replaced) {
      next.push(incoming);
    }

    return sortMessages(next);
  };

  const updateMessagesCache = (updater: (current: DirectMessage[]) => DirectMessage[]) => {
    if (roomId == null) {
      return;
    }

    queryClient.setQueryData<DirectMessage[]>(DM_QUERY_KEYS.messages(roomId), (current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return updater(safeCurrent);
    });
  };

  const handleDeleteMessage = useCallback(async (messageId: number | string) => {
    if (roomId == null) {
      return;
    }

    const snapshot = queryClient.getQueryData<DirectMessage[]>(DM_QUERY_KEYS.messages(roomId));
    updateMessagesCache((current) => current.filter((m) => String(m.id) !== String(messageId)));
    try {
      await deleteDirectMessage(messageId);
    } catch (error) {
      if (snapshot) {
        queryClient.setQueryData(DM_QUERY_KEYS.messages(roomId), snapshot);
      }
      toast.error(parseError(error).message);
    }
  }, [roomId, queryClient, updateMessagesCache]);

  const { isConnected } = useDmSocket({
    roomId: roomId ?? '',
    enabled: roomId != null && inlineAccessError == null,
    onMessageReceived: (message) => {
      updateMessagesCache((current) => mergeMessage(current, message));
    },
    onMessageDeleted: (messageId) => {
      updateMessagesCache((current) => current.filter((m) => Number(m.id) !== messageId));
    },
  });

  const resolvedInlineError = useMemo<ParsedError | null>(() => {
    if (inlineAccessError) {
      return {
        type: 'PERMISSION',
        message: inlineAccessError,
        statusCode: 403,
      };
    }

    if (bootstrapQuery.error) {
      return parseError(bootstrapQuery.error);
    }

    if (messagesQuery.error) {
      return parseError(messagesQuery.error);
    }

    return null;
  }, [bootstrapQuery.error, inlineAccessError, messagesQuery.error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleRetry = () => {
    setInlineAccessError(null);
    void bootstrapQuery.refetch();
    if (roomId != null) {
      void messagesQuery.refetch();
    }
  };

  const handleSendMessage = async () => {
    if (roomId == null || currentUserId == null) {
      return;
    }

    const trimmed = messageText.trim();
    if (!trimmed) {
      return;
    }

    const clientMessageId = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimisticMessage: DirectMessage = {
      id: `pending-${clientMessageId}`,
      roomId,
      senderId: currentUserId,
      content: trimmed,
      clientMessageId,
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    setMessageText('');
    setIsSending(true);
    updateMessagesCache((current) => mergeMessage(current, optimisticMessage));

    try {
      const savedMessage = await sendDirectMessage(roomId, trimmed, clientMessageId);
      updateMessagesCache((current) => mergeMessage(current, savedMessage));
    } catch (error) {
      updateMessagesCache((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      const parsed = parseError(error);
      if (parsed.type === 'PERMISSION' || parsed.type === 'NOT_FOUND') {
        setInlineAccessError(parsed.message);
      } else {
        toast.error(parsed.message);
        setMessageText(trimmed);
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!normalizedHandle) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 text-center shadow-sm dark:border-border dark:bg-card">
          <XCircleIcon className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="text-base text-gray-600 dark:text-white">대화 상대 핸들이 올바르지 않습니다.</p>
        </div>
      </div>
    );
  }

  if (bootstrapQuery.isLoading || (roomId != null && messagesQuery.isLoading && !messagesQuery.data)) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 transition-colors duration-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-6 w-20" />
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
            <div className="mb-6 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-14 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
              <Skeleton className="h-14 w-3/4 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resolvedInlineError) {
    const isAccessIssue = resolvedInlineError.type === 'PERMISSION' || resolvedInlineError.type === 'NOT_FOUND';

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-border dark:bg-card">
          <XCircleIcon className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isAccessIssue ? '메시지 대화방에 접근할 수 없습니다.' : '메시지 화면을 불러오지 못했습니다.'}
          </h1>
          <p className="mx-auto max-w-md text-[16px] leading-7 text-gray-500 dark:text-white">
            {resolvedInlineError.message}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {!isAccessIssue && (
              <Button variant="outline" onClick={handleRetry}>
                다시 시도
              </Button>
            )}
            <Button onClick={() => navigate(profilePath)}>
              프로필로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const submitDisabled = isSending || messageText.trim().length === 0 || roomId == null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 transition-colors duration-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <button
          type="button"
          onClick={() => navigate(profilePath)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-700 dark:text-white dark:hover:text-gray-100"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          프로필로 돌아가기
        </button>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  src={targetUser?.profileImageUrl}
                  alt={targetUser?.name || '대화 상대'}
                  fallbackName={targetUser?.name || targetUser?.handle || 'DM'}
                  width={48}
                  height={48}
                  showRing
                  ringClassName="p-0.5 bg-black/5 dark:bg-white/10"
                />
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {targetUser?.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-white">
                    {targetUser?.handle}
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-secondary/40 dark:text-white">
                {isConnected ? <MessageCircleIcon className="h-3.5 w-3.5" /> : <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
                {isConnected ? '실시간 연결됨' : '실시간 연결 중'}
              </div>
            </div>
          </div>

          <div className="h-[52vh] overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white px-4 py-5 dark:from-background dark:to-card">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 text-center dark:border-border dark:bg-secondary/20">
                <MessageCircleIcon className="mb-3 h-10 w-10 text-gray-400 dark:text-white" />
                <p className="text-lg font-semibold text-gray-700 dark:text-white">첫 메시지를 보내보세요.</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-white">
                  팔로우로 연결된 사용자와만 1:1 대화를 시작할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isMine = Number(message.senderId) === Number(currentUserId);
                  const authorName = isMine ? (currentUserName || currentUserHandle || '나') : (targetUser?.name || targetUser?.handle || '상대');

                  return (
                    <div
                      key={`${message.id}-${message.clientMessageId || 'no-client'}`}
                      className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-gray-100 bg-white text-gray-900 dark:border-border dark:bg-secondary/40 dark:text-white'
                          } ${message.isPending ? 'opacity-70' : ''}`}
                        >
                          <div className={`mb-1 text-xs font-semibold ${isMine ? 'text-primary-foreground/80' : 'text-gray-500 dark:text-white'}`}>
                            {authorName}
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {message.content}
                          </p>
                          <div className={`mt-2 text-[11px] ${isMine ? 'text-primary-foreground/80' : 'text-gray-400 dark:text-white'}`}>
                            {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {message.isPending ? ' · 전송 중' : ''}
                          </div>
                        </div>
                        {isMine && !message.isPending && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteMessage(message.id)}
                            className="absolute -right-2 -top-2 rounded-full border border-border bg-white p-1 text-muted-foreground opacity-0 shadow transition-opacity hover:text-destructive group-hover:opacity-100 dark:bg-secondary"
                            aria-label="메시지 삭제"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-4 dark:border-border">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-border dark:bg-background">
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="메시지를 입력하세요"
                className="min-h-[72px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-400"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400 dark:text-white">
                  Enter로 전송, Shift+Enter로 줄바꿈
                </p>
                <Button onClick={() => void handleSendMessage()} disabled={submitDisabled}>
                  {isSending ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <MessageCircleIcon className="h-4 w-4" />}
                  메시지 보내기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
