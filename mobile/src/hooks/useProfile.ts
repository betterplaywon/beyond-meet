/**
 * 사용자 프로필 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userApi from '../services/userApi';
import { authApi } from '../api/auth.api';
import { queryKeys } from '../constants/queryKeys';
import { useAuthStore } from '../store/authStore';
import * as socketService from '../services/socketService';

/**
 * 프로필 업데이트 데이터 타입
 */
type UserUpdateData = Partial<{
  nickname: string;
  bio: string;
  interests: string[];
  minAge: number;
  maxAge: number;
  preferredGender: 'MALE' | 'FEMALE' | 'ANYONE';
  preferredCountries: string[];
}>;

export const profileKeys = queryKeys.profile;

/**
 * 내 프로필 조회 Hook
 */
export const useMyProfile = () => {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => userApi.getMyProfile(),
  });
};

/**
 * 사용자 프로필 조회 Hook
 */
export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: profileKeys.detail(userId || ''),
    queryFn: () => userApi.getUserProfile(userId!),
    enabled: !!userId,
  });
};

/**
 * 프로필 수정 Mutation Hook
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdateData }) =>
      userApi.updateProfile(userId, data),
    onSuccess: (_, variables) => {
      // 서버에서 최신 데이터를 다시 가져옴 (Server is source of truth)
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(variables.userId),
      });
    },
  });
};

/**
 * 프로필 사진 업로드 Mutation Hook
 */
export const useUploadProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photo: { uri: string; type: string; name: string }) =>
      userApi.uploadProfilePhoto(photo),
    onSuccess: () => {
      // 서버에서 최신 프로필 데이터를 다시 가져옴
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
};

/**
 * 프로필 사진 삭제 Mutation Hook
 */
export const useDeleteProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoUrl: string) => userApi.deleteProfilePhoto(photoUrl),
    onSuccess: () => {
      // 프로필 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
};

/**
 * 설정 업데이트 Mutation Hook
 */
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      settings,
    }: {
      userId: string;
      settings: {
        minAge?: number;
        maxAge?: number;
        preferredGender?: 'MALE' | 'FEMALE' | 'ANYONE';
        preferredCountries?: string[];
        pushEnabled?: boolean;
      };
    }) => userApi.updateSettings(userId, settings),
    onSuccess: (_, variables) => {
      // 서버에서 최신 데이터를 다시 가져옴
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(variables.userId),
      });
    },
  });
};

/**
 * 회원 탈퇴 Mutation Hook
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const logout = useAuthStore(state => state.logout);

  return useMutation({
    mutationFn: (password: string) => authApi.deleteAccount(password),
    onSuccess: () => {
      // 소켓 연결 해제
      socketService.disconnect();

      // 모든 쿼리 캐시 초기화
      queryClient.clear();

      // 로그아웃 처리 (AsyncStorage 정리, 인증 상태 초기화)
      logout();
    },
  });
};
