/**
 * 사용자 관련 API
 */

import api from './api';
import { ApiResponse, User } from '../@types';

/**
 * 내 프로필 조회
 * GET /api/users/me
 */
export const getMyProfile = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>('/users/me');
  return response.data.data!;
};

/**
 * 사용자 프로필 조회
 * GET /api/users/:id
 */
export const getUserProfile = async (userId: string): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(`/users/${userId}`);
  return response.data.data!;
};

/**
 * 프로필 수정
 * PUT /api/users/:id
 */
export const updateProfile = async (
  userId: string,
  data: Partial<{
    nickname: string;
    bio: string;
    interests: string[];
    minAge: number;
    maxAge: number;
    preferredGender: 'MALE' | 'FEMALE' | 'OTHER';
    preferredCountries: string[];
  }>
): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(
    `/users/${userId}`,
    data
  );
  return response.data.data!;
};

/**
 * 프로필 사진 업로드
 * POST /api/users/:id/photos
 */
export const uploadProfilePhoto = async (
  userId: string,
  photo: {
    uri: string;
    type: string;
    name: string;
  }
): Promise<{
  photoUrl: string;
  profilePhotos: string[];
}> => {
  const formData = new FormData();
  formData.append('photo', {
    uri: photo.uri,
    type: photo.type,
    name: photo.name,
  } as any);

  const response = await api.post<ApiResponse<{
    photoUrl: string;
    profilePhotos: string[];
  }>>(`/users/${userId}/photos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data!;
};

/**
 * 프로필 사진 삭제
 * DELETE /api/users/:id/photos/:photoId
 */
export const deleteProfilePhoto = async (
  userId: string,
  photoId: string
): Promise<void> => {
  await api.delete(`/users/${userId}/photos/${photoId}`);
};

/**
 * 사용자 설정 업데이트
 * (API 명세서에는 별도 엔드포인트가 없으므로 프로필 수정 API 활용)
 */
export const updateSettings = async (
  userId: string,
  settings: {
    minAge?: number;
    maxAge?: number;
    preferredGender?: 'MALE' | 'FEMALE' | 'OTHER';
    preferredCountries?: string[];
  }
): Promise<User> => {
  return updateProfile(userId, settings);
};
