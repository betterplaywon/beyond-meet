/**
 * 친구 관련 API
 */

import api from './api';
import { ApiResponse, Friendship, User } from '../@types';

/**
 * 친구 목록 조회
 * GET /api/friends
 * 백엔드는 User 객체 배열을 반환함 (단방향 친구 관계)
 */
export const getFriends = async (): Promise<{
  friends: User[];
  total: number;
}> => {
  const response = await api.get<ApiResponse<{
    friends: User[];
    total: number;
  }>>('/friends');

  return response.data.data!;
};

/**
 * 친구 추가
 * POST /api/friends/:friendId
 */
export const addFriend = async (
  friendId: string
): Promise<{ friendship: Friendship }> => {
  const response = await api.post<ApiResponse<{
    friendship: Friendship;
  }>>(`/friends/${friendId}`);

  return response.data.data!;
};

/**
 * 친구 삭제
 * DELETE /api/friends/:friendId
 */
export const removeFriend = async (
  friendId: string
): Promise<void> => {
  await api.delete(`/friends/${friendId}`);
};

/**
 * 사용자 차단
 * POST /api/friends/block/:blockedUserId
 */
export const blockUser = async (
  blockedUserId: string
): Promise<void> => {
  await api.post(`/friends/block/${blockedUserId}`);
};

/**
 * 차단 해제
 * DELETE /api/friends/block/:blockedUserId
 */
export const unblockUser = async (
  blockedUserId: string
): Promise<void> => {
  await api.delete(`/friends/block/${blockedUserId}`);
};
