/**
 * Agora 관련 API
 */

import { apiClient } from './client';
import { ApiResponse } from '../@types';

export const agoraApi = {
  /**
   * Agora RTC Token 발급
   */
  getToken: async (channelName: string, uid?: number): Promise<{
    token: string;
    channelName: string;
    uid: number;
  }> => {
    const response = await apiClient.post<
      ApiResponse<{
        token: string;
        channelName: string;
        uid: number;
      }>
    >('/agora/token', {
      channelName,
      uid,
    });
    return response.data.data!;
  },
};
