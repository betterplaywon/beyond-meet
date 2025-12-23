/**
 * 인증 관련 React Query hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials, RegisterData } from '../@types';
import Toast from 'react-native-toast-message';
import { queryKeys } from '../constants/queryKeys';

/**
 * 로그인 mutation
 */
export const useLogin = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: data => {
      // authStore에 토큰, userId, role, emailVerified 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });

      if (data.user.emailVerified) {
        Toast.show({
          type: 'success',
          text1: '로그인 성공',
          text2: `${data.user.nickname}님, 환영합니다!`,
        });
      }
      // 이메일 미인증 시 토스트는 표시하지 않음 (인증 화면으로 이동)
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: '로그인 실패',
        text2: error.response?.data?.error?.message || '다시 시도해주세요',
      });
    },
  });
};

/**
 * 회원가입 mutation
 */
export const useRegister = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: data => {
      // authStore에 토큰, userId, role, emailVerified 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
      Toast.show({
        type: 'success',
        text1: '회원가입 완료',
        text2: `${data.user.nickname}님, 환영합니다!`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: '회원가입 실패',
        text2: error.response?.data?.error?.message || '다시 시도해주세요',
      });
    },
  });
};

/**
 * 로그아웃 함수 반환 hook
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  const performLogout = () => {
    // 서버에 로그아웃 알림 (fire-and-forget)
    authApi.logout().catch(() => {});

    // 쿼리 캐시 정리 및 인증 상태 초기화
    queryClient.clear();
    useAuthStore.getState().logout();

    Toast.show({
      type: 'success',
      text1: '로그아웃',
      text2: '안전하게 로그아웃되었습니다',
    });
  };

  return { mutate: performLogout };
};
