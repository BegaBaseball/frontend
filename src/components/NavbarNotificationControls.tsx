import { Suspense, lazy } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '../store/uiStore';
import PlainMenu from './ui/plain-menu';

const NotificationPanel = lazy(() => import('./NotificationPanel'));

type NavbarNotificationControlsProps = {
  buttonClassName: string;
};

export default function NavbarNotificationControls({
  buttonClassName,
}: NavbarNotificationControlsProps) {
  const isNotificationOpen = useUIStore((state) => state.isNotificationOpen);
  const setIsNotificationOpen = useUIStore((state) => state.setIsNotificationOpen);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = notifications.reduce(
    (count, notification) => (!notification.isRead ? count + 1 : count),
    0,
  );

  return (
    <PlainMenu
      open={isNotificationOpen}
      onOpenChange={setIsNotificationOpen}
      align="end"
      panelClassName="w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] overflow-hidden sm:w-96 sm:max-w-sm"
      trigger={(
        <button
          type="button"
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className={buttonClassName}
          aria-label={`알림${unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ''}`}
          aria-expanded={isNotificationOpen}
          aria-haspopup="menu"
          aria-controls="global-notification-popover"
        >
          <span
            className={unreadCount > 0 ? 'inline-flex animate-pulse' : 'inline-flex'}
          >
            <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-primary dark:text-primary-light' : ''}`} />
          </span>

          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-background items-center justify-center">
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            </span>
          )}
        </button>
      )}
    >
      <div
        id="global-notification-popover"
        className="
          overflow-hidden rounded-xl
          bg-white dark:bg-card
          border border-gray-200 dark:border-border
          shadow-xl
        "
      >
        <div className="p-4 border-b border-gray-200 dark:border-border bg-gray-50/50 dark:bg-secondary/70 flex justify-between items-center">
          <h3 className="font-bold text-sm text-primary dark:text-primary-light">
            알림
          </h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground dark:text-gray-300">
              {unreadCount}개의 읽지 않은 알림
            </span>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                알림을 불러오는 중...
              </div>
            }
          >
            <NotificationPanel />
          </Suspense>
        </div>
      </div>
    </PlainMenu>
  );
}
