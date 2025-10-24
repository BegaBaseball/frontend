export interface AppUser {
  id: number;
  email: string;
  displayName: string;
  favoriteTeamId: string;
  role: string;
}

export interface PostSummary {
  id: number;
  teamId: string;
  title: string;
  author: string;
  createdAt: string;
  comments: number;
  likes: number;
  views: number;
  isHot: boolean;
  postType: string;
}

export interface PostDetail {
  id: number;
  teamId: string;
  title: string;
  content: string;
  author: string;
  authorEmail: string;
  createdAt: string;
  comments: number;
  likes: number;
  likedByMe: boolean;
  isOwner: boolean;
  imageUrls: string[];
  views: number;
  postType: string;
}

export interface Comment {
  id: number;
  author: string;
  authorEmail: string;
  authorTeamId: string;
  content: string;
  createdAt: string;
}

export interface CreatePostRequest {
  teamId: string;
  title: string;
  content: string;
  images?: string[];
  postType?: string;
}

export interface UpdatePostRequest {
  title: string;
  content: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface DevUser {
  email: string;
  name: string;
  team: string;
}

export interface Page<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}