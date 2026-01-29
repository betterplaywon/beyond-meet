/**
 * Axios API 클라이언트
 * 모든 HTTP 요청의 기본 설정 및 인터셉터 관리
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';
import { ApiResponse } from '../@types';
import { refreshAccessToken } from './tokenRefresh';
import * as socketService from './socketService';

/**
 * Axios 인스턴스 생성
 */
const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request 인터셉터
 * 모든 요청에 JWT 토큰 자동 추가
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response 인터셉터
 * 에러 처리 및 토큰 갱신 로직
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 Unauthorized - 토큰 만료
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        if (!accessToken) {
          throw new Error('Token refresh failed');
        }

        // Socket 재연결 (새 토큰으로 인증)
        console.log('[API] Token refreshed, reconnecting socket with new token...');
        socketService.reconnectWithNewToken();

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 - 에러만 전파
        // React Query의 전역 에러 핸들러에서 401 처리
        return Promise.reject(refreshError);
      }
    }

    // 기타 에러
    return Promise.reject(error);
  }
);

/**
 * API 에러 파싱 헬퍼 함수
 */
export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse>;

    if (apiError.response?.data?.error) {
      return apiError.response.data.error.message;
    }

    if (apiError.message) {
      return apiError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
};

export default api;
