import { useNavigate } from 'react-router-dom';

import { cn } from '../lib/utils';
import {
  BookmarkIcon,
  HomeIcon,
  MegaphoneIcon,
  PenSquareIcon,
  UserIcon,
} from './icons/PublicShellIcons';

export type CheerMobileBottomNavItem = 'home' | 'team' | 'bookmarks' | 'profile';

interface CheerMobileBottomNavProps {
  activeItem: CheerMobileBottomNavItem;
  userProfilePath: string;
  onWriteClick: () => void;
  teamAccent?: string;
}

const DEFAULT_ACCENT = '#0f766e';

export default function CheerMobileBottomNav({
  activeItem,
  userProfilePath,
  onWriteClick,
  teamAccent = DEFAULT_ACCENT,
}: CheerMobileBottomNavProps) {
  const navigate = useNavigate();
  const items = [
    { id: 'home', label: '홈', icon: HomeIcon, path: '/home' },
    { id: 'team', label: '응원', icon: MegaphoneIcon, path: '/cheer' },
    { id: 'write', label: '글쓰기', icon: PenSquareIcon, action: onWriteClick },
    { id: 'bookmarks', label: '저장', icon: BookmarkIcon, path: '/cheer/bookmarks' },
    { id: 'profile', label: '내정보', icon: UserIcon, path: userProfilePath },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-4 pt-2 safe-area-bottom lg:hidden"
      data-testid="cheer-mobile-bottom-nav"
      aria-label="응원석 모바일 네비게이션"
    >
      {/* Floating glass capsule */}
      <div className="mx-auto grid h-[60px] max-w-sm grid-cols-5 items-stretch gap-0.5 rounded-[22px] border border-white/80 bg-white/88 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_40px_-16px_rgba(15,67,56,.35)] backdrop-blur-xl dark:border-white/12 dark:bg-black dark:shadow-[0_1px_2px_rgba(0,0,0,.5),0_0_0_1px_rgba(255,255,255,0.06),0_18px_40px_-16px_rgba(15,120,85,0.18)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isWrite = item.id === 'write';
          const isActive = !isWrite && activeItem === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'write') {
                  item.action();
                  return;
                }
                navigate(item.path);
              }}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[10.5px] font-black transition-all duration-200 active:scale-[0.97]',
                isActive
                  ? 'bg-primary text-white shadow-[0_4px_12px_-4px_rgba(45,95,79,.4)]'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8',
              )}
              style={isActive && !isWrite ? { backgroundColor: teamAccent } : undefined}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              data-testid={`cheer-bottom-nav-${item.id}`}
            >
              {isWrite ? (
                <>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(15,23,42,0.22)]"
                    style={{ backgroundColor: teamAccent }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="leading-none text-gray-500 dark:text-gray-300">{item.label}</span>
                </>
              ) : (
                <>
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="truncate leading-none">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
