/**
 * 푸시 알림 관련 React Query Hooks
 */

import { useMutation } from '@tanstack/react-query';
import * as pushApi from '../services/pushApi';

/**
 * 디바이스 토큰 등록 Hook
 */
export const useRegisterDevice = () => {
  return useMutation({
    mutationFn: (params: {
      userId: string;
      deviceToken: string;
      platform: 'IOS' | 'ANDROID';
    }) => pushApi.registerDevice(params),
    onError: (error) => {
      console.error('Failed to register device:', error);
    },
  });
};

/**
 * 디바이스 토큰 제거 Hook
 */
export const useUnregisterDevice = () => {
  return useMutation({
    mutationFn: (params: { deviceToken: string }) =>
      pushApi.unregisterDevice(params),
    onError: (error) => {
      console.error('Failed to unregister device:', error);
    },
  });
};
