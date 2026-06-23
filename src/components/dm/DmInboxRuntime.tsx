import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchMyDmRooms } from '../../api/dm';
import { useAuthSession } from '../../store/authStore';
import type { DmInboxRoom } from '../../types/dm';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { MessageCircleIcon } from '../icons/PublicShellIcons';

const DM_INBOX_QUERY_KEY = ['dm', 'inbox'] as const;

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const RoomRow = ({ room, onClick }: { room: DmInboxRoom; onClick: () => void }) => {
  const { targetUser, lastMessage, hasUnread } = room;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-border dark:bg-card dark:hover:bg-secondary/50"
      data-testid="dm-inbox-room-row"
    >
      <div className="relative flex-shrink-0">
        <ProfileAvatar
          src={targetUser?.profileImageUrl}
          alt={targetUser?.name ?? '사용자'}
          fallbackName={targetUser?.name}
          width={48}
          height={48}
        />
        {hasUnread && (
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-card" />
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1">
          <span className={`truncate text-sm ${hasUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
            {targetUser?.name ?? '알 수 없는 사용자'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {targetUser?.handle ? `@${targetUser.handle.replace(/^@/, '')}` : ''}
          </span>
        </div>
        {lastMessage ? (
          <p className={`truncate text-sm ${hasUnread ? 'font-semibold text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
            {lastMessage.content}
          </p>
        ) : (
          <p className="truncate text-sm text-gray-400 dark:text-gray-500">대화를 시작해보세요.</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {lastMessage && (
          <span className="block text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(lastMessage.createdAt)}
          </span>
        )}
        {hasUnread && (
          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white" />
        )}
      </div>
    </button>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="mb-4 rounded-full bg-gray-100 p-6 dark:bg-secondary">
      <MessageCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
    </div>
    <p className="mb-1 font-bold text-gray-900 dark:text-white">아직 대화가 없습니다</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      팔로우한 사용자의 프로필에서 메시지를 보내보세요.
    </p>
  </div>
);

export default function DmInboxRuntime() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: DM_INBOX_QUERY_KEY,
    queryFn: fetchMyDmRooms,
    staleTime: 15_000,
    enabled: isLoggedIn,
  });

  const handleRoomClick = (room: DmInboxRoom) => {
    const handle = room.targetUser?.handle?.replace(/^@/, '');
    if (handle) {
      navigate(`/messages/@${handle}`);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 transition-colors duration-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="dm-inbox-title">
          메시지
        </h1>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200 dark:bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-gray-200 dark:bg-secondary" />
                  <div className="h-3 w-40 rounded bg-gray-100 dark:bg-secondary/60" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2" data-testid="dm-inbox-list">
            {rooms.map((room) => (
              <RoomRow key={room.roomId} room={room} onClick={() => handleRoomClick(room)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
