import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRightCircle,
  Calendar,
  ChevronLeft,
  ImageIcon,
  Info,
  Loader2,
  LucideIcon,
  MapPin,
  MessageSquare,
  Send,
  Shield,
  Ticket,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getMatePartyMyApplicationQueryOptions,
  getMatePartyMessagesQueryOptions,
  MATE_KEYS,
  useMatePartyFromRoute,
} from '../hooks/mateChatRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { sendChatMessage, uploadChatImage, updateChatReadTimestamp } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { ChatMessage } from '../types/mate';
import { cn } from '../lib/utils';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
  getPartyFlowLabel,
  getPartyStatusMeta,
  mateHeroCardClass,
  mateInsetPanelClass,
  matePageShellClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';
import { formatGameDate, isPartyHostedByUser } from '../utils/mate';
import { validateMateChatMessage } from '../utils/mateValidation';

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';

type SummaryItemProps = {
  icon: LucideIcon;
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

function ChatEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SectionDivider({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-gray-200 dark:bg-border ${className}`} aria-hidden="true" />;
}

export default function MateChat() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const chatImageInputId = 'mate-chat-image-upload';
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
    };
    timer: ReturnType<typeof setTimeout>;
  }>>([]);

  const appendUniqueMessage = useCallback((base: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
    if (base.some((item) =>
      item.id === incoming.id
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
        pending.payload.message === message.message
        && (pending.payload.imageUrl || '') === (message.imageUrl || '')
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
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <Info className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {partyError || '파티 정보를 찾을 수 없습니다.'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/mate')} className="mt-4 w-fit">
              목록으로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-700 dark:text-red-300">
                로그인이 필요합니다. 로그인 후 이용해주세요.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))} className="mt-4 w-fit">
              로그인하기
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (isCheckingApproval) {
    return (
      <div className={`${matePageShellClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-gray-500 dark:text-gray-300">채팅 접근 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (approvalLoadError) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25">
              <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
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
        </div>
      </div>
    );
  }

  if (!isHost && !myApplication?.isApproved) {
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/mate/${id}`)}
            className="mb-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            뒤로
          </Button>
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
              Chat Access
            </p>
            <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">승인 전에는 채팅이 열리지 않습니다</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              호스트의 승인을 기다려주세요. 승인 후에는 이 화면에서 만날 시간, 장소, 체크인 준비를 바로 조율할 수 있습니다.
            </p>
            <div className={`${mateInsetPanelClass} mt-4 p-4 text-sm text-gray-600 dark:text-gray-300`}>
              승인 전에는 채팅 기록 조회와 메시지 전송이 모두 제한됩니다.
            </div>
            <Button onClick={() => navigate(`/mate/${id}`)} className="mt-6 w-fit">
              상세로 돌아가기
            </Button>
          </Card>
        </div>
      </div>
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
        const uploadResult = await uploadChatImage(selectedImage);
        finalImagePath = uploadResult.path;
      } catch (error) {
        toast.error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const newMessage = {
      partyId: party.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      message: messageText.trim() || (finalImagePath ? '(사진 전송)' : ''),
      ...(finalImagePath && { imageUrl: finalImagePath }),
    };

    const persistViaHttp = async () => {
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
            Number(item.senderId) === Number(currentUserId)
            && item.message === pendingEntry.payload.message
            && (item.imageUrl || '') === (pendingEntry.payload.imageUrl || '')
            && Date.now() - new Date(item.createdAt).getTime() < 7000
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

  const statusMeta = getPartyStatusMeta(party.status);
  const flowLabel = getPartyFlowLabel(party.status);
  const canAccessCheckIn = ['MATCHED', 'CHECKED_IN', 'COMPLETED'].includes(party.status);
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
      icon: MessageSquare,
      label: '대화 권한',
      value: roleLabel,
      detail: approvalLabel,
    },
    {
      icon: Ticket,
      label: '거래 흐름',
      value: flowLabel,
      detail: '채팅 중심으로 전달 일정을 조율합니다.',
    },
    {
      icon: Shield,
      label: '티켓 신뢰',
      value: party.ticketVerified ? '호스트 인증 완료' : '티켓 인증 전',
      detail: party.ticketVerified ? '상세페이지와 동일한 인증 신호가 유지됩니다.' : '추가 인증이 필요한 상태일 수 있습니다.',
    },
    {
      icon: isConnected ? Wifi : WifiOff,
      label: '연결 상태',
      value: isConnected ? '실시간 연결됨' : '재연결 중',
      detail: isConnected ? nextActionLabel : '메시지 전송은 HTTP 폴백으로 계속 시도됩니다.',
    },
  ];

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
            onClick={() => navigate(isHost ? `/mate/${id}/manage` : `/mate/${id}`)}
            className="mb-2 -ml-2"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            뒤로
          </Button>

          <Card className={`p-0 ${mateHeroCardClass}`}>
            <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-5 py-5 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(10,15,20,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-6 sm:py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                    <TeamLogo teamId={party.teamId} size="md" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80 dark:text-emerald-300">
                      {headerTitle}
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                      {heroHeading}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {headerDescription}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MatePill className={cn('border text-xs font-semibold', statusMeta.className)}>
                        {statusMeta.label}
                      </MatePill>
                      <MatePill className="border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                        {flowLabel}
                      </MatePill>
                      <MatePill className="border border-gray-200 bg-white/90 text-gray-700 dark:border-border dark:bg-card/70 dark:text-gray-200">
                        {roleLabel}
                      </MatePill>
                      {party.ticketVerified && (
                        <MatePill className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                          <span className="flex items-center gap-1">
                            <Ticket className="h-3.5 w-3.5" />
                            티켓 인증
                          </span>
                        </MatePill>
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
                        <p className="mt-1 font-medium text-gray-900 dark:text-white">{party.stadium}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">{party.section}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      {isConnected ? <Wifi className="mt-0.5 h-4 w-4 text-emerald-500" /> : <WifiOff className="mt-0.5 h-4 w-4 text-amber-500" />}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">실시간 상태</p>
                        <p className="mt-1 font-medium text-gray-900 dark:text-white">
                          {isConnected ? '실시간 연결됨' : '재연결 중'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          {isConnected ? '읽음 처리와 메시지 수신이 활성화된 상태입니다.' : '전송은 계속 가능하며 연결이 복구되면 동기화됩니다.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button
                      variant="outline"
                      className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto"
                      onClick={() => navigate(`/mate/${id}`)}
                    >
                      상세 보기
                    </Button>
                    {isHost && (
                      <Button
                        variant="outline"
                        className="w-full justify-center border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-border dark:text-gray-200 dark:hover:bg-secondary sm:w-auto"
                        onClick={() => navigate(`/mate/${id}/manage`)}
                      >
                        신청 관리
                      </Button>
                    )}
                    {canAccessCheckIn && (
                      <Button
                        variant="outline"
                        className="w-full justify-center border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/30 sm:w-auto"
                        onClick={() => navigate(`/mate/${id}/checkin`)}
                      >
                        <ArrowRightCircle className="mr-2 h-4 w-4" />
                        체크인
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="chat-summary-strip">
          {summaryItems.map((item) => (
            <SummaryItem key={item.label} {...item} />
          ))}
        </div>

        {isPartyRevalidating && (
          <Alert className="mt-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {chatLoadError && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-200">
              <span>{chatLoadError}</span>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
                onClick={() => void messagesQuery.refetch()}
              >
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className={`mt-4 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`} data-testid="mate-chat-shell">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                Conversation
              </p>
              <h2 className="mt-2 text-lg font-black text-gray-900 dark:text-white">대화 기록</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                공용 일정, 전달 시간, 체크인 준비는 이 대화 흐름을 기준으로 정리합니다.
              </p>
            </div>
            <MatePill className={cn(
              'border text-xs font-semibold',
              isConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
            )}>
              {isConnected ? '실시간 연결' : '재연결 중'}
            </MatePill>
          </div>

          <div ref={scrollAreaRef} className="min-h-[360px] flex-1 overflow-y-auto pr-2 sm:min-h-[420px] sm:pr-4">
            {groupedMessages.length === 0 ? (
              <ChatEmptyState
                icon={Users}
                title="아직 대화가 시작되지 않았습니다"
                description={isHost
                  ? '승인된 참여자에게 먼저 인사를 건네고, 만날 시간과 장소를 선점하세요.'
                  : '호스트에게 인사하고, 경기장 도착 동선과 체크인 준비를 먼저 맞춰두세요.'}
              />
            ) : (
              <div className="space-y-6">
                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="mb-4 flex items-center gap-4">
                      <SectionDivider className="flex-1" />
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-secondary/80 dark:text-gray-300">
                        {group.date}
                      </span>
                      <SectionDivider className="flex-1" />
                    </div>

                    <div className="space-y-3">
                      {group.messages.map((message) => {
                        const isMyMessage = Number(message.senderId) === Number(currentUser.id);
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
                                <span className="mb-1 text-xs text-gray-600 dark:text-gray-300">
                                  {message.senderName}
                                </span>
                              )}
                              <div
                                className={cn(
                                  'rounded-3xl px-4 py-3 shadow-sm',
                                  isMyMessage
                                    ? 'bg-primary text-white'
                                    : 'border border-gray-200/80 bg-gray-100 text-gray-900 dark:border-border/70 dark:bg-secondary/80 dark:text-gray-100',
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
                              <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
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

        <Card className={`mt-4 p-3 sm:p-4 ${mateSectionCardClass}`}>
          {imagePreviewUrl && (
            <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-border dark:bg-secondary/80">
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              {isUploadingImage ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={cancelImageSelection}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input
              id={chatImageInputId}
              type="file"
              accept="image/*"
              className="sr-only"
              ref={fileInputRef}
              onChange={handleImageSelect}
              onClick={(event) => {
                event.currentTarget.value = '';
              }}
              disabled={isUploadingImage}
              aria-label="채팅 이미지 업로드"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isUploadingImage}
              onClick={openImagePicker}
              className="shrink-0"
              aria-label="이미지 업로드"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={isConnected ? '메시지를 입력하세요...' : '연결 재시도 중... (전송은 가능합니다)'}
              className="min-w-0 flex-1"
              disabled={isUploadingImage}
            />
            <Button
              type="submit"
              disabled={(!messageText.trim() && !selectedImage) || isUploadingImage}
              className="shrink-0 bg-primary px-4 text-white sm:px-6"
            >
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </Card>

        <Alert className={`mt-4 ${mateSectionCardClass}`}>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>경기 당일까지 채팅에서 만날 위치와 시간을 확정해두세요.</li>
              <li>개인정보나 결제 민감 정보는 과도하게 공유하지 마세요.</li>
              <li>체크인 단계가 열리면 이 화면 위의 체크인 버튼으로 바로 이어질 수 있습니다.</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
