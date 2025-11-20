/**
 * 사용자 프로필 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userApi from '../services/userApi';
import { queryKeys } from '../constants/queryKeys';

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
    mutationFn: ({
      userId,
      photo,
    }: {
      userId: string;
      photo: { uri: string; type: string; name: string };
    }) => userApi.uploadProfilePhoto(userId, photo),
    onSuccess: (_, variables) => {
      // 서버에서 최신 프로필 데이터를 다시 가져옴
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(variables.userId),
      });
    },
  });
};

/**
 * 프로필 사진 삭제 Mutation Hook
 */
export const useDeleteProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, photoId }: { userId: string; photoId: string }) =>
      userApi.deleteProfilePhoto(userId, photoId),
    onSuccess: (_, variables) => {
      // 프로필 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      queryClient.invalidateQueries({
        queryKey: profileKeys.detail(variables.userId),
      });
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
