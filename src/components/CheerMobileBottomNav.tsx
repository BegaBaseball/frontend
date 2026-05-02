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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md safe-area-bottom dark:border-border dark:bg-card/95 lg:hidden"
      data-testid="cheer-mobile-bottom-nav"
      aria-label="응원석 모바일 네비게이션"
    >
      <div className="mx-auto grid h-[68px] max-w-md grid-cols-5 items-center px-1">
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
                'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-xs font-black transition-colors active:scale-[0.98]',
                isActive
                  ? 'text-primary'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
              )}
              style={isActive ? { color: teamAccent } : undefined}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              data-testid={`cheer-bottom-nav-${item.id}`}
            >
              {isWrite ? (
                <>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(15,23,42,0.20)]"
                    style={{ backgroundColor: teamAccent }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-none text-slate-700 dark:text-slate-200">{item.label}</span>
                </>
              ) : (
                <>
                  <Icon className="h-5 w-5" />
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
