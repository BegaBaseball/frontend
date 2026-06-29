import { QueryClientProvider, useQuery } from '@tanstack/react-query';

import { queryClient } from '../lib/queryClient';

function PublicNavbarDmUnreadBadgeContent() {
  const { data: dmRoomsData } = useQuery({
    queryKey: ['dm', 'inbox'],
    queryFn: async () => {
      const { fetchMyDmRooms } = await import('../api/dm');
      return fetchMyDmRooms();
    },
    staleTime: 30_000,
  });
  const dmUnreadCount = dmRoomsData?.filter((room) => room.hasUnread).length ?? 0;

  if (dmUnreadCount <= 0) {
    return null;
  }

  return (
    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-10 font-bold leading-none text-white">
      {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
    </span>
  );
}

export default function PublicNavbarDmUnreadBadge() {
  return (
    <QueryClientProvider client={queryClient}>
      <PublicNavbarDmUnreadBadgeContent />
    </QueryClientProvider>
  );
}
