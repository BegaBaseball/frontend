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

const ADMIN_ACTIVE_TAB_CLASS = 'bg-amber-500 text-slate-950 shadow-sm';

export const adminTabItems = [
  { value: 'users', label: '유저', icon: AdminUsersIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-users' },
  { value: 'posts', label: '게시글', icon: AdminMessageSquareIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS },
  { value: 'parties', label: '메이트', icon: AdminCalendarIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS },
  { value: 'reports', label: '신고', icon: AdminSearchIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-reports' },
  { value: 'gameStatus', label: '경기 복구', icon: AdminShieldAlertIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-game-status' },
  { value: 'clientErrors', label: '클라이언트 에러', icon: AdminBugIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-client-errors' },
  { value: 'seatViews', label: '시야뷰', icon: AdminCameraIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-seat-views' },
  { value: 'offseason', label: '스토브리그', icon: AdminNewspaperIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-offseason' },
  { value: 'stadiums', label: '구장', icon: AdminMapPinIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-stadiums' },
  { value: 'ai', label: 'AI 운영', icon: AdminBotIcon, activeClassName: ADMIN_ACTIVE_TAB_CLASS, testId: 'admin-tab-ai' },
] as const;

export type AdminTabValue = (typeof adminTabItems)[number]['value'];
