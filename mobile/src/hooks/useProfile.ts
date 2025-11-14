/**
 * 사용자 프로필 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as userApi from '../services/userApi';
import { User } from '../@types';

/**
 * Query Keys
 */
export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  detail: (userId: string) => [...profileKeys.all, 'detail', userId] as const,
};

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
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      userApi.updateProfile(userId, data),
    onSuccess: (updatedUser) => {
      // 내 프로필 쿼리 업데이트
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      // 상세 프로필 쿼리 업데이트
      queryClient.setQueryData(profileKeys.detail(updatedUser.id), updatedUser);
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
    onSuccess: (result, variables) => {
      // 프로필 쿼리의 사진 업데이트
      queryClient.setQueryData<User>(profileKeys.me(), (old) => {
        if (!old) return old;
        return {
          ...old,
          profilePhotos: result.profilePhotos,
        };
      });

      queryClient.setQueryData<User>(
        profileKeys.detail(variables.userId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            profilePhotos: result.profilePhotos,
          };
        }
      );
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
    onSuccess: (updatedUser) => {
      // 내 프로필 쿼리 업데이트
      queryClient.setQueryData(profileKeys.me(), updatedUser);
      queryClient.setQueryData(profileKeys.detail(updatedUser.id), updatedUser);
    },
  });
};
