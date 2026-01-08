/**
 * 인증 관련 Zustand Store
 *
 * 책임: 클라이언트 인증 상태 관리 (토큰, 인증 여부)
 * - accessToken, refreshToken 저장 (AsyncStorage)
 * - 로그인/로그아웃 상태 관리
 *
 * 사용자 프로필 데이터는 react-query의 useMyProfile() 사용
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  // State
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userRole: 'USER' | 'ADMIN' | null;
  emailVerified: boolean;
  userEmail: string | null;
  _hasHydrated: boolean;

  // Actions
  setAuth: (accessToken: string, refreshToken: string, userId: string, userRole: 'USER' | 'ADMIN', emailVerified: boolean, email: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setEmailVerified: (verified: boolean) => void;
  logout: () => void;
  isAdmin: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      userRole: null,
      emailVerified: false,
      userEmail: null,
      _hasHydrated: false,

      // Actions
      setAuth: (accessToken, refreshToken, userId, userRole, emailVerified, email) =>
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          userId,
          userRole,
          emailVerified,
          userEmail: email,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      setEmailVerified: (verified) =>
        set({
          emailVerified: verified,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          userId: null,
          userRole: null,
          emailVerified: false,
          userEmail: null,
        }),

      isAdmin: () => get().userRole === 'ADMIN',

      setHasHydrated: (state) =>
        set({
          _hasHydrated: state,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[AuthStore] Rehydration completed');
        state?.setHasHydrated(true);
      },
    }
  )
);
