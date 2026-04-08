import { Bot, Bug, Calendar, Camera, MapPin, MessageSquare, Newspaper, Search, ShieldAlert, Users } from 'lucide-react';

export const adminTabItems = [
  { value: 'users', label: '유저', icon: Users, activeClassName: 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25', testId: 'admin-tab-users' },
  { value: 'posts', label: '게시글', icon: MessageSquare, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' },
  { value: 'parties', label: '메이트', icon: Calendar, activeClassName: 'bg-sky-500 text-slate-900 shadow-lg shadow-sky-500/25' },
  { value: 'reports', label: '신고', icon: Search, activeClassName: 'bg-red-500 text-slate-900 shadow-lg shadow-red-500/25', testId: 'admin-tab-reports' },
  { value: 'gameStatus', label: '경기 복구', icon: ShieldAlert, activeClassName: 'bg-orange-500 text-slate-900 shadow-lg shadow-orange-500/25', testId: 'admin-tab-game-status' },
  { value: 'clientErrors', label: '클라이언트 에러', icon: Bug, activeClassName: 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/25', testId: 'admin-tab-client-errors' },
  { value: 'seatViews', label: '시야뷰', icon: Camera, activeClassName: 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/25', testId: 'admin-tab-seat-views' },
  { value: 'offseason', label: '스토브리그', icon: Newspaper, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25', testId: 'admin-tab-offseason' },
  { value: 'stadiums', label: '구장', icon: MapPin, activeClassName: 'bg-violet-500 text-slate-900 shadow-lg shadow-violet-500/25', testId: 'admin-tab-stadiums' },
  { value: 'ai', label: 'AI 운영', icon: Bot, activeClassName: 'bg-fuchsia-500 text-slate-900 shadow-lg shadow-fuchsia-500/25', testId: 'admin-tab-ai' },
] as const;

export type AdminTabValue = (typeof adminTabItems)[number]['value'];
