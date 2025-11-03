import { create } from 'zustand';

export interface Post {
  id: number;
  team: string;
  teamColor: string;
  title: string;
  content?: string;
  author: string;
  timeAgo: string;
  comments: number;
  likes: number;
  isHot: boolean;
  avatar?: string;
  likedByUser?: boolean;
  commentList?: Comment[];
  images?: string[];
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  timeAgo: string;
  avatar?: string;
}

interface CheerState {
  activeTab: 'all' | 'myTeam';
  posts: Post[];
  selectedPost: Post | null;
  setActiveTab: (tab: 'all' | 'myTeam') => void;
  setPosts: (posts: Post[]) => void;
  setSelectedPost: (post: Post | null) => void;
  addPost: (post: Omit<Post, 'id' | 'timeAgo' | 'comments' | 'likes' | 'isHot'>) => void;
  updatePost: (id: number, post: Partial<Post>) => void;
  deletePost: (id: number) => void;
  toggleLike: (id: number) => void;
  addComment: (postId: number, comment: Omit<Comment, 'id' | 'timeAgo'>) => void;
}

const teamColors: { [key: string]: string } = {
  'LG': '#C30452',
  '두산': '#131230',
  'SSG': '#CE0E2D',
  'KT': '#000000',
  '키움': '#570514',
  'NC': '#315288',
  '삼성': '#074CA1',
  '롯데': '#041E42',
  '기아': '#EA0029',
  '한화': '#FF6600',
};

const initialPosts: Post[] = [
  {
    id: 1,
    team: 'LG',
    teamColor: teamColors['LG'],
    title: '오늘 역전승 가자!',
    author: '야구팬123',
    timeAgo: '30분 전',
    comments: 24,
    likes: 156,
    isHot: true,
  },
  {
    id: 2,
    team: '두산',
    teamColor: teamColors['두산'],
    title: '양의지 홈런 기원',
    author: '베어스사랑',
    timeAgo: '30분 전',
    comments: 12,
    likes: 87,
    isHot: false,
  },
  {
    id: 3,
    team: 'SSG',
    teamColor: teamColors['SSG'],
    title: '랜더스 화이팅!',
    author: 'SSG팬',
    timeAgo: '1시간 전',
    comments: 45,
    likes: 203,
    isHot: true,
  },
  {
    id: 4,
    team: 'KT',
    teamColor: teamColors['KT'],
    title: '위즈 오늘도 승리하자',
    author: 'KT위즈팬',
    timeAgo: '1시간 전',
    comments: 8,
    likes: 42,
    isHot: false,
  },
  {
    id: 5,
    team: '키움',
    teamColor: teamColors['키움'],
    title: '히어로즈 파이팅!!',
    author: '히어로즈',
    timeAgo: '2시간 전',
    comments: 19,
    likes: 91,
    isHot: false,
  },
  {
    id: 6,
    team: 'NC',
    teamColor: teamColors['NC'],
    title: 'NC 다이노스 응원합니다',
    author: '다이노팬',
    timeAgo: '3시간 전',
    comments: 15,
    likes: 68,
    isHot: false,
  },
];

export const useCheerStore = create<CheerState>((set) => ({
  activeTab: 'all',
  posts: initialPosts,
  selectedPost: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPosts: (posts) => set({ posts }),
  setSelectedPost: (post) => set({ selectedPost: post }),
  addPost: (newPost) =>
    set((state) => ({
      posts: [
        {
          ...newPost,
          id: Math.max(...state.posts.map((p) => p.id), 0) + 1,
          timeAgo: '방금 전',
          comments: 0,
          likes: 0,
          isHot: false,
        },
        ...state.posts,
      ],
    })),
  updatePost: (id, updatedPost) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updatedPost } : p)),
      selectedPost: state.selectedPost?.id === id ? { ...state.selectedPost, ...updatedPost } : state.selectedPost,
    })),
  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
      selectedPost: state.selectedPost?.id === id ? null : state.selectedPost,
    })),
  toggleLike: (id) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === id
          ? {
              ...p,
              likes: p.likedByUser ? p.likes - 1 : p.likes + 1,
              likedByUser: !p.likedByUser,
            }
          : p
      ),
    })),
  addComment: (postId, comment) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments + 1,
              commentList: [
                ...(p.commentList || []),
                {
                  ...comment,
                  id: Math.max(...(p.commentList?.map((c) => c.id) || [0]), 0) + 1,
                  timeAgo: '방금 전',
                },
              ],
            }
          : p
      ),
    })),
}));
