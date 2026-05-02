import {
  AdminBotIcon,
  AdminBugIcon,
  AdminCalendarIcon,
  AdminCameraIcon,
  AdminMapPinIcon,
  AdminMessageSquareIcon,
  AdminNewspaperIcon,
  AdminSearchIcon,
  AdminShieldAlertIcon,
  AdminUsersIcon,
} from './AdminPanelIcons';

export const adminTabItems = [
  { value: 'users', label: '유저', icon: AdminUsersIcon, activeClassName: 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25', testId: 'admin-tab-users' },
  { value: 'posts', label: '게시글', icon: AdminMessageSquareIcon, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' },
  { value: 'parties', label: '메이트', icon: AdminCalendarIcon, activeClassName: 'bg-sky-500 text-slate-900 shadow-lg shadow-sky-500/25' },
  { value: 'reports', label: '신고', icon: AdminSearchIcon, activeClassName: 'bg-red-500 text-slate-900 shadow-lg shadow-red-500/25', testId: 'admin-tab-reports' },
  { value: 'gameStatus', label: '경기 복구', icon: AdminShieldAlertIcon, activeClassName: 'bg-orange-500 text-slate-900 shadow-lg shadow-orange-500/25', testId: 'admin-tab-game-status' },
  { value: 'clientErrors', label: '클라이언트 에러', icon: AdminBugIcon, activeClassName: 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/25', testId: 'admin-tab-client-errors' },
  { value: 'seatViews', label: '시야뷰', icon: AdminCameraIcon, activeClassName: 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/25', testId: 'admin-tab-seat-views' },
  { value: 'offseason', label: '스토브리그', icon: AdminNewspaperIcon, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25', testId: 'admin-tab-offseason' },
  { value: 'stadiums', label: '구장', icon: AdminMapPinIcon, activeClassName: 'bg-violet-500 text-slate-900 shadow-lg shadow-violet-500/25', testId: 'admin-tab-stadiums' },
  { value: 'ai', label: 'AI 운영', icon: AdminBotIcon, activeClassName: 'bg-fuchsia-500 text-slate-900 shadow-lg shadow-fuchsia-500/25', testId: 'admin-tab-ai' },
] as const;

export type AdminTabValue = (typeof adminTabItems)[number]['value'];
