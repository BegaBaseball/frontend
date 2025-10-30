import { create } from 'zustand';

export type ViewType =
  | 'home'
  | 'login'
  | 'signup'
  | 'stadium'
  | 'diary'
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
  | 'mypage';

const viewToPath: Record<ViewType, string> = {
  home: '/',
  login: '/login',
  signup: '/signup',
  stadium: '/stadium',
  diary: '/diary',
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
  mypage: '/mypage',
};

const pathToView = Object.fromEntries(
  Object.entries(viewToPath).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>;

const isBrowser = typeof window !== 'undefined';

const getViewFromLocation = (): ViewType => {
  if (!isBrowser) {
    return 'home';
  }
  const currentPath = window.location.pathname || '/';
  return pathToView[currentPath] ?? 'home';
};

const navigate = (view: ViewType) => {
  if (!isBrowser) {
    return;
  }
  const targetPath = viewToPath[view] ?? '/';
  if (window.location.pathname !== targetPath) {
    window.history.pushState({ view }, '', targetPath);
  }
};

let popstateRegistered = false;

interface NavigationState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  navigateToLogin: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => {
  if (isBrowser && !popstateRegistered) {
    window.addEventListener('popstate', () => {
      set({ currentView: getViewFromLocation() });
    });
    popstateRegistered = true;
  }

  return {
    currentView: getViewFromLocation(),
    setCurrentView: (view) => {
      navigate(view);
      set({ currentView: view });
    },
    navigateToLogin: () => {
      navigate('login');
      set({ currentView: 'login' });
    },
  };
});
