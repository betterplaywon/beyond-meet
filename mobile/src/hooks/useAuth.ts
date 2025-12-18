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
      // authStore에 토큰, userId, role 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
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
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: data => {
      // authStore에 토큰, userId, role 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
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
 * 로그아웃 함수 반환 hook
 * mutation 대신 직접 함수를 사용하여 컴포넌트 언마운트 이슈 방지
 * InteractionManager를 사용하여 iOS 렌더링 사이클 충돌 방지
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  const performLogout = () => {
    // 서버에 로그아웃 알림 (fire-and-forget)
    authApi.logout().catch(() => {});

    // 현재 인터랙션/애니메이션 완료 후 상태 변경
    // iOS에서 동기적 상태 변경 시 렌더링 사이클 충돌 방지
    requestAnimationFrame(() => {
      queryClient.clear();
      useAuthStore.getState().logout();

      Toast.show({
        type: 'success',
        text1: '로그아웃',
        text2: '안전하게 로그아웃되었습니다',
      });
    });
  };

  return { mutate: performLogout };
};
