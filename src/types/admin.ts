// types/admin.ts
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  favoriteTeam: string | null;
  createdAt: string;
  postCount: number;
  role: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalMates: number;
}

export interface AdminPost {
  id: number;
  team: string;
  content: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  views: number;
  isHot: boolean;
}

export interface AdminMate {
  id: number;
  teamId: string;
  title: string;
  stadium: string;
  gameDate: string;
  currentMembers: number;
  maxMembers: number;
  status: string;
  createdAt: string;
  hostName: string;
  homeTeam: string;
  awayTeam: string;
  section: string;
}

export interface AdminReport {
  id: number;
  postId: number | null;
  postPreview: string | null;
  reporterId: number | null;
  reporterHandle: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  adminAction: string | null;
  adminMemo: string | null;
  handledBy: number | null;
  handledAt: string | null;
  evidenceUrl: string | null;
  requestedAction: string | null;
  appealStatus: string | null;
  appealReason: string | null;
  appealCount: number | null;
  createdAt: string;
}

export interface AdminReportPage {
  content: AdminReport[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
}

export interface AdminReportFilters {
  status: string;
  reason: string;
  fromDate: string;
  toDate: string;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
