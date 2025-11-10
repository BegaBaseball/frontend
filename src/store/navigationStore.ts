import { create } from 'zustand';
import { useCheerStore } from './cheerStore';

export type ViewType =
  | 'home'
  | 'login'
  | 'signup'
  | 'passwordReset'
  | 'passwordResetConfirm'
  | 'stadium'
  | 'prediction'
  | 'cheer'
  | 'cheerWrite'
  | 'cheerDetail'
  | 'cheerEdit'
  | 'mate'
  | 'mateCreate'
  | 'mateDetail'
  | 'mateApply'
  | 'mateCheckIn'
  | 'mateChat'
  | 'mateManage'
  | 'admin'
  | 'mypage';

type NavigationOptions = {
  postId?: number;
  token?: string; // 🔥 토큰 추가
  [key: string]: any; // 🔥 다른 파라미터들
};

const viewToPath: Record<ViewType, string> = {
  home: '/',
  login: '/login',
  signup: '/signup',
  passwordReset: '/password-reset', // 🔥 수정
  passwordResetConfirm: '/password-reset/confirm', // 🔥 수정
  stadium: '/stadium',
  prediction: '/prediction',
  cheer: '/cheer',
  cheerWrite: '/cheer/write',
  cheerDetail: '/cheer/detail',
  cheerEdit: '/cheer/edit',
  mate: '/mate',
  mateCreate: '/mate/create',
  mateDetail: '/mate/detail',
  mateApply: '/mate/apply',
  mateCheckIn: '/mate/check-in',
  mateChat: '/mate/chat',
  mateManage: '/mate/manage',
  admin: '/admin',
  mypage: '/mypage',
};

const pathToView = Object.fromEntries(
  Object.entries(viewToPath).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>;

const isBrowser = typeof window !== 'undefined';
const cheerDetailPattern = /^\/cheer\/detail\/(\d+)$/;
const cheerEditPattern = /^\/cheer\/edit\/(\d+)$/;
let lastCheerDetailId: number | null = null;

const getViewFromLocation = (): ViewType => {
  if (!isBrowser) {
    return 'home';
  }
  const currentPath = window.location.pathname || '/';

  // cheerDetail 패턴 체크
  const detailMatch = cheerDetailPattern.exec(currentPath);
  if (detailMatch) {
    const postId = Number(detailMatch[1]);
    if (!Number.isNaN(postId)) {
      lastCheerDetailId = postId;
      useCheerStore.getState().setSelectedPostId(postId);
      return 'cheerDetail';
    }
  }

  // cheerEdit 패턴 체크
  const editMatch = cheerEditPattern.exec(currentPath);
  if (editMatch) {
    const postId = Number(editMatch[1]);
    if (!Number.isNaN(postId)) {
      lastCheerDetailId = postId;
      useCheerStore.getState().setSelectedPostId(postId);
      return 'cheerEdit';
    }
  }

  lastCheerDetailId = null;
  return pathToView[currentPath] ?? 'home';
};

const navigate = (view: ViewType, options?: NavigationOptions) => {
  if (!isBrowser) {
    return;
  }
  let targetPath = viewToPath[view] ?? '/';

  if (view === 'cheerDetail') {
    const postId =
      options?.postId ??
      useCheerStore.getState().selectedPostId ??
      lastCheerDetailId;
    if (postId != null) {
      targetPath = `/cheer/detail/${postId}`;
      lastCheerDetailId = postId;
    }
  } else if (view === 'cheerEdit') {
    const postId =
      options?.postId ??
      useCheerStore.getState().selectedPostId ??
      lastCheerDetailId;
    if (postId != null) {
      targetPath = `/cheer/edit/${postId}`;
      lastCheerDetailId = postId;
    }
  } else {
    lastCheerDetailId = null;
  }

  if (window.location.pathname !== targetPath) {
    window.history.pushState({ view, postId: lastCheerDetailId }, '', targetPath);
  }
};

let popstateRegistered = false;

interface NavigationState {
  currentView: ViewType;
  params?: NavigationOptions; // 🔥 추가
  setCurrentView: (view: ViewType, options?: NavigationOptions) => void;
  navigateToLogin: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => {
  if (isBrowser && !popstateRegistered) {
    window.addEventListener('popstate', () => {
      set({ currentView: getViewFromLocation(), params: undefined }); // 🔥 params 초기화
    });
    popstateRegistered = true;
  }

  return {
    currentView: getViewFromLocation(),
    params: undefined, // 🔥 추가
    setCurrentView: (view, options) => {
  // 🔥 비밀번호 재설정 확인 페이지는 URL 변경하지 않음 (토큰 유지)
  if (view === 'passwordResetConfirm' || view === 'passwordReset') {
    set({ currentView: view, params: options });
    return;
  }

  if (view === 'cheerDetail' || view === 'cheerEdit') {
    const postId =
      options?.postId ??
      useCheerStore.getState().selectedPostId ??
      lastCheerDetailId;
    if (postId != null) {
      useCheerStore.getState().setSelectedPostId(postId);
      lastCheerDetailId = postId;
    }
    navigate(view, { postId });
    set({ currentView: view, params: { postId } });
  } else {
    navigate(view);
    set({ currentView: view, params: options });
  }
},
    navigateToLogin: () => {
      navigate('login');
      set({ currentView: 'login', params: undefined }); // 🔥 params 초기화
    },
  };
});