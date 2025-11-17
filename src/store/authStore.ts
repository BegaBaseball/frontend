import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const MYPAGE_API_URL = `${API_BASE_URL}/auth/mypage`; 
const AUTH_COOKIE_NAME = 'Authorization';

interface User {
  email: string;
  name?: string; 
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  isAdmin?: boolean;
  profileImageUrl?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean; 
  isAdmin: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  
  fetchProfileAndAuthenticate: () => Promise<void>; 
  setUserProfile: (profile: Omit<User, 'email'> & { email: string, name: string }) => void;
  
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  login: (email: string, name: string, profileImageUrl?: string, role?: string) => void; 
  logout: () => void;
  setFavoriteTeam: (team: string, color: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false, 
      isAdmin: false,
      email: '',
      password: '',
      showPassword: false,

  fetchProfileAndAuthenticate: async () => {

  try {
    const response = await fetch(MYPAGE_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  
    });

    if (response.ok) {
      const result = await response.json();
      
      const profile = result.data;
      const isAdminUser = profile.role === 'ROLE_ADMIN';

      set({
        user: {
          email: profile.email,
          name: profile.name,
          favoriteTeam: profile.favoriteTeam,
          favoriteTeamColor: profile.favoriteTeamColor,
          isAdmin: isAdminUser,
          profileImageUrl: profile.profileImageUrl,
          role: profile.role,
        },
        isLoggedIn: true,
        isAdmin: isAdminUser,
      });
      
      
    } else if (response.status === 401) {
      set({ user: null, isLoggedIn: false, isAdmin: false });
    } else {
      console.warn('⚠️ 프로필 조회 실패:', response.status);
    }
  } catch (error) {
    console.error('❌ 프로필 조회 중 오류:', error);
  }
},
      
      setUserProfile: (profile) => {
        set((state) => ({
          user: state.user ? { 
            ...state.user, 
            ...profile, 
            name: profile.name,
            profileImageUrl: profile.profileImageUrl || state.user.profileImageUrl
          } : null,
        }));
      },
      
      login: (email, name, profileImageUrl, role) => { 
        const isAdminUser = role === 'ROLE_ADMIN';
        
        set({
          user: { 
            email: email, 
            name: name,
            isAdmin: isAdminUser,
            profileImageUrl: profileImageUrl || 'https://placehold.co/100x100/374151/ffffff?text=User',
            role: role
          },
          isLoggedIn: true,
          isAdmin: isAdminUser,
          email: '',
          password: '',
        });
      },

      logout: () => {
        Cookies.remove(AUTH_COOKIE_NAME, { path: '/' }); 
        set({ user: null, isLoggedIn: false, isAdmin: false, email: '', password: '' });
      },
      
      setEmail: (email) => set({ email }),
      setPassword: (password) => set({ password }),
      setShowPassword: (show) => set({ showPassword: show }),
      setFavoriteTeam: (team, color) =>
        set((state) => ({
          user: state.user ? { ...state.user, favoriteTeam: team, favoriteTeamColor: color } : null,
        })),

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isLoggedIn) {
          // persist에서 복원 후 쿠키 확인
          const authCookie = Cookies.get(AUTH_COOKIE_NAME);
          if (authCookie) {
            state.fetchProfileAndAuthenticate();
          } else {
            // 쿠키 없으면 로그아웃 처리
            state.logout();
          }
        }
      },
    }
  )
);