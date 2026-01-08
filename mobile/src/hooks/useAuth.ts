/**
 * 인증 관련 React Query hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials, RegisterData } from '../@types';
import Toast from 'react-native-toast-message';
import { queryKeys } from '../constants/queryKeys';
import * as socketService from '../services/socketService';

// 전역 플래그 (로그아웃 중복 방지)
let isPerformingLogout = false;

/**
 * 로그인 mutation
 * Auth 상태 설정 후 Socket 연결
 */
export const useLogin = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: data => {
      // 1. authStore에 토큰, userId, role, emailVerified 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );

      // 2. Socket 연결 (명령형 - 여기서 직접 처리!)
      console.log('[LOGIN] Connecting socket...');
      socketService.connect();

      // 3. 프로필 쿼리 무효화
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
 * Auth 상태 설정 후 Socket 연결
 */
export const useRegister = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: data => {
      // 1. authStore에 토큰, userId, role, emailVerified 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );

      // 2. Socket 연결 (명령형 - 여기서 직접 처리!)
      console.log('[REGISTER] Connecting socket...');
      socketService.connect();

      // 3. 프로필 쿼리 무효화
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
 * 로그아웃 mutation hook
 * Socket 정리, Query 캐시 정리, Auth 상태 초기화를 순차적으로 수행
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 중복 호출 방지
      if (isPerformingLogout) {
        console.warn('[LOGOUT] Already in progress, ignoring duplicate call');
        throw new Error('LOGOUT_IN_PROGRESS');
      }

      isPerformingLogout = true;

      try {
        // 1. 서버에 로그아웃 알림 (fire-and-forget)
        authApi.logout().catch(() => {});

        // 2. Socket 연결 해제 (여기서 직접 처리!)
        console.log('[LOGOUT] Disconnecting socket...');
        socketService.disconnect();

        // 3. React Query 캐시 정리
        console.log('[LOGOUT] Clearing query cache...');
        queryClient.clear();

        // 4. Auth 상태 초기화 (마지막에!)
        console.log('[LOGOUT] Clearing auth state...');
        useAuthStore.getState().logout();

      } finally {
        // 플래그 리셋 (다음 틱에서)
        setTimeout(() => {
          isPerformingLogout = false;
        }, 100);
      }
    },
    onSuccess: () => {
      console.log('[LOGOUT] Logout completed successfully');
      Toast.show({
        type: 'success',
        text1: '로그아웃',
        text2: '안전하게 로그아웃되었습니다',
      });
    },
    onError: (error: any) => {
      // LOGOUT_IN_PROGRESS 에러는 무시
      if (error?.message !== 'LOGOUT_IN_PROGRESS') {
        console.error('[LOGOUT] Failed:', error);
        Toast.show({
          type: 'error',
          text1: '로그아웃 실패',
          text2: '다시 시도해주세요',
        });
      }
    },
  });
};
