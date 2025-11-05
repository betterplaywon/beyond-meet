/**
 * 인증 관련 React Query hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials, RegisterData } from '../@types';
import Toast from 'react-native-toast-message';

/**
 * 로그인 mutation
 */
export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Toast.show({
        type: 'success',
        text1: '로그인 성공',
        text2: `${data.user.nickname}님, 환영합니다!`,
      });
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
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Toast.show({
        type: 'success',
        text1: '회원가입 완료',
        text2: '환영합니다!',
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
 * 로그아웃 mutation
 */
export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
      Toast.show({
        type: 'success',
        text1: '로그아웃',
        text2: '안전하게 로그아웃되었습니다',
      });
    },
  });
};
