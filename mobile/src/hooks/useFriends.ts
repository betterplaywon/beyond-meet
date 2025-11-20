/**
 * 친구 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendsApi from '../services/friendsApi';
import { queryKeys } from '../constants/queryKeys';

export const friendsKeys = queryKeys.friends;

/**
 * 친구 목록 조회 Hook
 */
export const useFriends = (userId: string | undefined) => {
  return useQuery({
    queryKey: friendsKeys.list(userId || ''),
    queryFn: () => friendsApi.getFriends(userId!),
    enabled: !!userId, // userId가 있을 때만 실행
    select: data => data.friends, // friends 배열만 반환
  });
};

/**
 * 친구 추가 Mutation Hook
 */
export const useAddFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: string; friendId: string }) =>
      friendsApi.addFriend(userId, friendId),
    onSuccess: (_, variables) => {
      // 친구 목록 쿼리 무효화하여 재조회
      queryClient.invalidateQueries({
        queryKey: friendsKeys.list(variables.userId),
      });
    },
  });
};

/**
 * 친구 삭제 Mutation Hook
 */
export const useRemoveFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: string; friendId: string }) =>
      friendsApi.removeFriend(userId, friendId),
    onSuccess: (_, variables) => {
      // 서버에서 최신 친구 목록을 다시 가져옴 (단순하고 일관성 있는 패턴)
      queryClient.invalidateQueries({
        queryKey: friendsKeys.list(variables.userId),
      });
    },
  });
};

/**
 * 사용자 차단 Mutation Hook
 */
export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      blockedUserId,
    }: {
      userId: string;
      blockedUserId: string;
    }) => friendsApi.blockUser(userId, blockedUserId),
    onSuccess: (_, variables) => {
      // 친구 목록 무효화 (차단된 사용자가 친구 목록에서 제거되도록)
      queryClient.invalidateQueries({
        queryKey: friendsKeys.list(variables.userId),
      });
    },
  });
};

/**
 * 차단 해제 Mutation Hook
 */
export const useUnblockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      blockedId,
    }: {
      userId: string;
      blockedId: string;
    }) => friendsApi.unblockUser(userId, blockedId),
    onSuccess: (_, variables) => {
      // 친구 목록 무효화 (차단 해제된 사용자가 다시 친구 목록에 나타날 수 있도록)
      queryClient.invalidateQueries({
        queryKey: friendsKeys.list(variables.userId),
      });
    },
  });
};
