/**
 * 매칭 관련 React Query hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { matchApi } from '../api/match.api';
import Toast from 'react-native-toast-message';

/**
 * 랜덤 매칭 요청
 */
export const useRandomMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => matchApi.requestRandomMatch(),
    onSuccess: (data) => {
      if (data.matched) {
        Toast.show({
          type: 'success',
          text1: '매칭 성공!',
          text2: `${data.partner?.nickname}님과 연결되었습니다`,
        });
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: '매칭 실패',
        text2: error.response?.data?.error?.message || '다시 시도해주세요',
      });
    },
  });
};

/**
 * 선택 매칭 요청
 */
export const useDirectMatch = () => {
  return useMutation({
    mutationFn: (receiverId: string) => matchApi.requestDirectMatch(receiverId),
    onSuccess: (data) => {
      Toast.show({
        type: 'success',
        text1: '통화 요청 전송',
        text2: '상대방의 응답을 기다리는 중...',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: '통화 요청 실패',
        text2: error.response?.data?.error?.message || '다시 시도해주세요',
      });
    },
  });
};

/**
 * 매칭 취소
 */
export const useCancelMatch = () => {
  return useMutation({
    mutationFn: () => matchApi.cancelMatch(),
    onSuccess: () => {
      Toast.show({
        type: 'info',
        text1: '매칭 취소',
        text2: '매칭이 취소되었습니다',
      });
    },
  });
};

/**
 * 매칭 수락
 */
export const useAcceptMatch = () => {
  return useMutation({
    mutationFn: (sessionId: string) => matchApi.acceptMatch(sessionId),
  });
};

/**
 * 매칭 거절
 */
export const useRejectMatch = () => {
  return useMutation({
    mutationFn: (sessionId: string) => matchApi.rejectMatch(sessionId),
    onSuccess: () => {
      Toast.show({
        type: 'info',
        text1: '통화 거절',
        text2: '통화 요청을 거절했습니다',
      });
    },
  });
};
