/**
 * 푸시 알림 관련 API
 */

import api from './api';
import { ApiResponse } from '../@types';

/**
 * 디바이스 토큰 등록
 * POST /api/push/register-device
 */
export const registerDevice = async (params: {
  userId: string;
  deviceToken: string;
  platform: 'IOS' | 'ANDROID';
}): Promise<void> => {
  await api.post<ApiResponse<void>>('/push/register-device', params);
};

/**
 * 디바이스 토큰 제거
 * DELETE /api/push/unregister-device
 */
export const unregisterDevice = async (params: {
  deviceToken: string;
}): Promise<void> => {
  await api.delete<ApiResponse<void>>('/push/unregister-device', {
    data: params,
  });
};
