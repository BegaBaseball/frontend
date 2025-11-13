import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie'; // npm install js-cookie 필요!

const MYPAGE_API_URL = 'http://localhost:8080/api/auth/mypage'; 
const AUTH_COOKIE_NAME = 'Authorization';

interface User {
  email: string;
  name?: string; 
  favoriteTeam?: string;
  favoriteTeamColor?: string;
  isAdmin?: boolean;
  profileImageUrl?: string;

}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean; 
  isAdmin: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  
  // 쿠키 기반 인증 및 프로필 로드
  fetchProfileAndAuthenticate: () => Promise<void>; 
  setUserProfile: (profile: Omit<User, 'email'> & { email: string, name: string }) => void; // 마이페이지에서 프로필 업데이트 시 사용
  
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  // login 시 닉네임(name)을 DTO에서 받아와야 함
  login: (email: string, name: string, profileImageUrl?: string) => void; 
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
        
      // 쿠키 검증 및 프로필 로드 로직
      fetchProfileAndAuthenticate: async () => {
        try {
          const response = await fetch(MYPAGE_API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // JWT 쿠키를 포함하여 요청
          });

          if (response.ok) {
            const result = await response.json();
            const profile = result.data as { name: string, email: string }; 
            
            // 인증 성공: 상태 업데이트
            set((state) => ({
              user: { ...state.user, ...profile, name: profile.name, email: profile.email },
              isLoggedIn: true,
            }));
            
          } else {
            // 인증 실패: 쿠키 만료/없음 -> 로그아웃 처리
            Cookies.remove(AUTH_COOKIE_NAME, { path: '/' }); 
            set({ user: null, isLoggedIn: false });
          }
        } catch (error) {
          console.error('인증 상태 확인 중 오류 발생:', error);
          set({ user: null, isLoggedIn: false });
        }
      },
      
      // 마이페이지에서 프로필 수정 후 상태 업데이트
      setUserProfile: (profile) => {
        set((state) => ({
          user: state.user ? { 
            ...state.user, 
            ...profile, 
            name: profile.name,
            profileImageUrl: profile.profileImageUrl || state.user.profileImageUrl // ✅ 추가
          } : null,
        }));
      },
      
      //   set({
      //     user: { email, name }, // name 필드에 닉네임 저장
      //     isLoggedIn: true, 
      //     email: '',
      //     password: '',
      //   });
      // },
      // 로그인
      login: (email, name, profileImageUrl) => { 
        const isAdminUser = email === 'admin' || email === 'admin@bega.com';
        set({
          user: { 
            email: email, 
            name: name,
            isAdmin: isAdminUser,
            profileImageUrl: profileImageUrl || 'https://placehold.co/100x100/374151/ffffff?text=User' // ✅ 추가
          },
          isLoggedIn: true,
          isAdmin: isAdminUser,
          email: '',
          password: '',
        });
      },

      
      // 로그아웃 (클라이언트 쿠키 삭제)
      logout: () => {
        // 서버에서 쿠키 만료 응답을 받더라도, 클라이언트에서 보조적으로 삭제
        Cookies.remove(AUTH_COOKIE_NAME, { path: '/' }); 
        set({ user: null, isLoggedIn: false, isAdmin: false, email: '', password: '' }); // <-- isAdmin: false 추가
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
      // partialize는 그대로 유지하여 필요한 데이터만 로컬 스토리지에 저장
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        isAdmin: state.isAdmin,
      }),
      // Hydration 완료 후 서버에 인증 상태 재검증 요청 (새로고침 시)
      onRehydrateStorage: () => (state) => {
        if (state?.isLoggedIn) {
          // 인증 플래그가 true면, 쿠키가 유효한지 서버에 확인하도록 요청
          state.fetchProfileAndAuthenticate();
        }
      },
    }
  )
);
