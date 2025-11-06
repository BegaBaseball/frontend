import { create } from 'zustand';

export interface Post {
  id: number;
  teamId?: string | null;
  team: string;
  teamName?: string | null;
  teamShortName?: string | null;
  teamColor?: string | null;
  title: string;
  content?: string;
  author: string;
  authorEmail?: string | null;
  createdAt?: string;
  timeAgo: string;
  comments: number;
  likes: number;
  views?: number;
  isHot: boolean;
  likedByUser?: boolean;
  isOwner?: boolean;
  postType?: string;
  avatar?: string;
  commentList?: Comment[];
  images?: string[];
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  timeAgo: string;
  authorEmail?: string;
  authorTeamId?: string;
  likeCount?: number;
  likedByMe?: boolean;
  replies?: Comment[];
}

interface CheerState {
  activeTab: 'all' | 'myTeam';
  posts: Post[];
  selectedPostId: number | null;
  setActiveTab: (tab: 'all' | 'myTeam') => void;
  setPosts: (posts: Post[]) => void;
  setSelectedPostId: (postId: number | null) => void;
  upsertPost: (post: Post) => void;
  removePost: (id: number) => void;
  setPostLikeState: (id: number, liked: boolean, likes: number) => void;
  setPostCommentCount: (id: number, comments: number) => void;
  clearPosts: () => void;
}

const fallbackTeamColors: Record<string, string> = {
  lg: '#C30452',
  두산: '#131230',
  doosan: '#131230',
  ssg: '#CE0E2D',
  kt: '#000000',
  키움: '#570514',
  kiwoom: '#570514',
  nc: '#315288',
  samsung: '#074CA1',
  삼성: '#074CA1',
  롯데: '#041E42',
  lotte: '#041E42',
  기아: '#EA0029',
  kia: '#EA0029',
  한화: '#FF6600',
  hanwha: '#FF6600',
};

const teamDisplayNames: Record<string, string> = {
  lg: 'LG 트윈스',
  lgtwins: 'LG 트윈스',
  lg트윈스: 'LG 트윈스',
  lg_twins: 'LG 트윈스',
  kt: 'KT 위즈',
  ktwiz: 'KT 위즈',
  kt위즈: 'KT 위즈',
  kt_wiz: 'KT 위즈',
  ssg: 'SSG 랜더스',
  ssg랜더스: 'SSG 랜더스',
  ssg_landers: 'SSG 랜더스',
  doosan: '두산 베어스',
  두산: '두산 베어스',
  두산베어스: '두산 베어스',
  kiwoom: '키움 히어로즈',
  키움: '키움 히어로즈',
  키움히어로즈: '키움 히어로즈',
  hanwha: '한화 이글스',
  한화: '한화 이글스',
  한화이글스: '한화 이글스',
  lotte: '롯데 자이언츠',
  롯데: '롯데 자이언츠',
  롯데자이언츠: '롯데 자이언츠',
  samsung: '삼성 라이온즈',
  삼성: '삼성 라이온즈',
  삼성라이온즈: '삼성 라이온즈',
  nc: 'NC 다이노스',
  ncdinos: 'NC 다이노스',
  nc다이노스: 'NC 다이노스',
  kia: 'KIA 타이거즈',
  기아: 'KIA 타이거즈',
  kiataigers: 'KIA 타이거즈',
  kia타이거즈: 'KIA 타이거즈',
  없음: '없음',
  none: '없음',
};

const normalizeTeamId = (teamId: string) =>
  teamId
    .normalize('NFKC')
    .replace(/[\s_-]/g, '')
    .toLowerCase();

export const getTeamNameById = (teamId?: string | null): string => {
  if (!teamId) {
    return '미선택';
  }

  const directMatch = teamDisplayNames[teamId];
  if (directMatch) {
    return directMatch;
  }

  const normalized = normalizeTeamId(teamId);
  return teamDisplayNames[normalized] ?? teamId;
};

export const getFallbackTeamColor = (teamKey?: string | null): string | undefined => {
  if (!teamKey) return undefined;
  const normalized = normalizeTeamId(teamKey);
  return fallbackTeamColors[normalized] ?? fallbackTeamColors[teamKey] ?? undefined;
};

export const useCheerStore = create<CheerState>((set) => ({
  activeTab: 'all',
  posts: [],
  selectedPostId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPosts: (posts) => set({ posts }),
  setSelectedPostId: (postId) => set({ selectedPostId: postId }),
  upsertPost: (post) =>
    set((state) => {
      const exists = state.posts.findIndex((p) => p.id === post.id);
      if (exists >= 0) {
        const copy = [...state.posts];
        copy[exists] = { ...copy[exists], ...post };
        return { posts: copy };
      }
      return { posts: [post, ...state.posts] };
    }),
  removePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
      selectedPostId: state.selectedPostId === id ? null : state.selectedPostId,
    })),
  setPostLikeState: (id, liked, likes) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === id
          ? {
              ...p,
              likedByUser: liked,
              likes,
            }
          : p
      ),
    })),
  setPostCommentCount: (id, comments) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, comments } : p)),
    })),
  clearPosts: () => set({ posts: [] }),
}));

