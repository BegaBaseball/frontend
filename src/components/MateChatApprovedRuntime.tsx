import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { updateChatReadTimestamp } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getMatePartyMessagesQueryOptions,
  MATE_KEYS,
} from '../hooks/mateChatRoute';
import { type ChatMessage, type Party } from '../types/mate';
import {
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';

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
const CHAT_HISTORY_PAGE_SIZE = 50;

type MateChatApprovedRuntimeProps = {
  party: Party;
  partyId: string;
  currentUser: {
    id: number;
    name: string;
  };
  isHost: boolean;
  isPartyRevalidating: boolean;
};

export default function MateChatApprovedRuntime({
  party,
  partyId,
  currentUser,
  isHost,
  isPartyRevalidating,
}: MateChatApprovedRuntimeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const historyPartyIdRef = useRef<number | null>(null);
  const currentUserIdRef = useRef<number | null>(currentUser.id);
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
    queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return updater(safeCurrent);
    });
  }, [party.id, queryClient]);

  const handleMessageReceived = useCallback((message: ChatMessage) => {
    const pendingIndex = pendingWsSendsRef.current.findIndex((pending) =>
      pending.payload.clientMessageId === message.clientMessageId
    );
    if (pendingIndex >= 0) {
      clearTimeout(pendingWsSendsRef.current[pendingIndex].timer);
      pendingWsSendsRef.current.splice(pendingIndex, 1);
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
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

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

  const messagesQuery = useQuery(getMatePartyMessagesQueryOptions(party.id));
  const messages = messagesQuery.data ?? [];
  const chatLoadError = messagesQuery.error
    ? (getApiErrorStatus(messagesQuery.error) === 403
      ? '승인된 참여자와 호스트만 채팅 기록을 조회할 수 있습니다.'
      : '이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.')
    : null;

  useEffect(() => {
    if (historyPartyIdRef.current === party.id || messagesQuery.isPending || messagesQuery.error) {
      return;
    }

    historyPartyIdRef.current = party.id;
    setHasOlderMessages(messages.length === CHAT_HISTORY_PAGE_SIZE);
  }, [messages.length, messagesQuery.error, messagesQuery.isPending, party.id]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messagesQuery.error && getApiErrorStatus(messagesQuery.error) !== 403) {
      toast.error('이전 메시지를 불러오지 못했습니다.');
    }
  }, [messagesQuery.error]);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return;
    }

    const isNearBottom = element.scrollHeight - (element.scrollTop + element.clientHeight) < 100;
    if (isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
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
  }, [messages, notifyChatUnreadCount, party.id]);

  const mergeMessages = useCallback((current: ChatMessage[], older: ChatMessage[]) => {
    const merged = older.reduce<ChatMessage[]>(
      (result, message) => appendUniqueMessage(result, message),
      [...current],
    );

    return merged.sort((left, right) => {
      const createdAtDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }
      return Number(left.id) - Number(right.id);
    });
  }, [appendUniqueMessage]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasOlderMessages) {
      return;
    }

    const oldestMessage = messagesRef.current[0];
    const beforeId = Number(oldestMessage?.id);
    if (!Number.isFinite(beforeId)) {
      setHasOlderMessages(false);
      return;
    }

    const scrollArea = scrollAreaRef.current;
    const previousScrollHeight = scrollArea?.scrollHeight ?? 0;
    const previousScrollTop = scrollArea?.scrollTop ?? 0;
    setIsLoadingOlderMessages(true);

    try {
      const { fetchPartyMessages } = await loadMateChatApiModule();
      const olderMessages = await fetchPartyMessages(party.id, {
        limit: CHAT_HISTORY_PAGE_SIZE,
        beforeId,
      });

      if (olderMessages.length < CHAT_HISTORY_PAGE_SIZE) {
        setHasOlderMessages(false);
      }

      queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => (
        mergeMessages(Array.isArray(current) ? current : [], olderMessages)
      ));

      requestAnimationFrame(() => {
        if (!scrollArea) {
          return;
        }
        scrollArea.scrollTop = previousScrollTop + (scrollArea.scrollHeight - previousScrollHeight);
      });
    } catch {
      toast.error('이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [hasOlderMessages, isLoadingOlderMessages, mergeMessages, party.id, queryClient]);

  const handleConnectionRestored = useCallback(() => {
    void (async () => {
      try {
        const { fetchPartyMessages } = await loadMateChatApiModule();
        const latestMessages = await fetchPartyMessages(party.id, {
          limit: CHAT_HISTORY_PAGE_SIZE,
        });
        queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => (
          mergeMessages(Array.isArray(current) ? current : [], latestMessages)
        ));
      } catch (error) {
        console.warn('채팅 재연결 후 최신 메시지 동기화에 실패했습니다.', error);
      }
    })();
  }, [mergeMessages, party.id, queryClient]);

  const { sendMessage: sendWebSocketMessage, isConnected } = useWebSocket({
    partyId: party.id,
    onMessageReceived: handleMessageReceived,
    onConnectionRestored: handleConnectionRestored,
    enabled: true,
  });

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
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
    setImagePreviewUrl(URL.createObjectURL(file));
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

  const handleSendMessage = async (event: FormEvent) => {
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
      } catch {
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

          const hasSameRecentOwnMessage = messagesRef.current.some((item) =>
            item.clientMessageId === pendingEntry.payload.clientMessageId
            || (
              Number(item.senderId) === Number(currentUserIdRef.current)
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
      } catch {
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

  if (messagesQuery.isPending && messages.length === 0) {
    return <div className={`${matePageShellClass} flex-1`}>{mateChatViewFallback}</div>;
  }

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
        hasOlderMessages={hasOlderMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
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
        onNavigateBack={() => navigate(isHost ? `/mate/${partyId}/manage` : `/mate/${partyId}`)}
        onNavigateDetail={() => navigate(`/mate/${partyId}`)}
        onNavigateManage={() => navigate(`/mate/${partyId}/manage`)}
        onNavigateCheckIn={() => navigate(`/mate/${partyId}/checkin`)}
        onRefetchMessages={() => void messagesQuery.refetch()}
        onLoadOlderMessages={() => void handleLoadOlderMessages()}
        formatMessageTime={formatMessageTime}
      />
    </Suspense>
  );
}
