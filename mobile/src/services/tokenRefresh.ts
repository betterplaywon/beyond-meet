/**
 * 토큰 갱신 유틸리티
 * HTTP API 401 응답 시 토큰 갱신에 사용
 */

import axios from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';
import { ApiResponse } from '../@types';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'USER' | 'ADMIN' };
}

/**
 * refreshToken을 사용하여 새 accessToken 발급
 * @returns 새 accessToken 또는 실패 시 null
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    console.log('[TOKEN] No refresh token available');
    return null;
  }

  try {
    console.log('[TOKEN] Attempting to refresh access token...');
    const response = await axios.post<ApiResponse<RefreshResponse>>(
      `${ENV.API_BASE_URL}/auth/refresh`,
      { refreshToken }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data!;
    useAuthStore.getState().setTokens(accessToken, newRefreshToken);
    console.log('[TOKEN] Access token refreshed successfully');

    return accessToken;
  } catch (error) {
    console.error('[TOKEN] Failed to refresh access token:', error);
    return null;
  }
};
