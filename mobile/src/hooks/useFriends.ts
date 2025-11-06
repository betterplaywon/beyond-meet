/**
 * 친구 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendsApi from '../services/friendsApi';
import { Friendship } from '../@types';

/**
 * Query Keys
 */
export const friendsKeys = {
  all: ['friends'] as const,
  list: (userId: string) => [...friendsKeys.all, 'list', userId] as const,
};

/**
 * 친구 목록 조회 Hook
 */
export const useFriends = (userId: string | undefined) => {
  return useQuery({
    queryKey: friendsKeys.list(userId || ''),
    queryFn: () => friendsApi.getFriends(userId!),
    enabled: !!userId, // userId가 있을 때만 실행
    select: (data) => data.friends, // friends 배열만 반환
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
    onMutate: async ({ userId, friendId }) => {
      // 낙관적 업데이트 (Optimistic Update)
      await queryClient.cancelQueries({
        queryKey: friendsKeys.list(userId),
      });

      const previousFriends = queryClient.getQueryData<{
        friends: Friendship[];
        total: number;
      }>(friendsKeys.list(userId));

      // 친구 목록에서 삭제된 친구 제거
      if (previousFriends) {
        queryClient.setQueryData(friendsKeys.list(userId), {
          ...previousFriends,
          friends: previousFriends.friends.filter((f) => f.friendId !== friendId),
          total: previousFriends.total - 1,
        });
      }

      return { previousFriends };
    },
    onError: (err, variables, context) => {
      // 에러 발생 시 이전 상태로 롤백
      if (context?.previousFriends) {
        queryClient.setQueryData(
          friendsKeys.list(variables.userId),
          context.previousFriends
        );
      }
    },
    onSettled: (_, __, variables) => {
      // 성공/실패 여부와 관계없이 쿼리 무효화
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
  return useMutation({
    mutationFn: ({ userId, blockedUserId }: { userId: string; blockedUserId: string }) =>
      friendsApi.blockUser(userId, blockedUserId),
  });
};

/**
 * 차단 해제 Mutation Hook
 */
export const useUnblockUser = () => {
  return useMutation({
    mutationFn: ({ userId, blockedId }: { userId: string; blockedId: string }) =>
      friendsApi.unblockUser(userId, blockedId),
  });
};
