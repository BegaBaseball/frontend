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

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}