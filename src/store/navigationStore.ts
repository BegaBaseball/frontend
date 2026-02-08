import { create } from 'zustand';
// import { useCheerStore } from './cheerStore'; // Removed

export type ViewType =
  | 'home'
  | 'login'
  | 'signup'
  | 'passwordReset'
  | 'passwordResetConfirm'
  | 'stadium'
  | 'prediction'
  | 'cheer'
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
  token?: string;
  [key: string]: any;
};

const viewToPath: Record<ViewType, string> = {
  home: '/',
  login: '/login',
  signup: '/signup',
  passwordReset: '/password-reset',
  passwordResetConfirm: '/password-reset/confirm',
  stadium: '/stadium',
  prediction: '/prediction',
  cheer: '/cheer',
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
      // useCheerStore.getState().fetchPostDetail(postId); // Removed
      return 'cheerDetail';
    }
  }

  // cheerEdit 패턴 체크
  const editMatch = cheerEditPattern.exec(currentPath);
  if (editMatch) {
    const postId = Number(editMatch[1]);
    if (!Number.isNaN(postId)) {
      lastCheerDetailId = postId;
      // useCheerStore.getState().fetchPostDetail(postId); // Removed
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
      // useCheerStore.getState().selectedPost?.id ?? // Removed
      lastCheerDetailId;
    if (postId != null) {
      targetPath = `/cheer/${postId}`;
      lastCheerDetailId = postId;
    }
  } else if (view === 'cheerEdit') {
    const postId =
      options?.postId ??
      // useCheerStore.getState().selectedPost?.id ?? // Removed
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
  params?: NavigationOptions;
  setCurrentView: (view: ViewType, options?: NavigationOptions) => void;
  navigateToLogin: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => {
  if (isBrowser && !popstateRegistered) {
    window.addEventListener('popstate', () => {
      set({ currentView: getViewFromLocation(), params: undefined });
    });
    popstateRegistered = true;
  }

  return {
    currentView: getViewFromLocation(),
    params: undefined,
    setCurrentView: (view, options) => {
      if (view === 'passwordResetConfirm' || view === 'passwordReset') {
        set({ currentView: view, params: options });
        return;
      }

      if (view === 'cheerDetail' || view === 'cheerEdit') {
        const postId =
          options?.postId ??
          // useCheerStore.getState().selectedPost?.id ?? // Removed
          lastCheerDetailId;
        if (postId != null) {
          // useCheerStore.getState().fetchPostDetail(postId); // Removed
          lastCheerDetailId = postId;
        }
        navigate(view, { postId: postId ?? undefined });
        set({ currentView: view, params: { postId: postId ?? undefined } });
      } else {
        navigate(view);
        set({ currentView: view, params: options });
      }
    },
    navigateToLogin: () => {
      navigate('login');
      set({ currentView: 'login', params: undefined });
    },
  };
});