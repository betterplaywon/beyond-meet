/**
 * 통화 기록 관련 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as callApi from '../services/callApi';
import { queryKeys } from '../constants/queryKeys';

export const callKeys = queryKeys.call;

/**
 * 통화 기록 조회 Hook
 */
export const useCallHistory = (params: {
  userId: string | undefined;
  page?: number;
  limit?: number;
}) => {
  const { userId, page = 1, limit = 50 } = params;

  return useQuery({
    queryKey: callKeys.history(userId || '', page),
    queryFn: () =>
      callApi.getCallHistory({
        userId: userId!,
        page,
        limit,
      }),
    enabled: !!userId,
  });
};

/**
 * 통화 시작 Mutation Hook
 */
export const useStartCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      sessionId: string;
      callerId: string;
      receiverId: string;
    }) => callApi.startCall(params),
    onSuccess: (_, variables) => {
      // 통화 기록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: callKeys.history(variables.callerId),
      });
    },
  });
};

/**
 * 통화 종료 Mutation Hook
 */
export const useEndCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      callId,
      endTime,
      duration,
    }: {
      callId: string;
      endTime: string;
      duration: number;
    }) =>
      callApi.endCall(callId, {
        endTime,
        duration,
      }),
    onSuccess: data => {
      // 통화 기록 쿼리 업데이트
      const callerId = data.call.callerId;
      const receiverId = data.call.receiverId;

      // 양쪽 사용자의 통화 기록 무효화 (모든 페이지)
      queryClient.invalidateQueries({
        queryKey: callKeys.history(callerId),
      });
      queryClient.invalidateQueries({
        queryKey: callKeys.history(receiverId),
      });
    },
  });
};

/**
 * 통화 이벤트 기록 Mutation Hook
 */
export const useRecordCallEvent = () => {
  return useMutation({
    mutationFn: ({
      callId,
      eventType,
      timestamp,
      data,
    }: {
      callId: string;
      eventType: string;
      timestamp: string;
      data?: Record<string, any>;
    }) =>
      callApi.recordCallEvent(callId, {
        eventType,
        timestamp,
        data,
      }),
  });
};
