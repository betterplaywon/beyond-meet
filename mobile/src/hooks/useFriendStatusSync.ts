/**
 * 친구 온라인 상태 실시간 동기화 Hook
 * Socket.io 이벤트를 수신하여 React Query 캐시를 업데이트
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as socketService from '../services/socketService';
import { queryKeys } from '../constants/queryKeys';
import { User } from '../@types';

interface FriendStatusEvent {
  friendId: string;
  status: 'ONLINE' | 'OFFLINE' | 'IN_CALL';
  lastActive: string;
}

export const useFriendStatusSync = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  const userIdRef = useRef(userId);

  // refs 업데이트
  useEffect(() => {
    userIdRef.current = userId;
    queryClientRef.current = queryClient;
  });

  useEffect(() => {
    if (!userId) return;

    const handleStatusChange = (data: FriendStatusEvent) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;

      // React Query 캐시에서 친구 목록 직접 업데이트
      // 캐시에는 { friends: User[], total: number } 형태로 저장됨
      queryClientRef.current.setQueryData<{ friends: User[]; total: number }>(
        queryKeys.friends.list(currentUserId),
        oldData => {
          if (!oldData || !oldData.friends) return oldData;

          return {
            ...oldData,
            friends: oldData.friends.map(friend =>
              friend.id === data.friendId
                ? {
                    ...friend,
                    onlineStatus: data.status,
                    lastActive: data.lastActive,
                  }
                : friend,
            ),
          };
        },
      );
    };

    // Socket 이벤트 리스너 등록
    socketService.on('friend:status-changed', handleStatusChange);

    // Cleanup
    return () => {
      socketService.off('friend:status-changed', handleStatusChange);
    };
  }, [userId]);
};
