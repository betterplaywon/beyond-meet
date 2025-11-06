/**
 * 친구 관련 API
 */

import api from './api';
import { ApiResponse, Friendship, User } from '../@types';

/**
 * 친구 목록 조회
 * GET /api/users/:id/friends
 */
export const getFriends = async (userId: string): Promise<{
  friends: Array<Friendship & { friend: User }>;
  total: number;
}> => {
  const response = await api.get<ApiResponse<{
    friends: Array<Friendship & { friend: User }>;
    total: number;
  }>>(`/users/${userId}/friends`);

  return response.data.data!;
};

/**
 * 친구 추가
 * POST /api/users/:id/friends
 */
export const addFriend = async (
  userId: string,
  friendId: string
): Promise<{ friendship: Friendship }> => {
  const response = await api.post<ApiResponse<{
    friendship: Friendship;
  }>>(`/users/${userId}/friends`, {
    friendId,
  });

  return response.data.data!;
};

/**
 * 친구 삭제
 * DELETE /api/users/:id/friends/:friendId
 */
export const removeFriend = async (
  userId: string,
  friendId: string
): Promise<void> => {
  await api.delete(`/users/${userId}/friends/${friendId}`);
};

/**
 * 사용자 차단
 * POST /api/users/:id/block
 */
export const blockUser = async (
  userId: string,
  blockedUserId: string
): Promise<void> => {
  await api.post(`/users/${userId}/block`, {
    blockedUserId,
  });
};

/**
 * 차단 해제
 * DELETE /api/users/:id/block/:blockedId
 */
export const unblockUser = async (
  userId: string,
  blockedId: string
): Promise<void> => {
  await api.delete(`/users/${userId}/block/${blockedId}`);
};
