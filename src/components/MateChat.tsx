import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { Alert, AlertDescription } from './ui/alert';
import { MateAlertCircleIcon, MateChevronLeftIcon, MateInfoIcon } from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getMatePartyMyApplicationQueryOptions,
  getMatePartyMessagesQueryOptions,
  MATE_KEYS,
  useMatePartyFromRoute,
} from '../hooks/mateChatRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { updateChatReadTimestamp } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { ChatMessage } from '../types/mate';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
  mateInsetPanelClass,
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { isPartyHostedByUser } from '../utils/mate';

const LazyMateChatViewRuntime = lazy(() => import('./MateChatViewRuntime'));

let mateChatApiModulePromise: Promise<typeof import('../api/mate')> | null = null;
let mateValidationModulePromise: Promise<typeof import('../utils/mateValidation')> | null = null;

const loadMateChatApiModule = () => {
  if (!mateChatApiModulePromise) {
    mateChatApiModulePromise = import('../api/mate');
  }
  return mateChatApiModulePromise;
};

const loadMateValidationModule = () => {
  if (!mateValidationModulePromise) {
    mateValidationModulePromise = import('../utils/mateValidation');
  }
  return mateValidationModulePromise;
};

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';

function MateChatStateLayout({ children }: { children: ReactNode }) {
  return (
    <div className={matePageShellClass}>
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top pointer-events-none opacity-30"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export default function MateChat() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const {
    userEmail: authUserEmail,
    userName: authUserName,
    userHandle: authUserHandle,
  } = useAuthProfileSnapshot();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();

  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentUserIdRef = useRef<number | null>(null);
  const pendingWsSendsRef = useRef<Array<{
    payload: {
      partyId: number;
      message: string;
      imageUrl?: string;
      clientMessageId: string;
    };
    timer: ReturnType<typeof setTimeout>;
  }>>([]);

  const appendUniqueMessage = useCallback((base: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
    if (base.some((item) =>
      item.id === incoming.id
      || (
        incoming.clientMessageId
        && item.clientMessageId
        && item.clientMessageId === incoming.clientMessageId
      )
      || (
        Number(item.senderId) === Number(incoming.senderId)
        && item.message === incoming.message
        && (item.imageUrl || '') === (incoming.imageUrl || '')
        && Math.abs(new Date(item.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 5000
      )
    )) {
      return base;
    }
    return [...base, incoming];
  }, []);

  const updateMessageCache = useCallback((updater: (current: ChatMessage[]) => ChatMessage[]) => {
    if (!party?.id) {
      return;
    }

    queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return updater(safeCurrent);
    });
  }, [queryClient, party?.id]);

  const handleMessageReceived = useCallback((message: ChatMessage) => {
    const currentUserId = currentUserIdRef.current;
    if (currentUserId !== null && Number(message.senderId) === Number(currentUserId)) {
      const pendingIndex = pendingWsSendsRef.current.findIndex((pending) =>
        pending.payload.clientMessageId === message.clientMessageId
      );
      if (pendingIndex >= 0) {
        clearTimeout(pendingWsSendsRef.current[pendingIndex].timer);
        pendingWsSendsRef.current.splice(pendingIndex, 1);
      }
    }

    updateMessageCache((prev) => appendUniqueMessage(prev, message));
  }, [appendUniqueMessage, updateMessageCache]);

  const notifyChatUnreadCount = useCallback((count: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(CHAT_UNREAD_UPDATED_EVENT, {
        detail: { count: Math.max(0, count) },
      }),
    );
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      pendingWsSendsRef.current.forEach((pending) => clearTimeout(pending.timer));
      pendingWsSendsRef.current = [];
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const currentUser = currentUserId
    ? {
      id: currentUserId,
      email: authUserEmail ?? '',
      name: authUserName ?? '',
      handle: authUserHandle ?? null,
    }
    : null;

  const { sendMessage: sendWebSocketMessage, isConnected } = useWebSocket({
    partyId: party?.id || '',
    onMessageReceived: handleMessageReceived,
    enabled: Boolean(party && currentUser && !isAuthLoading),
  });

  const getScrollContainer = (): HTMLElement | null => scrollAreaRef.current;

  const isNearBottom = (): boolean => {
    const element = getScrollContainer();
    if (!element) {
      return true;
    }
    return element.scrollHeight - (element.scrollTop + element.clientHeight) < 100;
  };

  const isHost = currentUser && party
    ? isPartyHostedByUser(party, { id: currentUser.id, handle: currentUser.handle ?? null })
    : false;
  const myApplicationQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyMyApplicationQueryOptions(party.id, currentUserId)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId)),
    enabled: Boolean(party?.id && currentUser && !isHost),
  });
  const myApplication = myApplicationQuery.data ?? null;
  const isCheckingApproval = Boolean(party && currentUser && !isHost && myApplicationQuery.isPending);
  const approvalLoadError = myApplicationQuery.error
    ? '신청 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
    : null;
  const canLoadMessages = Boolean(party?.id && currentUser && (isHost || myApplication?.isApproved));
  const messagesQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyMessagesQueryOptions(party.id)
      : getMatePartyMessagesQueryOptions('unknown')),
    enabled: canLoadMessages,
  });
  const messages = messagesQuery.data ?? [];
  const chatLoadError = messagesQuery.error
    ? (getApiErrorStatus(messagesQuery.error) === 403
      ? '승인된 참여자와 호스트만 채팅 기록을 조회할 수 있습니다.'
      : '이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.')
    : null;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messagesQuery.error && getApiErrorStatus(messagesQuery.error) !== 403) {
      toast.error('이전 메시지를 불러오지 못했습니다.');
    }
  }, [messagesQuery.error]);

  useEffect(() => {
    if (myApplicationQuery.error) {
      toast.error('신청 정보를 확인하지 못했습니다.');
    }
  }, [myApplicationQuery.error]);

  useEffect(() => {
    if (!isNearBottom()) {
      return;
    }
    const element = getScrollContainer();
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!party?.id || !currentUser) {
      return;
    }

    const markAsRead = async () => {
      try {
        await updateChatReadTimestamp(party.id);
        notifyChatUnreadCount(0);
      } catch (error) {
        console.error('읽음 처리 실패', error);
      }
    };

    const timer = setTimeout(markAsRead, 500);
    return () => clearTimeout(timer);
  }, [currentUser, messages, notifyChatUnreadCount, party?.id]);

  if (isAuthLoading || (isPartyLoading && !party) || (canLoadMessages && messagesQuery.isPending && messages.length === 0)) {
    return (
      <div className={`${matePageShellClass} flex flex-col`}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Skeleton className="mb-2 h-9 w-16" />
            <Card className={`p-4 ${mateSectionCardClass}`}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <Card className={`mb-4 flex-1 overflow-hidden p-4 ${mateSectionCardClass}`} style={{ minHeight: '420px' }}>
            <div className="flex-1 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={`recv-${item}`} className="flex justify-start">
                  <div className="flex max-w-[60%] flex-col items-start space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-10 w-40 rounded-2xl" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))}
              {[1, 2].map((item) => (
                <div key={`send-${item}`} className="flex justify-end">
                  <div className="flex max-w-[60%] flex-col items-end space-y-1">
                    <Skeleton className="h-10 w-48 rounded-2xl" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-4 ${mateSectionCardClass}`}>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-16 rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (partyError || !party) {
    return (
      <MateChatStateLayout>
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <MateInfoIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {partyError || '파티 정보를 찾을 수 없습니다.'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/mate')} className="mt-4 w-fit">
              목록으로 돌아가기
            </Button>
          </Card>
      </MateChatStateLayout>
    );
  }

  if (!currentUser) {
    return (
      <MateChatStateLayout>
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                로그인이 필요합니다. 로그인 후 이용해주세요.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))} className="mt-4 w-fit">
              로그인하기
            </Button>
          </Card>
      </MateChatStateLayout>
    );
  }

  if (isCheckingApproval) {
    return (
      <div className={`${matePageShellClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-[16px] text-gray-500 dark:text-gray-300">채팅 접근 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (approvalLoadError) {
    return (
      <MateChatStateLayout>
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25">
              <MateAlertCircleIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {approvalLoadError}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void myApplicationQuery.refetch()}>
                다시 시도
              </Button>
              <Button onClick={() => navigate(`/mate/${id}`)}>
                상세로 돌아가기
              </Button>
            </div>
          </Card>
      </MateChatStateLayout>
    );
  }

  if (!isHost && !myApplication?.isApproved) {
    return (
      <MateChatStateLayout>
          <Button
            variant="ghost"
            onClick={() => navigate(`/mate/${id}`)}
            className="mb-4"
          >
            <MateChevronLeftIcon className="mr-2 h-4 w-4" />
            뒤로
          </Button>
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Chat Access
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">승인 전에는 채팅이 열리지 않습니다</h1>
            <p className="mt-3 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
              호스트의 승인을 기다려주세요. 승인 후에는 이 화면에서 만날 시간, 장소, 체크인 준비를 바로 조율할 수 있습니다.
            </p>
            <div className={`${mateInsetPanelClass} mt-4 p-4 text-[16px] text-gray-600 dark:text-gray-300`}>
              승인 전에는 채팅 기록 조회와 메시지 전송이 모두 제한됩니다.
            </div>
            <Button onClick={() => navigate(`/mate/${id}`)} className="mt-6 w-fit">
              상세로 돌아가기
            </Button>
          </Card>
      </MateChatStateLayout>
    );
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setSelectedImage(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const cancelImageSelection = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openImagePicker = () => {
    if (isUploadingImage) {
      return;
    }

    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      try {
        pickerInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker 호출에 실패하여 click fallback을 사용합니다.', error);
      }
    }

    input.click();
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() && !selectedImage) {
      return;
    }

    if (messageText.trim()) {
      const { validateMateChatMessage } = await loadMateValidationModule();
      const validationError = validateMateChatMessage(messageText);
      if (validationError) {
        toast.warning(validationError);
        return;
      }
    }

    let finalImagePath: string | undefined;

    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        const { uploadChatImage } = await loadMateChatApiModule();
        const uploadResult = await uploadChatImage(selectedImage);
        finalImagePath = uploadResult.path;
      } catch (error) {
        toast.error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const clientMessageId = globalThis.crypto?.randomUUID?.()
      ?? `mate-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newMessage = {
      partyId: party.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      message: messageText.trim() || (finalImagePath ? '(사진 전송)' : ''),
      ...(finalImagePath && { imageUrl: finalImagePath }),
      clientMessageId,
    };

    const persistViaHttp = async () => {
      const { sendChatMessage } = await loadMateChatApiModule();
      const savedMessage = await sendChatMessage(newMessage);
      updateMessageCache((prev) => appendUniqueMessage(prev, savedMessage));
    };

    const wsSent = isConnected && sendWebSocketMessage(newMessage);

    if (wsSent) {
      const pendingEntry = {
        payload: newMessage,
        timer: setTimeout(async () => {
          const pendingIndex = pendingWsSendsRef.current.findIndex((pending) => pending === pendingEntry);
          if (pendingIndex < 0) {
            return;
          }
          pendingWsSendsRef.current.splice(pendingIndex, 1);

          const currentUserId = currentUserIdRef.current;
          const hasSameRecentOwnMessage = currentUserId !== null && messagesRef.current.some((item) =>
            item.clientMessageId === pendingEntry.payload.clientMessageId
            || (
              Number(item.senderId) === Number(currentUserId)
              && item.message === pendingEntry.payload.message
              && (item.imageUrl || '') === (pendingEntry.payload.imageUrl || '')
              && Date.now() - new Date(item.createdAt).getTime() < 7000
            )
          );
          if (hasSameRecentOwnMessage) {
            return;
          }

          try {
            await persistViaHttp();
          } catch {
            toast.error('메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
          }
        }, 1500),
      };
      pendingWsSendsRef.current.push(pendingEntry);
    } else {
      try {
        await persistViaHttp();
      } catch (error) {
        toast.error('메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }
    setMessageText('');
    cancelImageSelection();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    }
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  };

  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach((message) => {
    const dateStr = formatMessageDate(message.createdAt);
    const existingGroup = groupedMessages.find((group) => group.date === dateStr);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groupedMessages.push({ date: dateStr, messages: [message] });
    }
  });

  const canAccessCheckIn = ['MATCHED', 'CHECKED_IN', 'COMPLETED'].includes(party.status);
  const mateChatViewFallback = (
    <>
      <Card className={`p-0 ${mateSectionCardClass}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-3xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={`mate-chat-summary-fallback-${index}`} className={`p-4 ${mateSectionCardClass}`}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-full" />
          </Card>
        ))}
      </div>
      <Card className={`mt-4 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={`mate-chat-thread-fallback-${index}`} className="flex justify-start">
              <div className="max-w-[70%] space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-48 rounded-3xl" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );

  return (
    <Suspense fallback={mateChatViewFallback}>
      <LazyMateChatViewRuntime
        party={party}
        currentUserId={currentUser.id}
        isHost={isHost}
        isConnected={isConnected}
        isPartyRevalidating={isPartyRevalidating}
        canAccessCheckIn={canAccessCheckIn}
        groupedMessages={groupedMessages}
        chatLoadError={chatLoadError}
        messageText={messageText}
        imagePreviewUrl={imagePreviewUrl}
        isUploadingImage={isUploadingImage}
        fileInputRef={fileInputRef}
        scrollAreaRef={scrollAreaRef}
        onMessageTextChange={setMessageText}
        onImageSelect={handleImageSelect}
        onOpenImagePicker={openImagePicker}
        onCancelImageSelection={cancelImageSelection}
        onSubmit={handleSendMessage}
        onNavigateBack={() => navigate(isHost ? `/mate/${id}/manage` : `/mate/${id}`)}
        onNavigateDetail={() => navigate(`/mate/${id}`)}
        onNavigateManage={() => navigate(`/mate/${id}/manage`)}
        onNavigateCheckIn={() => navigate(`/mate/${id}/checkin`)}
        onRefetchMessages={() => void messagesQuery.refetch()}
        formatMessageTime={formatMessageTime}
      />
    </Suspense>
  );
}
